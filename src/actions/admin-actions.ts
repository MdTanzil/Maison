'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/auth/session';
import { couponSchema, staffSchema } from '@/lib/validations/schemas';
import { slugify } from '@/lib/utils';
import { logStaffActivity } from '@/lib/services/audit';
import { encryptSecret } from '@/lib/services/credentials';
import { CourierProvider, OrderStatus } from '@prisma/client';
import { applyOrderStockTransition } from './order-actions';

export async function upsertStaffMemberAction(rawInput: Record<string, unknown>) {
  await ensureDatabaseReady();
  const admin = await requirePermission('staff.manage');

  const parsed = staffSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Validation error' };
  }

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase().trim();

  if (data.id) {
    await prisma.user.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        ...(data.password && data.password.length >= 6
          ? { passwordHash: await bcrypt.hash(data.password, 10) }
          : {}),
      },
    });

    await prisma.userRole.deleteMany({ where: { userId: data.id } });
    await prisma.userRole.create({
      data: {
        userId: data.id,
        roleId: data.roleId,
        customPermissions: data.customPermissions,
      },
    });

    await prisma.staffProfile.upsert({
      where: { userId: data.id },
      update: {
        employeeCode: data.employeeCode.trim(),
        department: data.department || 'Operations',
        designation: data.designation || 'Staff Associate',
        assignedZone: data.assignedZone || null,
      },
      create: {
        userId: data.id,
        employeeCode: data.employeeCode.trim(),
        department: data.department || 'Operations',
        designation: data.designation || 'Staff Associate',
        assignedZone: data.assignedZone || null,
      },
    });

    await logStaffActivity({
      user: admin,
      action: 'STAFF_UPDATED',
      module: 'Administration',
      targetId: data.employeeCode,
      description: `Updated staff account for ${data.name} (${data.employeeCode})`,
    });
  } else {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { phone: data.phone.trim() }] },
    });
    if (existing) {
      return { ok: false, error: 'Email or phone number is already in use.' };
    }

    const passwordHash = await bcrypt.hash(data.password || 'Staff@123', 10);
    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        passwordHash,
        emailVerifiedAt: new Date(),
        userRoles: {
          create: {
            roleId: data.roleId,
            customPermissions: data.customPermissions,
          },
        },
        staffProfile: {
          create: {
            employeeCode: data.employeeCode.trim(),
            department: data.department || 'Operations',
            designation: data.designation || 'Staff Associate',
            assignedZone: data.assignedZone || null,
          },
        },
      },
    });

    await logStaffActivity({
      user: admin,
      action: 'STAFF_CREATED',
      module: 'Administration',
      targetId: created.id,
      description: `Created staff account for ${data.name} (${data.employeeCode})`,
    });
  }

  revalidatePath('/admin/staff');
  return { ok: true };
}

export async function toggleStaffActiveAction(userId: string) {
  await ensureDatabaseReady();
  const admin = await requirePermission('staff.manage');

  if (userId === admin.id) {
    return { ok: false, error: 'You cannot deactivate your own active session account.' };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: 'Staff member not found' };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  await logStaffActivity({
    user: admin,
    action: updated.isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
    module: 'Administration',
    targetId: target.email,
    description: `${updated.isActive ? 'Activated' : 'Deactivated'} staff account ${target.name}`,
  });

  revalidatePath('/admin/staff');
  return { ok: true, isActive: updated.isActive };
}

export async function resetStaffPasswordAction(userId: string, newPassword: string) {
  await ensureDatabaseReady();
  const admin = await requirePermission('staff.manage');

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const target = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await logStaffActivity({
    user: admin,
    action: 'STAFF_PASSWORD_RESET',
    module: 'Administration',
    targetId: target.email,
    description: `Reset password for staff member ${target.name}`,
  });

  revalidatePath('/admin/staff');
  return { ok: true };
}

export async function upsertRolePermissionsAction(params: {
  roleId?: string;
  name: string;
  description?: string;
  permissionCodes: string[];
}) {
  await ensureDatabaseReady();
  const admin = await requirePermission('roles.manage');

  const slug = slugify(params.name).toUpperCase().replace(/-/g, '_');

  let role;
  if (params.roleId) {
    role = await prisma.role.update({
      where: { id: params.roleId },
      data: {
        name: params.name.trim(),
        description: params.description || null,
      },
    });
  } else {
    role = await prisma.role.create({
      data: {
        name: params.name.trim(),
        slug: `${slug}_${Math.floor(10 + Math.random() * 89)}`,
        description: params.description || null,
        isSystem: false,
      },
    });
  }

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  const permissions = await prisma.permission.findMany({
    where: { code: { in: params.permissionCodes } },
  });

  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: perm.id,
      },
    });
  }

  await logStaffActivity({
    user: admin,
    action: params.roleId ? 'ROLE_UPDATED' : 'ROLE_CREATED',
    module: 'Administration',
    targetId: role.slug,
    description: `Configured role "${role.name}" with ${permissions.length} permissions`,
  });

  revalidatePath('/admin/staff');
  return { ok: true };
}

