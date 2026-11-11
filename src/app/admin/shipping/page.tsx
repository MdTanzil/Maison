import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getIntegrationsStatus } from '@/lib/services/integrations';
import { ShippingAdminClient } from '@/components/admin/shipping-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminShippingPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;

  const [shipments, shippingMethods, deliveryRiders] = await Promise.all([
    prisma.shipment.findMany({
      include: {
        order: true,
        deliveryStaff: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shippingMethod.findMany({ orderBy: { charge: 'asc' } }),
    prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: { some: { role: { slug: 'DELIVERY_STAFF' } } },
      },
    }),
  ]);

  const couriers = getIntegrationsStatus().filter((g) => g.type === 'COURIER');

  return (
    <ShippingAdminClient
      canManageShipping={hasPermission(user, 'shipping.manage')}
      couriers={couriers}
      shippingMethods={shippingMethods.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        zoneType: m.zoneType,
        charge: Number(m.charge),
        estimatedDays: m.estimatedDays,
      }))}
      deliveryRiders={deliveryRiders.map((r) => ({ id: r.id, name: r.name }))}
      shipments={shipments.map((s) => ({
        id: s.id,
        orderId: s.orderId,
        orderNumber: s.order.orderNumber,
        orderStatus: s.order.status,
        courierProvider: s.courierProvider,
        trackingNumber: s.trackingNumber || '',
        deliveryStaffId: s.deliveryStaffId,
        deliveryStaffName: s.deliveryStaff?.name || 'Unassigned',
        status: s.status,
        codAmount: Number(s.codAmount),
        collectedCash: Number(s.collectedCash),
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone,
        deliveryAddress: s.deliveryAddress,
      }))}
    />
  );
}
