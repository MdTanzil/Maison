import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { CustomersAdminClient } from '@/components/admin/customers-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;

  const customers = await prisma.user.findMany({
    where: {
      userRoles: { some: { role: { slug: 'CUSTOMER' } } },
    },
    include: {
      customerProfile: true,
      addresses: true,
      orders: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <CustomersAdminClient
      canManage={hasPermission(user, 'customers.manage')}
      customers={customers.map((c) => {
        const totalSpent = c.orders.reduce((acc, o) => acc + Number(o.grandTotal), 0);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || '—',
          isBlocked: c.isBlocked,
          totalOrders: c.orders.length,
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