export async function toggleCustomerBlockAction(customerId: string) {
  await ensureDatabaseReady();
  const admin = await requirePermission('customers.manage');

  const customer = await prisma.user.findUnique({ where: { id: customerId } });
  if (!customer) return { ok: false, error: 'Customer not found' };

  const updated = await prisma.user.update({
    where: { id: customerId },
    data: { isBlocked: !customer.isBlocked },
  });

  await logStaffActivity({
    user: admin,
    action: updated.isBlocked ? 'CUSTOMER_BLOCKED' : 'CUSTOMER_UNBLOCKED',
    module: 'Customers',
    targetId: customer.email,
    description: `${updated.isBlocked ? 'Blocked' : 'Unblocked'} customer ${customer.name}`,
  });

  revalidatePath('/admin/customers');
  return { ok: true, isBlocked: updated.isBlocked };
}

export async function updateCustomerNotesAction(customerId: string, internalNotes: string) {
  await ensureDatabaseReady();
  const admin = await requirePermission('customers.manage');

  await prisma.customerProfile.upsert({
    where: { userId: customerId },
    update: { internalNotes },
    create: { userId: customerId, internalNotes },
  });

  await logStaffActivity({
    user: admin,
    action: 'CUSTOMER_NOTE_UPDATED',
    module: 'Customers',
    targetId: customerId,
    description: `Updated CRM note for customer ID ${customerId}`,
  });

  revalidatePath('/admin/customers');
  return { ok: true };
}

export async function upsertCouponAction(rawInput: Record<string, unknown>) {
  await ensureDatabaseReady();
  const admin = await requirePermission('coupons.manage');

  const parsed = couponSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid coupon data' };
  }

  const data = parsed.data;
  const code = data.code.toUpperCase().trim();

  await prisma.coupon.upsert({
    where: { code },
    update: {
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount || null,
      expiryDate: new Date(data.expiryDate),
      usageLimit: data.usageLimit || null,
      perCustomerLimit: data.perCustomerLimit,
      isActive: data.isActive,
    },
    create: {
      code,
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount || null,
      expiryDate: new Date(data.expiryDate),
      usageLimit: data.usageLimit || null,
      perCustomerLimit: data.perCustomerLimit,
      isActive: data.isActive,
    },
  });

  await logStaffActivity({
    user: admin,
    action: 'COUPON_SAVED',
    module: 'Marketing',
    targetId: code,
    description: `Saved promotional coupon ${code} (${data.discountValue} ${data.discountType})`,
  });

  revalidatePath('/admin/coupons');
  return { ok: true };
}

export async function toggleCouponStatusAction(couponId: string) {
  await ensureDatabaseReady();
  const admin = await requirePermission('coupons.manage');

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return { ok: false, error: 'Coupon not found' };

  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive: !coupon.isActive },
  });

  await logStaffActivity({
    user: admin,
    action: 'COUPON_TOGGLED',
    module: 'Marketing',
    targetId: coupon.code,
    description: `Toggled coupon ${coupon.code} active status to ${!coupon.isActive}`,
  });

  revalidatePath('/admin/coupons');
  return { ok: true };
}

export async function deleteCouponAction(couponId: string) {
  await ensureDatabaseReady();
  const admin = await requirePermission('coupons.manage');

  const coupon = await prisma.coupon.delete({ where: { id: couponId } });
  await logStaffActivity({
    user: admin,
    action: 'COUPON_DELETED',
    module: 'Marketing',
    targetId: coupon.code,
    description: `Deleted coupon ${coupon.code}`,
  });

  revalidatePath('/admin/coupons');
  return { ok: true };
}

