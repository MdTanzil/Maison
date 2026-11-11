import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { CategoriesAdminClient } from '@/components/admin/categories-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await ensureDatabaseReady();
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      include: {
        parent: true,
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <CategoriesAdminClient
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        parentId: c.parentId,
        parentName: c.parent?.name || null,
        isActive: c.isActive,
        productCount: c._count.products,
      }))}
      brands={brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description || '',
        isActive: b.isActive,
        productCount: b._count.products,
      }))}
    />
  );
}
