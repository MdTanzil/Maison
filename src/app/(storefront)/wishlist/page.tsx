import React from 'react';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { WishlistClientGrid } from '@/components/storefront/wishlist-client';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  await ensureDatabaseReady();
  const products = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
  });

  const mapped = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    regularPrice: Number(p.regularPrice),
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    imageUrl:
      p.images[0]?.url ||
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
    categoryName: p.category.name,
    ratingAverage: Number(p.ratingAverage),
    ratingCount: p.ratingCount,
    stockQuantity: p.stockQuantity,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    defaultVariantId: p.variants[0]?.id ?? null,
    defaultVariantTitle: p.variants[0]?.title ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Personal Archive
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
            Saved Wishlist
          </h1>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#567C8D] hover:underline"
        >
          <span>Explore More Pieces</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <WishlistClientGrid allProducts={mapped} />
    </div>
  );
}
