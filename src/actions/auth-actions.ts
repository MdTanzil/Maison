'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
  requireAuth,
} from '@/lib/auth/session';
import { loginSchema, registerSchema } from '@/lib/validations/schemas';
import { logStaffActivity } from '@/lib/services/audit';

export async function loginAction(rawInput: { email: string; password: string }) {
  await ensureDatabaseReady();
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    return { ok: false, error: 'Invalid email or password' };
  }

  if (!user.isActive || user.isBlocked) {
    return { ok: false, error: 'This account has been deactivated or restricted.' };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: 'Invalid email or password' };
  }

  const roles = user.userRoles.map((ur) => ur.role.slug);
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    roles,
  });

  await setSessionCookie(token);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const isStaff = roles.some((r) => r !== 'CUSTOMER');
  if (isStaff) {
    await prisma.staffActivityLog.create({
      data: {
        userId: user.id,
        staffName: user.name,
        roleName: user.userRoles[0]?.role.name ?? 'Staff',
        action: 'STAFF_LOGIN',
        module: 'Authentication',
        description: `${user.name} signed in to the management console.`,
      },
    });
  }

  return {
    ok: true,
    redirectTo: isStaff ? '/admin' : '/account',
    user: { id: user.id, name: user.name, email: user.email, roles },
  };
}

export async function registerAction(rawInput: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  await ensureDatabaseReady();
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid registration data' };
  }

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone: phone.trim() }],
    },
  });

  if (existing) {
    return { ok: false, error: 'An account with this email or phone number already exists.' };
  }

  let customerRole = await prisma.role.findUnique({ where: { slug: 'CUSTOMER' } });
  if (!customerRole) {
    customerRole = await prisma.role.create({
      data: { name: 'Customer', slug: 'CUSTOMER', isSystem: true },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      emailVerifiedAt: new Date(),
      userRoles: {
        create: { roleId: customerRole.id },
      },
      customerProfile: {
        create: {
          loyaltyPoints: 50,
          totalOrders: 0,
          totalSpent: 0,
        },
      },
    },
  });

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    roles: ['CUSTOMER'],
  });
  await setSessionCookie(token);

  revalidatePath('/', 'layout');
  return { ok: true, redirectTo: '/account' };
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user?.isStaff) {
    await logStaffActivity({
      user,
      action: 'STAFF_LOGOUT',
      module: 'Authentication',
      description: `${user.name} signed out.`,
    });
  }
  await clearSessionCookie();
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateCustomerProfileAction(data: {
  name: string;
  phone: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  const sessionUser = await requireAuth();

  const updateData: { name: string; phone: string; passwordHash?: string } = {
    name: data.name.trim(),
    phone: data.phone.trim(),
  };

  if (data.newPassword && data.newPassword.length >= 6) {
    const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!dbUser) return { ok: false, error: 'User not found' };
    if (data.currentPassword) {
      const matches = await bcrypt.compare(data.currentPassword, dbUser.passwordHash);
      if (!matches) {
        return { ok: false, error: 'Current password is incorrect' };
      }
    }
    updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: updateData,
  });

  revalidatePath('/account');
  return { ok: true };
}

export async function saveCustomerAddressAction(data: {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  area?: string;
  city: string;
  postalCode?: string;
  zoneType: string;
  isDefault?: boolean;
}) {
  const sessionUser = await requireAuth();

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: sessionUser.id },
      data: { isDefault: false },
    });
  }

  await prisma.address.create({
    data: {
      userId: sessionUser.id,
      label: data.label || 'Home',
      fullName: data.fullName,
      phone: data.phone,
      addressLine1: data.addressLine1,
      area: data.area || '',
      city: data.city,
      postalCode: data.postalCode || '',
      zoneType: data.zoneType || 'INSIDE_CITY',
      isDefault: Boolean(data.isDefault),
    },
  });

  revalidatePath('/account');
  return { ok: true };
}

export async function deleteCustomerAddressAction(addressId: string) {
  const sessionUser = await requireAuth();
  await prisma.address.deleteMany({
    where: { id: addressId, userId: sessionUser.id },
  });
  revalidatePath('/account');
  return { ok: true };
}
