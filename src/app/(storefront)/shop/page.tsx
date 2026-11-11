import React from 'react';
import Link from 'next/link';
import { SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { ProductCard } from '@/components/storefront/product-card';

export const dynamic = 'force-dynamic';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: string;
    featured?: string;
  }>;
}) {
  await ensureDatabaseReady();
  const params = await searchParams;

  const [categories, brands, allProducts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let filtered = allProducts.filter((p) => {
    const effectivePrice = Number(p.salePrice ?? p.regularPrice);

    if (params.q) {
      const q = params.q.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (params.category && p.category.slug !== params.category) {
      return false;
    }

    if (params.brand && p.brand?.slug !== params.brand) {
      return false;
    }

    if (params.minPrice && effectivePrice < Number(params.minPrice)) {
      return false;
    }

    if (params.maxPrice && effectivePrice > Number(params.maxPrice)) {
      return false;
    }

    if (params.inStock === 'true' && p.stockQuantity <= 0) {
      return false;
    }

    if (params.featured === 'true' && !p.isFeatured) {
      return false;
    }

    return true;
  });

  const sort = params.sort || 'newest';
  if (sort === 'price_asc') {
    filtered = filtered.sort(
      (a, b) => Number(a.salePrice ?? a.regularPrice) - Number(b.salePrice ?? b.regularPrice)
    );
  } else if (sort === 'price_desc') {
    filtered = filtered.sort(
      (a, b) => Number(b.salePrice ?? b.regularPrice) - Number(a.salePrice ?? a.regularPrice)
    );
  } else if (sort === 'popular') {
    filtered = filtered.sort((a, b) => b.soldCount - a.soldCount);
  } else if (sort === 'rating') {
    filtered = filtered.sort((a, b) => Number(b.ratingAverage) - Number(a.ratingAverage));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 mb-8 shadow-luxury">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
              Maison Beige Archive
            </span>
            <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
              {params.category
                ? categories.find((c) => c.slug === params.category)?.name || 'Curated Collection'
                : 'All Curated Collections'}
            </h1>
            <p className="text-sm text-[#52606D] mt-1">
              Showing {filtered.length} of {allProducts.length} handcrafted pieces
            </p>
          </div>

          {/* Quick Sort Bar */}
          <form method="GET" action="/shop" className="flex flex-wrap items-center gap-2.5">
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
            {params.brand && <input type="hidden" name="brand" value={params.brand} />}
            {params.q && <input type="hidden" name="q" value={params.q} />}
            <select
              name="sort"
              defaultValue={sort}
              aria-label="Sort products"
              className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-xs font-medium text-[#2F4156] focus:outline-none focus:border-[#567C8D]"
            >
              <option value="newest">Sort: Newest Arrivals</option>
              <option value="popular">Sort: Best Selling</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[#567C8D] px-4 py-2 text-xs font-medium text-white hover:bg-[#486878]"
            >
              Apply Sort
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          <form
            method="GET"
            action="/shop"
            className="rounded-xl border border-[#E8E0D9] bg-white p-5 shadow-luxury space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E8E0D9] pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
                <SlidersHorizontal className="h-4 w-4 text-[#567C8D]" />
                <span>Refine Collection</span>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#567C8D] hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Link>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-2">
                Keyword or SKU
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q || ''}
                  placeholder="Linen, Tote, MB-APR..."
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] pl-3 pr-8 py-2 text-xs text-[#1F2933]"
                />
                <Search className="h-3.5 w-3.5 text-[#8A949E] absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-2">
                Department
              </label>
              <select
                name="category"
                defaultValue={params.category || ''}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs text-[#2F4156]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-2">
                Atelier Brand
              </label>
              <select
                name="brand"
                defaultValue={params.brand || ''}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs text-[#2F4156]"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-2">
                Price Range (৳)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="minPrice"
                  defaultValue={params.minPrice || ''}
                  placeholder="Min ৳"
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  name="maxPrice"
                  defaultValue={params.maxPrice || ''}
                  placeholder="Max ৳"
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Availability */}
            <label className="flex items-center gap-2 text-xs font-medium text-[#2F4156] cursor-pointer">
              <input
                type="checkbox"
                name="inStock"
                value="true"
                defaultChecked={params.inStock === 'true'}
                className="rounded border-[#E8E0D9] text-[#567C8D] focus:ring-[#567C8D]"
              />
              <span>In-Stock Pieces Only</span>
            </label>

            <input type="hidden" name="sort" value={sort} />

            <button
              type="submit"
              className="w-full rounded-lg bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878] transition-colors"
            >
              Apply Filters
            </button>
          </form>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#E8E0D9] bg-white p-12 text-center shadow-luxury">
              <h3 className="text-lg font-semibold text-[#2F4156]">
                No matching pieces found
              </h3>
              <p className="text-sm text-[#52606D] mt-1">
                Try clearing your price or category filters to explore our full catalog.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#567C8D] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#486878]"
              >
                Reset All Filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((p) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
