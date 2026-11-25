'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ShoppingBag,
  Zap,
  Star,
  CheckCircle2,
  Truck,
  ShieldCheck,
  RefreshCw,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useStore } from './store-provider';
import { formatCurrency } from '@/lib/utils';
import { submitProductReviewAction } from '@/actions/catalog-actions';

export interface ProductDetailVariant {
  id: string;
  sku: string;
  title: string;
  size?: string | null;
  color?: string | null;
  colorHex?: string | null;
  regularPrice: number;
  salePrice?: number | null;
  stockQuantity: number;
}

export interface ProductDetailReview {
  id: string;
  customerName: string;
  rating: number;
  title?: string | null;
  comment: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
}

export function ProductDetailClient({
  product,
  isSignedIn,
}: {
  isSignedIn: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    sku: string;
    barcode?: string | null;
    shortDescription?: string | null;
    description: string;
    regularPrice: number;
    salePrice?: number | null;
    stockQuantity: number;
    categoryName: string;
    categorySlug: string;
    brandName?: string | null;
    ratingAverage: number;
    ratingCount: number;
    images: string[];
    specifications: Record<string, string>;
    variants: ProductDetailVariant[];
    reviews: ProductDetailReview[];
  };
}) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist, showToast } = useStore();
  const [selectedImage, setSelectedImage] = useState(product.images[0] || '');
  const [zoomed, setZoomed] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductDetailVariant | null>(
    product.variants[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [wishing, setWishing] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const effectivePrice =
    selectedVariant?.salePrice ??
    selectedVariant?.regularPrice ??
    product.salePrice ??
    product.regularPrice;

  const regularPrice = selectedVariant?.regularPrice ?? product.regularPrice;
  const currentStock = selectedVariant
    ? selectedVariant.stockQuantity
    : product.stockQuantity;
  const wished = isInWishlist(product.id);

  const handleAdd = () => {
    if (currentStock <= 0) return;
    addToCart({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      title: product.title,
      variantTitle: selectedVariant?.title ?? 'Standard',
      sku: selectedVariant?.sku ?? product.sku,
      slug: product.slug,
      price: effectivePrice,
      regularPrice,
      imageUrl: product.images[0],
      quantity,
      maxStock: currentStock,
    });
    // Brief visible feedback for the instant local add-to-bag action.
    setAdding(true);
    setTimeout(() => setAdding(false), 600);
  };

  const handleWishlist = () => {
    setWishing(true);
    toggleWishlist(product.id, product.title);
    setTimeout(() => setWishing(false), 500);
  };

  const handleBuyNow = () => {
    if (currentStock <= 0) return;
    handleAdd();
    setBuying(true);
    router.push('/checkout');
    // Safety: clear the spinner if navigation does not happen.
    setTimeout(() => setBuying(false), 5000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    const res = await submitProductReviewAction({
      productId: product.id,
      rating: reviewRating,
      title: reviewTitle,
      comment: reviewComment,
    });
    setSubmittingReview(false);
    if (!res.ok) {
      showToast('Review Error', res.error, 'error');
      return;
    }
    showToast('Review Published', 'Thank you for sharing your feedback.', 'success');
    setReviewTitle('');
    setReviewComment('');
    router.refresh();
  };

  return (
    <div className="space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Image Gallery with Zoom */}
        <div className="lg:col-span-6 space-y-4">
          <div
            onClick={() => setZoomed(!zoomed)}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-[#E8E0D9] bg-white cursor-zoom-in shadow-luxury"
          >
            <img
              src={selectedImage}
              alt={product.title}
              className={`h-full w-full object-cover transition-transform duration-500 ${
                zoomed ? 'scale-125 cursor-zoom-out' : 'scale-100'
              }`}
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-[#2F4156] border border-[#E8E0D9]">
              {zoomed ? 'Click to Reset Zoom' : 'Click Image to Zoom'}
            </span>
          </div>

          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`relative h-20 w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img
                      ? 'border-[#567C8D] shadow-sm'
                      : 'border-[#E8E0D9] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Panel */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#52606D]">
              <span className="uppercase tracking-wider font-semibold text-[#567C8D]">
                {product.brandName || 'Maison Beige Atelier'} • {product.categoryName}
              </span>
              <span>SKU: {selectedVariant?.sku || product.sku}</span>
            </div>

            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156]">
                {product.title}
              </h1>
              {product.shortDescription && (
                <p className="text-sm text-[#52606D] mt-2 leading-relaxed">
                  {product.shortDescription}
                </p>
              )}
            </div>

            {/* Rating & Stock Badge */}
            <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-[#E8E0D9]">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F4156]">
                <Star className="h-4 w-4 fill-[#567C8D] text-[#567C8D]" />
                <span className="font-bold">{product.ratingAverage.toFixed(1)}</span>
                <span className="text-[#52606D]">({product.reviews.length} Reviews)</span>
              </div>

              {currentStock > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>In Stock ({currentStock} available)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-0.5 text-xs font-medium text-rose-800">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Price Display */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-[#2F4156]">
                {formatCurrency(effectivePrice)}
              </span>
              {effectivePrice < regularPrice && (
                <>
                  <span className="text-base text-[#8A949E] line-through">
                    {formatCurrency(regularPrice)}
                  </span>
                  <span className="rounded-full bg-[#C8D9E6] px-2.5 py-0.5 text-xs font-semibold text-[#2F4156]">
                    Save {formatCurrency(regularPrice - effectivePrice)}
                  </span>
                </>
              )}
            </div>

            {/* Variant Selection */}
            {product.variants.length > 0 && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2F4156]">
                  Select Variant / Size &amp; Shade
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariant(v);
                          setQuantity(1);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-[#567C8D] bg-[#567C8D] text-white shadow-sm'
                            : 'border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156] hover:border-[#567C8D]'
                        }`}
                      >
                        {v.colorHex && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/15"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <span>{v.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity & CTA Buttons */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2F4156]">
                  Quantity
                </span>
                <div className="inline-flex items-center rounded-xl border border-[#E8E0D9] bg-[#F5F1EE]">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2.5 text-[#2F4156] hover:text-[#567C8D]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-4 text-sm font-semibold text-[#2F4156]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(Math.max(1, currentStock), quantity + 1))}
                    className="p-2.5 text-[#2F4156] hover:text-[#567C8D]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={currentStock <= 0 || adding}
                  onClick={handleAdd}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#567C8D] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#486878] disabled:opacity-50 transition-colors"
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  <span>{adding ? 'Adding...' : 'Add to Shopping Bag'}</span>
                </button>
                <button
                  type="button"
                  disabled={currentStock <= 0 || buying}
                  onClick={handleBuyNow}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#567C8D] bg-[#C8D9E6]/60 px-6 py-3.5 text-sm font-semibold text-[#2F4156] hover:bg-[#C8D9E6] disabled:opacity-50 transition-colors"
                >
                  {buying ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#567C8D]" />
                  ) : (
                    <Zap className="h-4 w-4 text-[#567C8D]" />
                  )}
                  <span>{buying ? 'Going to Checkout...' : 'Buy It Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleWishlist}
                  disabled={wishing}
                  aria-label="Save to Wishlist"
                  className={`inline-flex items-center justify-center rounded-xl border px-4 py-3.5 transition-colors ${
                    wished
                      ? 'border-[#567C8D] bg-[#567C8D] text-white'
                      : 'border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156] hover:border-[#567C8D]'
                  }`}
                >
                  {wishing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className={`h-5 w-5 ${wished ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Description & Specifications */}
            <div className="space-y-4 pt-4 border-t border-[#E8E0D9]">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-2">
                  Atelier Notes &amp; Craftsmanship
                </h3>
                <p className="text-sm text-[#52606D] leading-relaxed">
                  {product.description}
                </p>
              </div>

              {Object.keys(product.specifications).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-2">
                    Specifications
                  </h3>
                  <div className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] divide-y divide-[#E8E0D9]">
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-4 px-4 py-2 text-xs"
                      >
                        <span className="font-medium text-[#52606D]">{key}</span>
                        <span className="font-semibold text-[#2F4156] text-right">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-[#52606D]">
                <div className="flex items-center gap-2 rounded-lg bg-[#F5F1EE] p-3">
                  <Truck className="h-4 w-4 text-[#567C8D] shrink-0" />
                  <span>Dhaka 24–48h Express</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[#F5F1EE] p-3">
                  <RefreshCw className="h-4 w-4 text-[#567C8D] shrink-0" />
                  <span>7-Day Easy Exchange</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[#F5F1EE] p-3">
                  <ShieldCheck className="h-4 w-4 text-[#567C8D] shrink-0" />
                  <span>Official Tax Invoice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews & Submit Review Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-5">
          <h2 className="font-serif text-2xl font-semibold text-[#2F4156]">
            Patron Reviews ({product.reviews.length})
          </h2>

          {product.reviews.length === 0 ? (
            <p className="text-sm text-[#52606D]">
              No reviews yet. Be the first patron to review this piece.
            </p>
          ) : (
            <div className="space-y-4 divide-y divide-[#E8E0D9]">
              {product.reviews.map((r) => (
                <div key={r.id} className="pt-4 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-[#2F4156] truncate">
                        {r.customerName}
                      </span>
                      {r.isVerifiedPurchase && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shrink-0">
                          Verified Purchase
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 text-[#567C8D] shrink-0">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  {r.title && (
                    <p className="text-xs font-semibold text-[#2F4156] mt-1">{r.title}</p>
                  )}
                  <p className="text-xs text-[#52606D] mt-1 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury">
          <h3 className="font-serif text-xl font-semibold text-[#2F4156] mb-1">
            Write a Client Review
          </h3>
          <p className="text-xs text-[#52606D] mb-5">
            Share your impressions of the material, fit, and finishing.
          </p>

          {isSignedIn ? (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Rating
              </label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm text-[#2F4156]"
              >
                <option value={5}>5 Stars — Exceptional</option>
                <option value={4}>4 Stars — Very Good</option>
                <option value={3}>3 Stars — Satisfactory</option>
                <option value={2}>2 Stars — Below Expectations</option>
                <option value={1}>1 Star — Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Review Headline
              </label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Detailed Review
              </label>
              <textarea
                rows={3}
                required
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How does this piece look and feel?"
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
            </div>

            <LoadingButton
              type="submit"
              loading={submittingReview}
              loadingText="Submitting..."
              className="h-auto w-full rounded-xl bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
            >
              Publish Review
            </LoadingButton>
            </form>
          ) : (
            <div className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-5 text-center space-y-3">
              <p className="text-sm text-[#52606D]">
                Sign in to share your experience with this piece.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#567C8D] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
