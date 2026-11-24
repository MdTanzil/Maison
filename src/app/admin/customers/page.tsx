import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { CustomersAdminClient } from '@/components/admin/customers-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;

  const [customers, allOrders] = await Promise.all([
    prisma.user.findMany({
      where: {
        userRoles: { some: { role: { slug: 'CUSTOMER' } } },
      },
      include: {
        customerProfile: true,
        addresses: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.findMany({
      select: { customerId: true, customerEmail: true, grandTotal: true },
    }),
  ]);

  return (
    <CustomersAdminClient
      canManage={hasPermission(user, 'customers.manage')}
      customers={customers.map((c) => {
        // Same matching rule as the customer account page: by customerId OR
        // by email, so guest orders placed with this email count on both pages.
        const customerOrders = allOrders.filter(
          (o) => o.customerId === c.id || (o.customerEmail !== null && o.customerEmail === c.email)
        );
        const totalSpent = customerOrders.reduce((acc, o) => acc + Number(o.grandTotal), 0);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || '—',
          isBlocked: c.isBlocked,
          totalOrders: customerOrders.length,
          totalSpent,
          loyaltyPoints: c.customerProfile?.loyaltyPoints ?? 0,
          internalNotes: c.customerProfile?.internalNotes || '',
          defaultAddress: c.addresses[0]
            ? `${c.addresses[0].addressLine1}, ${c.addresses[0].city}`
            : 'No saved address',
          createdAt: c.createdAt.toISOString(),
        };
      })}
    />
  );
}
