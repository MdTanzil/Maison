import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';

const SESSION_COOKIE_NAME = 'mb_session_token';
const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'maison-beige-luxury-super-secret-jwt-key-2026-production-ready'
);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  roleNames: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  isStaff: boolean;
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
  roles: string[];
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { userId: string; email: string; roles: string[] };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  await ensureDatabaseReady();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = await verifySessionToken(token);
  if (!decoded?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive || user.isBlocked) {
    return null;
  }

  const roles = user.userRoles.map((ur) => ur.role.slug);
  const roleNames = user.userRoles.map((ur) => ur.role.name);
  const permSet = new Set<string>();

  for (const ur of user.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permSet.add(rp.permission.code);
    }
    for (const customPerm of ur.customPermissions ?? []) {
      permSet.add(customPerm);
    }
  }

  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isStaff =
    isSuperAdmin ||
    roles.some((r) =>
      ['ADMIN_MANAGER', 'MODERATOR', 'ORDER_PROCESSING', 'DELIVERY_STAFF'].includes(r)
    ) ||
    permSet.has('dashboard.view');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles,
    roleNames,
    permissions: Array.from(permSet),
    isSuperAdmin,
    isStaff,
  };
}

export function hasPermission(user: SessionUser | null, permissionCode: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permissionCode);
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Please sign in to continue.');
  }
  return user;
}

export async function requirePermission(permissionCode: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permissionCode)) {
    throw new Error(`FORBIDDEN: Missing required permission (${permissionCode}).`);
  }
  return user;
}
