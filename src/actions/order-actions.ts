'use server';

import { revalidatePath } from 'next/cache';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import {
  getCurrentUser,
  requirePermission,
  requireAuth,
  hasPermission,
} from '@/lib/auth/session';
import { checkoutSchema } from '@/lib/validations/schemas';
import { generateOrderNumber } from '@/lib/utils';
import { logStaffActivity } from '@/lib/services/audit';
import { OrderStatus, PaymentStatus, CourierProvider } from '@prisma/client';
import { ORDER_TRANSITIONS, maySetStatus } from '@/lib/orders/status-rules';

export async function validateCouponServerAction(params: {
  code: string;
  subtotal: number;
  productIds?: string[];
}) {
  await ensureDatabaseReady();
  const code = params.code.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: 'Please enter a coupon code.' };
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return { ok: false, error: 'Invalid or inactive coupon code.' };
  }

  const now = new Date();
  if (coupon.startDate > now) {
    return { ok: false, error: 'This promotion has not started yet.' };
  }
  if (coupon.expiryDate < now) {
    return { ok: false, error: 'This coupon code has expired.' };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: 'This coupon has reached its maximum redemption limit.' };
  }

  const minAmount = Number(coupon.minOrderAmount);
  if (params.subtotal < minAmount) {
    return {
      ok: false,
      error: `Minimum order subtotal of ৳${minAmount.toLocaleString()} required for ${code}.`,
    };
  }

  if (coupon.applicableProductIds.length > 0 && params.productIds?.length) {
    const hasMatch = params.productIds.some((id) =>
      coupon.applicableProductIds.includes(id)
    );
    if (!hasMatch) {
      return {
        ok: false,
        error: 'This coupon is not applicable to the items in your bag.',
      };
    }
  }

  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = Math.round((params.subtotal * Number(coupon.discountValue)) / 100);
    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    }
  } else {
    discount = Number(coupon.discountValue);
  }

  discount = Math.min(discount, params.subtotal);

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount: discount,
    },
  };
}

export async function getCheckoutProfileAction() {
  await ensureDatabaseReady();
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return { ok: true, profile: null };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      addresses: { orderBy: { isDefault: 'desc' } },
    },
  });

  if (!dbUser) {
    return { ok: true, profile: null };
  }

  const defaultAddress = dbUser.addresses[0] ?? null;

  return {
    ok: true,
    profile: {
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || '',
      addressLine1: defaultAddress?.addressLine1 || '',
      area: defaultAddress?.area || '',
      city: defaultAddress?.city || '',
      postalCode: defaultAddress?.postalCode || '',
      zoneType: defaultAddress?.zoneType || 'INSIDE_CITY',
    },
  };
}

