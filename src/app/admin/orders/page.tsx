import React from 'react';
import { redirect } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getAllowedTargetStatuses } from '@/lib/orders/status-rules';
import { OrdersTableClient } from '@/components/admin/orders-table-client';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; staff?: string }>;
}) {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;
  if (!user || !hasPermission(user, 'orders.view')) {
    redirect('/admin');
  }
  const sp = await searchParams;

  const isDeliveryOnly =
    user.roles.includes('DELIVERY_STAFF') && !user.isSuperAdmin && !hasPermission(user, 'reports.view');

  const [orders, staffUsers] = await Promise.all([
    prisma.order.findMany({
      where: isDeliveryOnly
        ? {
            OR: [
              { assignments: { some: { staffId: user.id } } },
              { shipment: { deliveryStaffId: user.id } },
            ],
          }
        : undefined,
      include: {
        items: true,
        shipment: true,
        assignments: { include: { staff: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { staffProfile: { isNot: null }, isActive: true },
      include: { userRoles: { include: { role: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <OrdersTableClient
      initialSearch={sp.q || ''}
      initialStatus={sp.status || ''}
      initialPayment={sp.payment || ''}
      initialStaff={sp.staff || ''}
      canAssign={user.isSuperAdmin || user.permissions.includes('orders.assign')}
      canUpdateStatus={
        user.isSuperAdmin ||
        user.permissions.includes('orders.update_status') ||
        user.permissions.includes('orders.confirm') ||
        user.permissions.includes('delivery.update')
      }
      canCancel={hasPermission(user, 'orders.cancel')}
      allowedStatusesByOrder={orders.reduce(
        (acc, o) => {
          const isAssigned =
            o.assignments.some((a) => a.staffId === user.id) ||
            o.shipment?.deliveryStaffId === user.id;
          acc[o.id] = getAllowedTargetStatuses(o.status, {
            permissions: user.permissions,
            isSuperAdmin: user.isSuperAdmin,
            isAssigned,
          });
          return acc;
        },
        {} as Record<string, OrderStatus[]>
      )}
      canDeleteOrder={user.isSuperAdmin}
      staffList={staffUsers.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.userRoles[0]?.role.name || 'Staff',
      }))}
      orders={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        shippingCity: o.shippingCity,
        itemCount: o.items.reduce((a, b) => a + b.quantity, 0),
        grandTotal: Number(o.grandTotal),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        trackingNumber: o.shipment?.trackingNumber ?? null,
        assignedStaff: o.assignments.map((a) => ({
          id: a.staffId,
          name: a.staff.name,
          roleType: a.roleType,
        })),
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  );
}
