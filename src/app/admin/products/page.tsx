import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { ProductsAdminClient } from '@/components/admin/products-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;
  if (!user || !hasPermission(user, 'products.view')) {
    redirect('/admin');
  }

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const canViewCost = hasPermission(user, 'products.cost_view');

  return (
    <ProductsAdminClient
      canCreate={hasPermission(user, 'products.create')}
      canEdit={hasPermission(user, 'products.edit')}
      canDelete={hasPermission(user, 'products.delete')}
      canViewCost={canViewCost}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      products={products.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        barcode: p.barcode,
        shortDescription: p.shortDescription,
        description: p.description,
        regularPrice: Number(p.regularPrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        costPrice: canViewCost ? Number(p.costPrice) : 0,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        brandId: p.brandId,
        brandName: p.brand?.name || 'Maison Beige',
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        status: p.status,
        isFeatured: p.isFeatured,
        isNewArrival: p.isNewArrival,
        isBestSeller: p.isBestSeller,
        imageUrl:
          p.images[0]?.url ||
          'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
        secondaryImageUrl: p.images[1]?.url || '',
        variantCount: p.variants.length,
        soldCount: p.soldCount,
      }))}
    />
  );
}