export async function placeOrderAction(rawInput: unknown) {
  await ensureDatabaseReady();
  const parsed = checkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || 'Please check your checkout details.',
    };
  }

  const data = parsed.data;
  const sessionUser = await getCurrentUser();
  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });

  if (!sessionUser && settings && !settings.allowGuestCheckout) {
    return {
      ok: false,
      error: 'Guest checkout is currently disabled. Please sign in to place your order.',
    };
  }

  // 1. Validate products and stock availability
  let subtotal = 0;
  const resolvedItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    totalPrice: number;
  }> = [];

  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { images: true, variants: true },
    });

    if (!product || product.status !== 'PUBLISHED') {
      return {
        ok: false,
        error: `Product "${product?.title || item.productId}" is no longer available.`,
      };
    }

    let variant = null;
    if (item.variantId) {
      variant = product.variants.find((v) => v.id === item.variantId) ?? null;
    }

    const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
    if (availableStock < item.quantity) {
      return {
        ok: false,
        error: `Insufficient stock for "${product.title}" (${availableStock} available, requested ${item.quantity}).`,
      };
    }

    const unitPrice = Number(
      variant?.salePrice ??
        variant?.regularPrice ??
        product.salePrice ??
        product.regularPrice
    );
    const costPrice = Number(variant?.costPrice ?? product.costPrice ?? 0);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    resolvedItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.title,
      variantName: variant?.title ?? null,
      sku: variant?.sku ?? product.sku,
      imageUrl: product.images[0]?.url ?? null,
      quantity: item.quantity,
      unitPrice,
      costPrice,
      totalPrice,
    });
  }

  // 2. Validate coupon on server
  let discountAmount = 0;
  let validatedCouponId: string | null = null;
  let appliedCouponCode: string | null = null;

  if (data.couponCode && data.couponCode.trim()) {
    const couponCheck = await validateCouponServerAction({
      code: data.couponCode,
      subtotal,
      productIds: resolvedItems.map((i) => i.productId),
    });
    if (!couponCheck.ok || !couponCheck.coupon) {
      return { ok: false, error: couponCheck.error || 'Invalid coupon code' };
    }
    discountAmount = couponCheck.coupon.discountAmount;
    validatedCouponId = couponCheck.coupon.id;
    appliedCouponCode = couponCheck.coupon.code;
  }

  // 3. Calculate shipping charge
  const freeThreshold = Number(settings?.freeShippingThreshold ?? 10000);
  let shippingCharge = 80;
  if (subtotal - discountAmount >= freeThreshold) {
    shippingCharge = 0;
  } else if (data.shippingZone === 'OUTSIDE_CITY') {
    shippingCharge = Number(settings?.outsideCityShipping ?? 150);
  } else if (data.shippingZone === 'SUB_AREA') {
    shippingCharge = Number(settings?.subAreaShipping ?? 110);
  } else {
    shippingCharge = Number(settings?.insideCityShipping ?? 80);
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCharge);
  const orderNumber = generateOrderNumber();
  const trackingNumber = `MB-TRK-${Math.floor(100000 + Math.random() * 900000)}`;

  // Create order & related records
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: sessionUser?.id ?? null,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail?.trim() || sessionUser?.email || null,
      shippingAddressLine: data.shippingAddressLine.trim(),
      shippingArea: data.shippingArea?.trim() || null,
      shippingCity: data.shippingCity.trim(),
      shippingPostalCode: data.shippingPostalCode?.trim() || null,
      shippingZone: data.shippingZone,
      subtotal,
      discountAmount,
      shippingCharge,
      taxAmount: 0,
      grandTotal,
      couponCode: appliedCouponCode,
      paymentMethod: data.paymentMethod,
      // Strict Security Requirement: Never claim a payment is verified/paid without server verification
      paymentStatus: 'PENDING',
      status: 'PENDING',
      stockDeducted: false,
      customerNotes: data.customerNotes?.trim() || null,
      createdById: sessionUser?.id ?? null,
      items: {
        create: resolvedItems,
      },
      statusHistory: {
        create: {
          status: 'PENDING',
          note: 'Order placed by customer via Storefront Checkout.',
          changedById: sessionUser?.id ?? null,
          changedByName: data.customerName.trim(),
        },
      },
      payments: {
        create: {
          paymentMethod: data.paymentMethod,
          status: 'PENDING',
          amount: grandTotal,
          transactionRef: data.transactionRef?.trim() || `PENDING-${orderNumber}`,
          senderPhone: data.senderPhone?.trim() || data.customerPhone.trim(),
          notes:
            data.paymentMethod === 'COD'
              ? 'Cash on Delivery — payable upon receipt'
              : `Submitted TrxID: ${data.transactionRef || 'Pending Verification'}`,
        },
      },
      shipment: {
        create: {
          courierProvider: 'INTERNAL_DELIVERY',
          trackingNumber,
          status: 'PENDING_PICKUP',
          deliveryCharge: shippingCharge,
          codAmount: data.paymentMethod === 'COD' ? grandTotal : 0,
          deliveryAddress: `${data.shippingAddressLine.trim()}, ${data.shippingCity.trim()}`,
          recipientName: data.customerName.trim(),
          recipientPhone: data.customerPhone.trim(),
        },
      },
    },
  });

  // Reserve stock in Inventory and record ORDER_RESERVE transaction
  for (const item of resolvedItems) {
    const inv = await prisma.inventory.findUnique({
      where: { productId: item.productId },
    });
    if (inv) {
      await prisma.inventory.update({
        where: { productId: item.productId },
        data: { reservedStock: inv.reservedStock + item.quantity },
      });
    }
    const prod = await prisma.product.findUnique({ where: { id: item.productId } });
    await prisma.inventoryTransaction.create({
      data: {
        productId: item.productId,
        variantId: item.variantId,
        type: 'ORDER_RESERVE',
        quantity: item.quantity,
        previousStock: prod?.stockQuantity ?? 0,
        newStock: prod?.stockQuantity ?? 0,
        reason: `Reserved for order ${orderNumber}`,
        referenceId: orderNumber,
        performedById: sessionUser?.id ?? null,
      },
    });
  }

  if (validatedCouponId) {
    await prisma.coupon.update({
      where: { id: validatedCouponId },
      data: { usedCount: { increment: 1 } },
    });
    await prisma.couponUsage.create({
      data: {
        couponId: validatedCouponId,
        userId: sessionUser?.id ?? null,
        orderId: order.id,
        discountApplied: discountAmount,
      },
    });
  }

  if (sessionUser) {
    await prisma.customerProfile.upsert({
      where: { userId: sessionUser.id },
      update: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: grandTotal },
        loyaltyPoints: { increment: Math.floor(grandTotal / 100) },
      },
      create: {
        userId: sessionUser.id,
        totalOrders: 1,
        totalSpent: grandTotal,
        loyaltyPoints: Math.floor(grandTotal / 100),
      },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath('/account');
  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    trackingNumber,
  };
}