export async function dispatchCourierShipmentAction(params: {
  orderId: string;
  courierProvider: CourierProvider;
  trackingNumber?: string;
  deliveryStaffId?: string;
  deliveryNotes?: string;
}) {
  await ensureDatabaseReady();
  const admin = await requirePermission('shipping.manage');

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shipment: true },
  });
  if (!order) return { ok: false, error: 'Order not found' };

  // Dispatch respects the order status state machine: only READY_FOR_SHIPMENT
  // or PROCESSING orders can be dispatched (Super Admin may dispatch from any
  // non-terminal state to correct data); terminal states are never dispatchable.
  const terminalStatuses: OrderStatus[] = ['CANCELLED', 'REFUNDED', 'RETURNED', 'DELIVERED'];
  const dispatchableFrom: OrderStatus[] = ['READY_FOR_SHIPMENT', 'PROCESSING'];
  const canDispatch =
    !terminalStatuses.includes(order.status) &&
    (dispatchableFrom.includes(order.status) || admin.isSuperAdmin);
  if (!canDispatch) {
    return {
      ok: false,
      error: `Cannot dispatch order ${order.orderNumber} while it is ${order.status}.`,
    };
  }

  // Stock safety: deduct stock for orders that reached READY/PROCESSING
  // without deduction (e.g. legacy seed rows). Normally a no-op — stock was
  // already deducted at CONFIRMED. On insufficient stock, change nothing.
  try {
    await applyOrderStockTransition({
      orderId: order.id,
      targetStatus: 'SHIPPED',
      performedById: admin.id,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Stock validation failed.',
    };
  }

  const prefix =
    params.courierProvider === 'STEADFAST'
      ? 'SF-BD'
      : params.courierProvider === 'PATHAO'
      ? 'PTH'
      : params.courierProvider === 'REDX'
      ? 'RDX'
      : 'MB-TRK';

  const generatedTracking =
    params.trackingNumber?.trim() ||
    `${prefix}-${Math.floor(1000000 + Math.random() * 9000000)}`;

  if (order.shipment) {
    await prisma.shipment.update({
      where: { id: order.shipment.id },
      data: {
        courierProvider: params.courierProvider,
        trackingNumber: generatedTracking,
        consignmentId: `CNS-${Date.now().toString().slice(-6)}`,
        deliveryStaffId: params.deliveryStaffId || order.shipment.deliveryStaffId,
        deliveryNotes: params.deliveryNotes || order.shipment.deliveryNotes,
        status: 'IN_TRANSIT',
        dispatchedAt: new Date(),
      },
    });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'SHIPPED' },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: 'SHIPPED',
      previousStatus: order.status,
      note: `Dispatched via ${params.courierProvider} (Tracking: ${generatedTracking})`,
      changedById: admin.id,
      changedByName: admin.name,
    },
  });

  await logStaffActivity({
    user: admin,
    action: 'SHIPMENT_DISPATCHED',
    module: 'Shipping',
    targetId: order.orderNumber,
    description: `Dispatched ${order.orderNumber} via ${params.courierProvider} (${generatedTracking})`,
  });

  revalidatePath('/admin/shipping');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: true, trackingNumber: generatedTracking };
}

export async function updateWebsiteSettingsAction(data: {
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  secondaryPhone?: string;
  address: string;
  city: string;
  currencySymbol: string;
  taxRate: number;
  insideCityShipping: number;
  subAreaShipping: number;
  outsideCityShipping: number;
  freeShippingThreshold: number;
  allowGuestCheckout: boolean;
  autoDeductStockOnConfirm: boolean;
  announcementText: string;
  announcementActive: boolean;
  invoiceHeaderNote: string;
  invoiceFooterNote: string;
  invoiceTerms: string;
  termsAndConditions: string;
  privacyPolicy: string;
  seoTitle: string;
  seoDescription: string;
}) {
  await ensureDatabaseReady();
  const admin = await requirePermission('settings.manage');

  await prisma.websiteSettings.upsert({
    where: { id: 'default' },
    update: {
      storeName: data.storeName.trim(),
      tagline: data.tagline.trim(),
      contactEmail: data.contactEmail.trim(),
      contactPhone: data.contactPhone.trim(),
      secondaryPhone: data.secondaryPhone?.trim() || null,
      address: data.address.trim(),
      city: data.city.trim(),
      currencySymbol: data.currencySymbol.trim() || '৳',
      taxRate: Number(data.taxRate) || 0,
      insideCityShipping: Number(data.insideCityShipping) || 80,
      subAreaShipping: Number(data.subAreaShipping) || 110,
      outsideCityShipping: Number(data.outsideCityShipping) || 150,
      freeShippingThreshold: Number(data.freeShippingThreshold) || 10000,
      allowGuestCheckout: Boolean(data.allowGuestCheckout),
      autoDeductStockOnConfirm: Boolean(data.autoDeductStockOnConfirm),
      announcementText: data.announcementText.trim(),
      announcementActive: Boolean(data.announcementActive),
      invoiceHeaderNote: data.invoiceHeaderNote.trim(),
      invoiceFooterNote: data.invoiceFooterNote.trim(),
      invoiceTerms: data.invoiceTerms.trim(),
      termsAndConditions: data.termsAndConditions.trim(),
      privacyPolicy: data.privacyPolicy.trim(),
      seoTitle: data.seoTitle.trim(),
      seoDescription: data.seoDescription.trim(),
    },
    create: {
      id: 'default',
      storeName: data.storeName.trim(),
      tagline: data.tagline.trim(),
      contactEmail: data.contactEmail.trim(),
      contactPhone: data.contactPhone.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
    },
  });

  await logStaffActivity({
    user: admin,
    action: 'SETTINGS_UPDATED',
    module: 'Administration',
    targetId: 'default',
    description: `Updated global Website & Invoice Settings for ${data.storeName}`,
  });

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  return { ok: true };
}

