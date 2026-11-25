import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { StaffAdminClient } from '@/components/admin/staff-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminStaffPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;
  if (!user || !hasPermission(user, 'staff.manage')) {
    redirect('/admin');
  }

  const [staffUsers, roles, permissions, activityLogs] = await Promise.all([
    prisma.user.findMany({
      where: { staffProfile: { isNot: null } },
      include: {
        staffProfile: true,
        userRoles: { include: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.permission.findMany({
      orderBy: { module: 'asc' },
    }),
    prisma.staffActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return (
    <StaffAdminClient
      canManageRoles={hasPermission(user, 'roles.manage')}
      staff={staffUsers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        isActive: s.isActive,
        roleId: s.userRoles[0]?.roleId || '',
        roleName: s.userRoles[0]?.role.name || 'Staff',
        employeeCode: s.staffProfile?.employeeCode || 'MB-EMP',
        department: s.staffProfile?.department || '',
        designation: s.staffProfile?.designation || '',
        ordersAssigned: s.staffProfile?.ordersAssigned ?? 0,
        ordersCompleted: s.staffProfile?.ordersCompleted ?? 0,
        ordersCancelled: s.staffProfile?.ordersCancelled ?? 0,
        cashCollected: Number(s.staffProfile?.cashCollected ?? 0),
      }))}
      roles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description || '',
        isSystem: r.isSystem,
        permissionCodes: r.rolePermissions.map((rp) => rp.permission.code),
      }))}
      permissions={permissions.map((p) => ({
        code: p.code,
        name: p.name,
        module: p.module,
      }))}
      activityLogs={activityLogs.map((l) => ({
        id: l.id,
        staffName: l.staffName,
        roleName: l.roleName,
        action: l.action,
        module: l.module,
        targetId: l.targetId,
        description: l.description,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
