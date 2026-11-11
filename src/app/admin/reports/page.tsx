import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { ReportsAdminClient } from '@/components/admin/reports-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await ensureDatabaseReady();

  const [orders, products, categories, refunds] = await Promise.all([
    prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      include: { category: true },
      orderBy: { soldCount: 'desc' },
    }),
    prisma.category.findMany({
      include: { products: true },
    }),
    prisma.refund.findMany({ include: { order: true } }),
  ]);

  const validOrders = orders.filter(
    (o) => !['CANCELLED', 'REFUNDED', 'RETURNED'].includes(o.status)
  );
  const grossRevenue = validOrders.reduce((a, b) => a + Number(b.grandTotal), 0);
  const totalCost = validOrders.reduce(
    (acc, o) =>
      acc +
      o.items.reduce((sum, it) => sum + Number(it.costPrice) * it.quantity, 0),
    0
  );
  const netProfit = grossRevenue - totalCost;
  const totalRefunded = refunds.reduce((a, b) => a + Number(b.amount), 0);

  const categoryPerformance = categories.map((cat) => {
    const sold = cat.products.reduce((a, b) => a + b.soldCount, 0);
    const stock = cat.products.reduce((a, b) => a + b.stockQuantity, 0);
    return {
      name: cat.name,
      sold,
      stock,
    };
  });

  return (
    <ReportsAdminClient
      summary={{
        grossRevenue,
        totalCost,
        netProfit,
        totalOrders: orders.length,
        totalRefunded,
        inventoryValuation: products.reduce(
          (acc, p) => acc + Number(p.costPrice) * p.stockQuantity,
          0
        ),
      }}
      topProducts={products.map((p) => ({
        id: p.id,
        title: p.title,
        sku: p.sku,
        categoryName: p.category.name,
        soldCount: p.soldCount,
        stockQuantity: p.stockQuantity,
        revenue: p.soldCount * Number(p.salePrice ?? p.regularPrice),
      }))}
      categoryPerformance={categoryPerformance}
    />
  );
}
