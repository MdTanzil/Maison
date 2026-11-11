import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { OrdersTableClient } from '@/components/admin/orders-table-client';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; staff?: string }>;
}) {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;
  const sp = await searchParams;

  const [orders, staffUsers] = await Promise.all([
    prisma.order.findMany({
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
        user.permissions.includes('orders.confirm')
      }
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
