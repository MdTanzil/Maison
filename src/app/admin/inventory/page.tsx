import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { InventoryAdminClient } from '@/components/admin/inventory-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;
  if (!user || !hasPermission(user, 'inventory.view')) {
    redirect('/admin');
  }

  const [products, transactions] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        inventory: true,
        variants: true,
      },
      orderBy: { stockQuantity: 'asc' },
    }),
    prisma.inventoryTransaction.findMany({
      include: {
        product: true,
        variant: true,
        performedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <InventoryAdminClient
      canManage={hasPermission(user, 'inventory.manage')}
      products={products.map((p) => ({
        id: p.id,
        title: p.title,
        sku: p.sku,
        categoryName: p.category.name,
        stockQuantity: p.stockQuantity,
        reservedStock: p.inventory?.reservedStock ?? 0,
        lowStockThreshold: p.lowStockThreshold,
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          title: v.title,
          stockQuantity: v.stockQuantity,
        })),
      }))}
      transactions={transactions.map((tx) => ({
        id: tx.id,
        productTitle: tx.product.title,
        sku: tx.variant?.sku || tx.product.sku,
        type: tx.type,
        quantity: tx.quantity,
        previousStock: tx.previousStock,
        newStock: tx.newStock,
        reason: tx.reason,
        referenceId: tx.referenceId,
        performedByName: tx.performedBy?.name || 'System / Customer',
        createdAt: tx.createdAt.toISOString(),
      }))}
    />
  );
}
