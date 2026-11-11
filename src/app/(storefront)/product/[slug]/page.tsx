import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { ProductDetailClient } from '@/components/storefront/product-detail-client';
import { ProductCard } from '@/components/storefront/product-card';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureDatabaseReady();
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true } },
      reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' } },
    },
  });

  if (!product) {
    notFound();
  }

  const relatedProducts = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
    take: 4,
  });

  const specs =
    product.specifications && typeof product.specifications === 'object'
      ? (product.specifications as Record<string, string>)
      : {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#52606D]">
        <Link href="/" className="hover:text-[#567C8D]">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-[#567C8D]">
          Shop
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/shop?category=${product.category.slug}`}
          className="hover:text-[#567C8D]"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-[#2F4156] truncate max-w-[220px]">
          {product.title}
        </span>
      </nav>

      <ProductDetailClient
        product={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          sku: product.sku,
          barcode: product.barcode,
          shortDescription: product.shortDescription,
          description: product.description,
          regularPrice: Number(product.regularPrice),
          salePrice: product.salePrice ? Number(product.salePrice) : null,
          stockQuantity: product.stockQuantity,
          categoryName: product.category.name,
          categorySlug: product.category.slug,
          brandName: product.brand?.name ?? null,
          ratingAverage: Number(product.ratingAverage),
          ratingCount: product.ratingCount,
          images:
            product.images.length > 0
              ? product.images.map((i) => i.url)
              : [
                  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
                ],
          specifications: specs,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            title: v.title,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            regularPrice: Number(v.regularPrice),
            salePrice: v.salePrice ? Number(v.salePrice) : null,
            stockQuantity: v.stockQuantity,
          })),
          reviews: product.reviews.map((r) => ({
            id: r.id,
            customerName: r.customerName,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
          })),
        }}
      />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-[#E8E0D9]">
          <h2 className="font-serif text-2xl font-semibold text-[#2F4156] mb-6">
            Complementary Atelier Pieces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={{
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
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
