import React from 'react';
import { redirect } from 'next/navigation';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { ReportsAdminClient } from '@/components/admin/reports-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, 'reports.view')) {
    redirect('/admin');
  }

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

  // Real units sold + revenue per product, derived from OrderItem rows of
  // non-cancelled orders. (Product.soldCount is seeded demo data and is
  // not reconciled with orders, so it must not feed the reports.)
  const soldByProduct = new Map<string, { units: number; revenue: number }>();
  for (const o of validOrders) {
    for (const it of o.items) {
      const entry = soldByProduct.get(it.productId) ?? { units: 0, revenue: 0 };
      entry.units += it.quantity;
      entry.revenue += Number(it.totalPrice);
      soldByProduct.set(it.productId, entry);
    }
  }

  const categoryPerformance = categories.map((cat) => {
    const sold = cat.products.reduce(
      (a, b) => a + (soldByProduct.get(b.id)?.units ?? 0),
      0
    );
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
      topProducts={products
        .map((p) => ({
          id: p.id,
          title: p.title,
          sku: p.sku,
          categoryName: p.category.name,
          soldCount: soldByProduct.get(p.id)?.units ?? 0,
          stockQuantity: p.stockQuantity,
          revenue: soldByProduct.get(p.id)?.revenue ?? 0,
        }))
        .sort((a, b) => b.soldCount - a.soldCount)}
      categoryPerformance={categoryPerformance}
    />
  );
}