export async function applyOrderStockTransition(params: {
  orderId: string;
  targetStatus: OrderStatus;
  performedById: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true },
  });
  if (!order) return;

  const shouldHaveStockDeducted = [
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_SHIPMENT',
    'SHIPPED',
    'DELIVERED',
  ].includes(params.targetStatus);

  const shouldRestoreStock = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(
    params.targetStatus
  );

  if (shouldHaveStockDeducted && !order.stockDeducted) {
    // Validate stock before confirming/deducting
    for (const item of order.items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!prod || prod.stockQuantity < item.quantity) {
        throw new Error(
          `Insufficient stock to confirm "${item.productName}" (Need ${item.quantity}, Available ${prod?.stockQuantity ?? 0}).`
        );
      }
    }

    for (const item of order.items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!prod) continue;
      const newStock = Math.max(0, prod.stockQuantity - item.quantity);

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          stockQuantity: newStock,
          soldCount: prod.soldCount + item.quantity,
        },
      });

      const inv = await prisma.inventory.findUnique({ where: { productId: prod.id } });
      await prisma.inventory.upsert({
        where: { productId: prod.id },
        update: {
          availableStock: newStock,
          reservedStock: Math.max(0, (inv?.reservedStock ?? 0) - item.quantity),
        },
        create: {
          productId: prod.id,
          availableStock: newStock,
          reservedStock: 0,
        },
      });

      if (item.variantId) {
        const v = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (v) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: { stockQuantity: Math.max(0, v.stockQuantity - item.quantity) },
          });
        }
      }

      await prisma.inventoryTransaction.create({
        data: {
          productId: prod.id,
          variantId: item.variantId,
          type: 'ORDER_DEDUCT',
          quantity: item.quantity,
          previousStock: prod.stockQuantity,
          newStock,
          reason: `Stock deducted for order ${order.orderNumber} (${params.targetStatus})`,
          referenceId: order.orderNumber,
          performedById: params.performedById,
        },
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { stockDeducted: true },
    });
  } else if (shouldRestoreStock && order.stockDeducted) {
    for (const item of order.items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!prod) continue;
      const newStock = prod.stockQuantity + item.quantity;

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          stockQuantity: newStock,
          soldCount: Math.max(0, prod.soldCount - item.quantity),
        },
      });

      await prisma.inventory.upsert({
        where: { productId: prod.id },
        update: { availableStock: newStock },
        create: { productId: prod.id, availableStock: newStock },
      });

      if (item.variantId) {
        const v = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (v) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: { stockQuantity: v.stockQuantity + item.quantity },
          });
        }
      }

      await prisma.inventoryTransaction.create({
        data: {
          productId: prod.id,
          variantId: item.variantId,
          type:
            params.targetStatus === 'CANCELLED' ? 'CANCEL_RESTORE' : 'RETURN_RESTORE',
          quantity: item.quantity,
          previousStock: prod.stockQuantity,
          newStock,
          reason: `Stock restored from ${params.targetStatus} order ${order.orderNumber}`,
          referenceId: order.orderNumber,
          performedById: params.performedById,
        },
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { stockDeducted: false },
    });
  }
}

