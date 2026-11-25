import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Award,
  Star,
  Tag,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { ProductCard, ProductCardProps } from '@/components/storefront/product-card';
import { NewsletterForm } from '@/components/storefront/newsletter-form';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await ensureDatabaseReady();

  const [categories, products, coupons, reviews] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: 4,
    }),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.review.findMany({
      where: { isApproved: true },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ]);

  const toCardProps = (p: (typeof products)[number]): ProductCardProps => ({
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
  });

  const featuredProducts = products.filter((p) => p.isFeatured).map(toCardProps);
  const bestSellingProducts = products
    .slice()
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 4)
    .map(toCardProps);
  const newArrivals = products.filter((p) => p.isNewArrival).slice(0, 4).map(toCardProps);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner — Beige-Led Luxury */}
      <section className="relative overflow-hidden border-b border-[#E8E0D9] bg-[#F5F1EE]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#C8D9E6]/80 px-3.5 py-1.5 text-xs font-semibold text-[#2F4156]">
                <Sparkles className="h-3.5 w-3.5 text-[#567C8D]" />
                <span>AUTUMN / WINTER ATELIER ARCHIVE</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#2F4156] leading-[1.12]">
                Quiet Luxury, Crafted for Enduring Living.
              </h1>

              <p className="text-base sm:text-lg text-[#52606D] max-w-xl leading-relaxed">
                Explore unstructured Belgian flax tailoring, full-grain vegetable-tanned leather goods, and tactile ceramic sanctuary pieces in our signature warm palette.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#567C8D] px-7 py-3.5 text-sm font-medium text-white hover:bg-[#486878] transition-all shadow-sm"
                >
                  <span>Explore the Collection</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/shop?category=apparel-tailoring"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E8E0D9] bg-white px-6 py-3.5 text-sm font-medium text-[#2F4156] hover:border-[#567C8D] transition-all"
                >
                  <span>Belgian Linen Edit</span>
                </Link>
              </div>

              {/* Trust Highlights */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4 pt-6 border-t border-[#E8E0D9]">
                <div className="rounded-xl bg-white p-3 sm:p-3.5 border border-[#E8E0D9]">
                  <p className="text-lg font-bold text-[#2F4156]">100%</p>
                  <p className="text-xs text-[#52606D]">Certified Natural Fibers</p>
                </div>
                <div className="rounded-xl bg-white p-3 sm:p-3.5 border border-[#E8E0D9]">
                  <p className="text-lg font-bold text-[#2F4156]">24–48h</p>
                  <p className="text-xs text-[#52606D]">Concierge Dispatch</p>
                </div>
                <div className="rounded-xl bg-white p-3 sm:p-3.5 border border-[#E8E0D9]">
                  <p className="text-lg font-bold text-[#2F4156]">4.9 ★</p>
                  <p className="text-xs text-[#52606D]">Verified Patron Rating</p>
                </div>
              </div>
            </div>

            {/* Hero Editorial Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-[#E8E0D9] bg-white p-3 shadow-luxury-md">
                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#F5F1EE]">
                  <img
                    src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85"
                    alt="Maison Beige Editorial Look"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 px-2 py-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#567C8D]">
                      Featured Look 01
                    </p>
                    <p className="text-sm font-semibold text-[#2F4156]">
                      The Siena Linen Blazer &amp; Palazzo Tote
                    </p>
                  </div>
                  <Link
                    href="/product/siena-unstructured-belgian-linen-blazer"
                    className="shrink-0 rounded-lg bg-[#F5F1EE] px-3 py-1.5 text-xs font-medium text-[#2F4156] hover:bg-[#C8D9E6] transition-colors"
                  >
                    View Piece
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
              Curated Departments
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
              Shop by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#567C8D] hover:underline"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-[#E8E0D9] bg-white shadow-luxury hover:shadow-luxury-md transition-all"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5F1EE]">
                <img
                  src={
                    cat.imageUrl ||
                    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80'
                  }
                  alt={cat.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#2F4156] group-hover:text-[#567C8D] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#52606D] line-clamp-1 mt-0.5">
                    {cat.description}
                  </p>
                </div>
                <span className="rounded-full bg-[#F5F1EE] p-2 text-[#567C8D] group-hover:bg-[#567C8D] group-hover:text-white transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
              Signature Selection
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
              Featured Atelier Pieces
            </h2>
          </div>
          <Link
            href="/shop?featured=true"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#567C8D] hover:underline"
          >
            <span>View All Featured</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(featuredProducts.length > 0 ? featuredProducts : bestSellingProducts)
            .slice(0, 4)
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      </section>

      {/* Promotional Offers & Active Coupons Strip */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-10 shadow-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C8D9E6] px-3 py-1 text-xs font-semibold text-[#2F4156]">
                <Tag className="h-3.5 w-3.5 text-[#567C8D]" />
                <span>Seasonal Privilege Privileges</span>
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156]">
                Active Atelier Privileges &amp; Voucher Codes
              </h2>
              <p className="text-sm text-[#52606D]">
                Apply these verified promotional codes directly in your shopping bag or checkout for instant privilege savings.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-white border border-[#E8E0D9] px-2.5 py-1 font-mono text-xs font-bold text-[#567C8D]">
                        {c.code}
                      </span>
                      <span className="text-xs font-semibold text-[#2F4156]">
                        {c.discountType === 'PERCENTAGE'
                          ? `${Number(c.discountValue)}% OFF`
                          : `৳${Number(c.discountValue)} OFF`}
                      </span>
                    </div>
                    <p className="text-xs text-[#52606D] mt-2.5 leading-relaxed">
                      {c.description || `Valid on orders above ৳${Number(c.minOrderAmount)}`}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#E8E0D9] flex items-center justify-between text-[11px] text-[#52606D]">
                    <span>Min: ৳{Number(c.minOrderAmount).toLocaleString()}</span>
                    <Link href="/shop" className="font-medium text-[#567C8D] hover:underline">
                      Shop Now →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Best Selling & New Arrivals Split */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
                Most Coveted
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
                Best-Selling Creations
              </h2>
            </div>
            <Link
              href="/shop?sort=popular"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#567C8D] hover:underline"
            >
              <span>Explore Best Sellers</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {newArrivals.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
                  Just Landed
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
                  New Arrivals
                </h2>
              </div>
              <Link
                href="/shop?sort=newest"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#567C8D] hover:underline"
              >
                <span>View All New Arrivals</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Customer Reviews Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Client Testimonials
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Reflections from Our Patrons
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-xl border border-[#E8E0D9] bg-white p-5 shadow-luxury flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-[#567C8D] mb-2">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-[#2F4156]">
                  {rev.title || 'Exceptional Quality'}
                </p>
                <p className="text-xs text-[#52606D] mt-2 leading-relaxed">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E8E0D9] flex items-center justify-between text-xs">
                <span className="font-medium text-[#2F4156]">{rev.customerName}</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <NewsletterForm />
      </section>
    </div>
  );
}
