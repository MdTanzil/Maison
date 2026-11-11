import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { CustomerAccountClient } from '@/components/storefront/account-client';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage() {
  await ensureDatabaseReady();
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect('/auth/login');
  }

  const [dbUser, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        customerProfile: true,
        addresses: { orderBy: { isDefault: 'desc' } },
      },
    }),
    prisma.order.findMany({
      where: {
        OR: [{ customerId: sessionUser.id }, { customerEmail: sessionUser.email }],
      },
      include: {
        items: true,
        shipment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!dbUser) {
    redirect('/auth/login');
  }

  const totalSpent = orders.reduce((acc, o) => acc + Number(o.grandTotal), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CustomerAccountClient
        user={{
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || '',
          roles: sessionUser.roleNames,
          isStaff: sessionUser.isStaff,
          loyaltyPoints: dbUser.customerProfile?.loyaltyPoints ?? 100,
          totalOrders: orders.length,
          totalSpent,
        }}
        addresses={dbUser.addresses.map((a) => ({
          id: a.id,
          label: a.label,
          fullName: a.fullName,
          phone: a.phone,
          addressLine1: a.addressLine1,
          area: a.area || '',
          city: a.city,
          postalCode: a.postalCode || '',
          zoneType: a.zoneType,
          isDefault: a.isDefault,
        }))}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          grandTotal: Number(o.grandTotal),
          shippingAddress: `${o.shippingAddressLine}, ${o.shippingCity}`,
          trackingNumber: o.shipment?.trackingNumber ?? null,
          courierProvider: o.shipment?.courierProvider ?? 'INTERNAL_DELIVERY',
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((i) => ({
            id: i.id,
            productName: i.productName,
            variantName: i.variantName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
          })),
        }))}
      />
    </div>
  );
}