export async function updateOrderStatusAction(params: {
  orderId: string;
  status: OrderStatus;
  note?: string;
  internalNotes?: string;
  trackingNumber?: string;
  courierProvider?: CourierProvider;
  collectedCash?: number;
}) {
  await ensureDatabaseReady();
  const user = await requireAuth();

  const canUpdate =
    hasPermission(user, 'orders.update_status') ||
    hasPermission(user, 'orders.confirm') ||
    hasPermission(user, 'delivery.update');

  if (!canUpdate) {
    return {
      ok: false,
      error: 'FORBIDDEN: You do not have permission to update order statuses.',
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      shipment: true,
      payments: true,
      assignments: { select: { staffId: true } },
    },
  });

  if (!order) {
    return { ok: false, error: 'Order not found.' };
  }

  // Refunds must go through processOrderRefundAction (payments.verify) — the
  // status action never sets REFUNDED, not even for a Super Admin.
  if (params.status === 'REFUNDED') {
    return {
      ok: false,
      error: 'Refunds must be processed via the refund action on the order or payments page.',
    };
  }

  // Same-status submissions are metadata-only saves (internal notes, courier
  // provider, tracking number): skip the transition + permission checks, the
  // status-history entry, the timestamp stamps and the stock transition.
  const isSameStatus = params.status === order.status;

  if (!isSameStatus) {
    // Transition allow-list (Super Admin may override it to correct a
    // wrongly-transitioned order; every jump is still history-logged).
    if (
      !user.isSuperAdmin &&
      !ORDER_TRANSITIONS[order.status].includes(params.status)
    ) {
      return {
        ok: false,
        error: `Cannot move order ${order.orderNumber} from ${order.status} to ${params.status}.`,
      };
    }

    // Per-target permission + rider scoping.
    const isAssigned =
      order.assignments.some((a) => a.staffId === user.id) ||
      order.shipment?.deliveryStaffId === user.id;
    const hasOpsPermission =
      hasPermission(user, 'orders.update_status') ||
      hasPermission(user, 'orders.confirm');
    const hasDeliveryPermission = hasPermission(user, 'delivery.update');
    if (!hasOpsPermission && hasDeliveryPermission && !isAssigned) {
      return { ok: false, error: 'This order is not assigned to you.' };
    }
    if (
      !maySetStatus(params.status, {
        permissions: user.permissions,
        isSuperAdmin: user.isSuperAdmin,
        isAssigned,
      })
    ) {
      return {
        ok: false,
        error: 'FORBIDDEN: You do not have permission to set this status.',
      };
    }
  }

  if (!isSameStatus) {
    try {
      await applyOrderStockTransition({
        orderId: order.id,
        targetStatus: params.status,
        performedById: user.id,
      });
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Stock validation failed.',
      };
    }
  }

  const now = new Date();
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: params.status,
      ...(params.internalNotes !== undefined
        ? { internalNotes: params.internalNotes }
        : {}),
      ...(params.status === 'CONFIRMED' && !isSameStatus && !order.confirmedById
        ? { confirmedById: user.id, confirmedAt: now }
        : {}),
      ...(params.status === 'DELIVERED' && !isSameStatus ? { deliveredAt: now } : {}),
      ...(params.status === 'CANCELLED' && !isSameStatus ? { cancelledAt: now } : {}),
    },
  });

  if (!isSameStatus) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: params.status,
        previousStatus: order.status,
        note:
          params.note?.trim() ||
          `Status updated from ${order.status} to ${params.status} by ${user.name}`,
        changedById: user.id,
        changedByName: user.name,
      },
    });
  }

  if (order.shipment) {
    const shipmentStatus =
      params.status === 'DELIVERED'
        ? 'DELIVERED'
        : params.status === 'RETURNED'
        ? 'RETURNED'
        : params.status === 'SHIPPED'
        ? 'IN_TRANSIT'
        : params.status === 'READY_FOR_SHIPMENT'
        ? 'READY_FOR_PICKUP'
        : order.shipment.status;

    await prisma.shipment.update({
      where: { id: order.shipment.id },
      data: {
        status: shipmentStatus,
        ...(params.trackingNumber ? { trackingNumber: params.trackingNumber.trim() } : {}),
        ...(params.courierProvider ? { courierProvider: params.courierProvider } : {}),
        ...(params.collectedCash !== undefined
          ? { collectedCash: Number(params.collectedCash) }
          : {}),
        ...(params.status === 'SHIPPED' ? { dispatchedAt: now } : {}),
        ...(params.status === 'DELIVERED' ? { deliveredAt: now } : {}),
        ...(params.status === 'RETURNED' ? { returnedAt: now } : {}),
      },
    });
  }

  // Record collected COD cash on the payment. Verification is a separate step
  // (verifyPaymentAction, payments.verify) — cash alone never marks a payment
  // verified.
  if (params.collectedCash !== undefined && Number(params.collectedCash) > 0) {
    const cashVal = Number(params.collectedCash);
    if (order.payments[0]) {
      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: {
          collectedCashAmount: cashVal,
          collectedById: user.id,
          collectedAt: now,
        },
      });
    }
    await prisma.staffProfile.updateMany({
      where: { userId: user.id },
      data: { cashCollected: { increment: cashVal } },
    });
  }

  if (params.status === 'DELIVERED' || params.status === 'CONFIRMED') {
    await prisma.staffProfile.updateMany({
      where: { userId: user.id },
      data: { ordersCompleted: { increment: 1 } },
    });
  } else if (params.status === 'CANCELLED') {
    await prisma.staffProfile.updateMany({
      where: { userId: user.id },
      data: { ordersCancelled: { increment: 1 } },
    });
  }

  await logStaffActivity({
    user,
    action: `ORDER_STATUS_${params.status}`,
    module: 'Orders',
    targetId: order.orderNumber,
    description: `Order ${order.orderNumber} updated to ${params.status}${
      params.note ? ` (${params.note})` : ''
    }`,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/admin/shipping');
  revalidatePath('/admin/inventory');
  revalidatePath('/account');
  return { ok: true };
}

export async function bulkUpdateOrderStatusAction(params: {
  orderIds: string[];
  status: OrderStatus;
  note?: string;
}) {
  await ensureDatabaseReady();
  await requirePermission('orders.update_status');

  const failed: Array<{ orderId: string; error: string }> = [];
  let succeeded = 0;
  for (const orderId of params.orderIds) {
    const res = await updateOrderStatusAction({
      orderId,
      status: params.status,
      note: params.note || `Bulk status update to ${params.status}`,
    });
    if (res.ok) succeeded++;
    else failed.push({ orderId, error: res.error ?? 'Update failed' });
  }

  revalidatePath('/admin/orders');
  return { ok: failed.length === 0, count: succeeded, failed };
}

export async function assignOrderToStaffAction(params: {
  orderId: string;
  staffId: string;
  roleType: 'MODERATOR' | 'ORDER_PROCESSING' | 'DELIVERY_STAFF';
  notes?: string;
}) {
  await ensureDatabaseReady();
  const user = await requirePermission('orders.assign');

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shipment: true },
  });
  const staff = await prisma.user.findUnique({ where: { id: params.staffId } });

  if (!order || !staff) {
    return { ok: false, error: 'Order or staff member not found.' };
  }

  await prisma.orderAssignment.create({
    data: {
      orderId: order.id,
      staffId: staff.id,
      roleType: params.roleType,
      assignedById: user.id,
      status: 'ASSIGNED',
      notes: params.notes || `Assigned for ${params.roleType.replace('_', ' ')}`,
    },
  });

  const roleLabel =
    params.roleType === 'DELIVERY_STAFF'
      ? 'delivery'
      : params.roleType === 'ORDER_PROCESSING'
        ? 'order processing'
        : 'moderation';

  await prisma.notification.create({
    data: {
      userId: staff.id,
      title: 'New order assigned',
      message: `You have been assigned to order ${order.orderNumber} for ${roleLabel} by ${user.name}.`,
      type: 'ORDER_ASSIGNED',
      link: `/admin/orders/${order.id}`,
    },
  });

  if (params.roleType === 'DELIVERY_STAFF' && order.shipment) {
    await prisma.shipment.update({
      where: { id: order.shipment.id },
      data: { deliveryStaffId: staff.id },
    });
  }

  await prisma.staffProfile.updateMany({
    where: { userId: staff.id },
    data: { ordersAssigned: { increment: 1 } },
  });

  await logStaffActivity({
    user,
    action: 'ORDER_ASSIGNED',
    module: 'Orders',
    targetId: order.orderNumber,
    description: `Assigned order ${order.orderNumber} to ${staff.name} (${params.roleType})`,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/admin/staff');
  revalidatePath('/admin/shipping');
  return { ok: true };
}

export async function unassignStaffFromOrderAction(params: {
  orderId: string;
  staffId: string;
}) {
  await ensureDatabaseReady();
  const user = await requireAuth();
  if (!user.isSuperAdmin) {
    return { ok: false, error: 'FORBIDDEN: Only a Super Admin can unassign staff.' };
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shipment: true },
  });
  const staff = await prisma.user.findUnique({ where: { id: params.staffId } });
  if (!order || !staff) {
    return { ok: false, error: 'Order or staff member not found.' };
  }

  const assignments = await prisma.orderAssignment.findMany({
    where: { orderId: order.id, staffId: staff.id },
  });
  if (assignments.length === 0) {
    return { ok: false, error: 'This staff member is not assigned to this order.' };
  }

  const wasDelivery = assignments.some((a) => a.roleType === 'DELIVERY_STAFF');

  await prisma.orderAssignment.deleteMany({
    where: { orderId: order.id, staffId: staff.id },
  });

  if (wasDelivery && order.shipment && order.shipment.deliveryStaffId === staff.id) {
    await prisma.shipment.update({
      where: { id: order.shipment.id },
      data: { deliveryStaffId: null },
    });
  }

  const profile = await prisma.staffProfile.findUnique({
    where: { userId: staff.id },
  });
  if (profile && profile.ordersAssigned > 0) {
    await prisma.staffProfile.update({
      where: { userId: staff.id },
      data: { ordersAssigned: { decrement: 1 } },
    });
  }

  await prisma.notification.create({
    data: {
      userId: staff.id,
      title: 'Assignment removed',
      message: `Your assignment to order ${order.orderNumber} has been removed by ${user.name}.`,
      type: 'ORDER_UNASSIGNED',
      link: `/admin/orders/${order.id}`,
    },
  });

  await logStaffActivity({
    user,
    action: 'ORDER_UNASSIGNED',
    module: 'Orders',
    targetId: order.orderNumber,
    description: `Removed ${staff.name} from order ${order.orderNumber}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/admin/staff');
  revalidatePath('/admin/shipping');
  return { ok: true };
}

export async function verifyPaymentAction(params: {
  orderId: string;
  paymentStatus: PaymentStatus;
  transactionRef?: string;
  collectedCashAmount?: number;
  notes?: string;
}) {
  await ensureDatabaseReady();
  const user = await requirePermission('payments.verify');

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payments: true },
  });
  if (!order) return { ok: false, error: 'Order not found' };

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: params.paymentStatus },
  });

  if (order.payments[0]) {
    await prisma.payment.update({
      where: { id: order.payments[0].id },
      data: {
        status: params.paymentStatus,
        ...(params.transactionRef ? { transactionRef: params.transactionRef } : {}),
        ...(params.collectedCashAmount !== undefined
          ? {
              collectedCashAmount: params.collectedCashAmount,
              collectedById: user.id,
              collectedAt: new Date(),
            }
          : {}),
        ...(params.notes ? { notes: params.notes } : {}),
        verifiedById: user.id,
        verifiedAt: new Date(),
      },
    });
  }

  await logStaffActivity({
    user,
    action: `PAYMENT_${params.paymentStatus}`,
    module: 'Finance',
    targetId: order.orderNumber,
    description: `Payment for ${order.orderNumber} marked as ${params.paymentStatus} (Ref: ${
      params.transactionRef || 'N/A'
    })`,
  });

  revalidatePath('/admin/payments');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: true };
}

export async function processOrderRefundAction(params: {
  orderId: string;
  amount: number;
  reason: string;
  restockItems: boolean;
}) {
  await ensureDatabaseReady();
  const user = await requirePermission('payments.verify');

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payments: true },
  });
  if (!order) return { ok: false, error: 'Order not found' };

  if (params.restockItems) {
    await applyOrderStockTransition({
      orderId: order.id,
      targetStatus: 'REFUNDED',
      performedById: user.id,
    });
  }

  await prisma.refund.create({
    data: {
      orderId: order.id,
      paymentId: order.payments[0]?.id ?? null,
      amount: params.amount,
      reason: params.reason,
      restockItems: params.restockItems,
      status: 'COMPLETED',
      processedById: user.id,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: 'REFUNDED',
      previousStatus: order.status,
      note: `Refund of ৳${params.amount} processed. Reason: ${params.reason}`,
      changedById: user.id,
      changedByName: user.name,
    },
  });

  await logStaffActivity({
    user,
    action: 'ORDER_REFUNDED',
    module: 'Finance',
    targetId: order.orderNumber,
    description: `Processed refund of ৳${params.amount} for order ${order.orderNumber}`,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/admin/payments');
  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function deleteOrderAction(orderId: string) {
  await ensureDatabaseReady();
  const user = await requireAuth();
  if (!user.isSuperAdmin) {
    return { ok: false, error: 'FORBIDDEN: Only a Super Admin can delete orders.' };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, statusHistory: true },
  });
  if (!order) {
    return { ok: false, error: 'Order not found.' };
  }

  // Only cancelled orders can be deleted. Cancelling first restores any
  // deducted stock via applyOrderStockTransition, so delete never has to
  // guess the stock state of a live order.
  if (order.status !== 'CANCELLED') {
    return {
      ok: false,
      error: 'Only cancelled orders can be deleted. Cancel the order first.',
    };
  }

  // Defensive: if deducted stock was somehow never restored, restore it now.
  // (Normally cancel already did this and stockDeducted is false.)
  if (order.stockDeducted) {
    await applyOrderStockTransition({
      orderId: order.id,
      targetStatus: 'CANCELLED',
      performedById: user.id,
    });
  }

  // A stock reservation is still held only when the order never reached a
  // stock-deducting status (confirm releases the reservation) AND live
  // ORDER_RESERVE transactions exist for it (seeded orders never reserved
  // stock, so they must not release anything).
  const everDeducted = order.statusHistory.some((h) =>
    ['CONFIRMED', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED'].includes(
      h.status
    )
  );
  let reservedHeld = false;
  if (!everDeducted) {
    const reserveTxns = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.orderNumber, type: 'ORDER_RESERVE' },
    });
    reservedHeld = reserveTxns.length > 0;
  }

  const profile = order.customerId
    ? await prisma.customerProfile.findUnique({ where: { userId: order.customerId } })
    : null;

  await prisma.$transaction(async (tx) => {
    if (reservedHeld) {
      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (inv && inv.reservedStock > 0) {
          const newReserved = Math.max(0, inv.reservedStock - item.quantity);
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reservedStock: newReserved },
          });
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              type: 'ADJUSTMENT',
              quantity: item.quantity,
              previousStock: prod?.stockQuantity ?? 0,
              newStock: prod?.stockQuantity ?? 0,
              reason: `Released reservation for deleted order ${order.orderNumber}`,
              referenceId: order.orderNumber,
              performedById: user.id,
            },
          });
        }
      }
    }

    // Mirror the placement-time profile increment (placeOrderAction) so the
    // deleted order stops counting toward the customer's lifetime totals.
    // Loyalty points are deliberately left untouched.
    if (profile) {
      await tx.customerProfile.update({
        where: { userId: profile.userId },
        data: {
          totalOrders: Math.max(0, profile.totalOrders - 1),
          totalSpent: Math.max(0, Number(profile.totalSpent) - Number(order.grandTotal)),
        },
      });
    }

    // All order dependents cascade at the DB level (OrderItem,
    // OrderStatusHistory, OrderAssignment, Payment, Refund, Shipment,
    // CouponUsage — see schema.prisma), so deleting the order removes them.
    // InventoryTransaction / StaffActivityLog rows only carry the order
    // number as a string and are kept as the audit trail.
    await tx.order.delete({ where: { id: order.id } });
  });

  await logStaffActivity({
    user,
    action: 'ORDER_DELETED',
    module: 'Orders',
    targetId: order.orderNumber,
    description: `Deleted cancelled order ${order.orderNumber} (${order.customerName}, ৳${Number(order.grandTotal).toLocaleString()})`,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/reports');
  revalidatePath('/admin/customers');
  revalidatePath('/admin/inventory');
  revalidatePath('/account');
  return { ok: true, orderNumber: order.orderNumber };
}
