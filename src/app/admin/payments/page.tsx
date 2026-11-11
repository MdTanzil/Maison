import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getIntegrationsStatus } from '@/lib/services/integrations';
import { PaymentsAdminClient } from '@/components/admin/payments-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;

  const [payments, refunds] = await Promise.all([
    prisma.payment.findMany({
      include: {
        order: true,
        verifiedBy: true,
        collectedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.refund.findMany({
      include: {
        order: true,
        processedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const gateways = getIntegrationsStatus().filter((g) => g.type === 'PAYMENT');

  return (
    <PaymentsAdminClient
      canVerify={hasPermission(user, 'payments.verify')}
      gateways={gateways}
      payments={payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order.orderNumber,
        customerName: p.order.customerName,
        paymentMethod: p.paymentMethod,
        status: p.status,
        amount: Number(p.amount),
        transactionRef: p.transactionRef || '',
        collectedCashAmount: Number(p.collectedCashAmount),
        verifiedByName: p.verifiedBy?.name || null,
        collectedByName: p.collectedBy?.name || null,
        createdAt: p.createdAt.toISOString(),
      }))}
      refunds={refunds.map((r) => ({
        id: r.id,
        orderNumber: r.order.orderNumber,
        amount: Number(r.amount),
        reason: r.reason,
        status: r.status,
        restockItems: r.restockItems,
        processedByName: r.processedBy?.name || 'Admin',
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