export type IntegrationCredentialsInput = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string; // empty = keep existing
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  bkashAppKey: string;
  bkashAppSecret: string; // empty = keep existing
  bkashUsername: string;
  bkashPassword: string; // empty = keep existing
  bkashSandbox: boolean;
  nagadMerchantId: string;
  nagadMerchantPrivateKey: string; // empty = keep existing
  nagadPgPublicKey: string;
  rocketMerchantId: string;
  rocketApiUser: string;
  rocketApiPassword: string; // empty = keep existing
  rocketSandbox: boolean;
};

export async function updateIntegrationCredentialsAction(data: IntegrationCredentialsInput) {
  await ensureDatabaseReady();
  const admin = await requirePermission('settings.manage');

  const current = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
  const prevPayment = (current?.paymentSettingsJson ?? {}) as Record<string, any>;
  const prevCreds = (prevPayment.credentials ?? {}) as Record<string, any>;
  const prevEmail = (current?.emailSettingsJson ?? {}) as Record<string, any>;

  // A blank secret field keeps the stored value; a filled one replaces it (encrypted).
  const keepOrEncrypt = (next: string, prev?: string) => {
    if (next && next.trim()) return encryptSecret(next.trim());
    return prev ?? '';
  };

  const bkash = {
    appKey: data.bkashAppKey.trim(),
    appSecret: keepOrEncrypt(data.bkashAppSecret, prevCreds.bkash?.appSecret),
    username: data.bkashUsername.trim(),
    password: keepOrEncrypt(data.bkashPassword, prevCreds.bkash?.password),
    sandbox: Boolean(data.bkashSandbox),
  };
  const nagad = {
    merchantId: data.nagadMerchantId.trim(),
    merchantPrivateKey: keepOrEncrypt(data.nagadMerchantPrivateKey, prevCreds.nagad?.merchantPrivateKey),
    pgPublicKey: data.nagadPgPublicKey.trim(),
  };
  const rocket = {
    merchantId: data.rocketMerchantId.trim(),
    apiUser: data.rocketApiUser.trim(),
    apiPassword: keepOrEncrypt(data.rocketApiPassword, prevCreds.rocket?.apiPassword),
    sandbox: Boolean(data.rocketSandbox),
  };
  const email = {
    smtpHost: data.smtpHost.trim(),
    smtpPort: Number(data.smtpPort) || 587,
    smtpUser: data.smtpUser.trim(),
    smtpPassword: keepOrEncrypt(data.smtpPassword, prevEmail.smtpPassword),
    smtpSecure: Boolean(data.smtpSecure),
    fromEmail: data.fromEmail.trim(),
    fromName: data.fromName.trim(),
  };

  await prisma.websiteSettings.upsert({
    where: { id: 'default' },
    update: {
      paymentSettingsJson: { ...prevPayment, credentials: { bkash, nagad, rocket } },
      emailSettingsJson: email,
    },
    create: {
      id: 'default',
      paymentSettingsJson: { credentials: { bkash, nagad, rocket } },
      emailSettingsJson: email,
    },
  });

  await logStaffActivity({
    user: admin,
    action: 'CREDENTIALS_UPDATED',
    module: 'Administration',
    targetId: 'default',
    description: 'Updated email and payment integration credentials.',
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

