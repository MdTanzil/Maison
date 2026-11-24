'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Star, Zap, Loader2 } from 'lucide-react';
import { useStore } from './store-provider';
import { formatCurrency } from '@/lib/utils';

export interface ProductCardProps {
  id: string;
  title: string;
  slug: string;
  sku: string;
  regularPrice: number;
  salePrice?: number | null;
  imageUrl: string;
  categoryName: string;
  ratingAverage?: number;
  ratingCount?: number;
  stockQuantity: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  defaultVariantId?: string | null;
  defaultVariantTitle?: string | null;
}

export function ProductCard({ product }: { product: ProductCardProps }) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const wished = isInWishlist(product.id);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [wishing, setWishing] = useState(false);
  const effectivePrice = product.salePrice ?? product.regularPrice;
  const hasDiscount =
    product.salePrice !== null &&
    product.salePrice !== undefined &&
    product.salePrice < product.regularPrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.regularPrice - (product.salePrice ?? product.regularPrice)) /
          product.regularPrice) *
          100
      )
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stockQuantity <= 0) return;
    addToCart({
      productId: product.id,
      variantId: product.defaultVariantId ?? null,
      title: product.title,
      variantTitle: product.defaultVariantTitle ?? 'Standard',
      sku: product.sku,
      slug: product.slug,
      price: effectivePrice,
      regularPrice: product.regularPrice,
      imageUrl: product.imageUrl,
      quantity: 1,
      maxStock: product.stockQuantity,
    });
    // Brief visible feedback for the instant local add-to-bag action.
    setAdding(true);
    setTimeout(() => setAdding(false), 600);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    setWishing(true);
    toggleWishlist(product.id, product.title);
    setTimeout(() => setWishing(false), 500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stockQuantity <= 0) return;
    addToCart({
      productId: product.id,
      variantId: product.defaultVariantId ?? null,
      title: product.title,
      variantTitle: product.defaultVariantTitle ?? 'Standard',
      sku: product.sku,
      slug: product.slug,
      price: effectivePrice,
      regularPrice: product.regularPrice,
      imageUrl: product.imageUrl,
      quantity: 1,
      maxStock: product.stockQuantity,
    });
    setBuying(true);
    router.push('/checkout');
    // Safety: clear the spinner if navigation does not happen.
    setTimeout(() => setBuying(false), 5000);
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-[#E8E0D9] bg-white overflow-hidden shadow-luxury hover:shadow-luxury-md transition-all duration-300">
      {/* Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F5F1EE]">
        <Link href={`/product/${product.slug}`} className="block h-full w-full">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="rounded-full bg-[#C8D9E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#2F4156]">
              -{discountPercent}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="rounded-full bg-white/90 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-[#2F4156] border border-[#E8E0D9]">
              New Arrival
            </span>
          )}
          {product.stockQuantity <= 0 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishing}
          aria-label="Toggle Wishlist"
          className={`absolute top-3 right-3 rounded-full p-2 transition-colors border ${
            wished
              ? 'bg-[#567C8D] text-white border-[#567C8D]'
              : 'bg-white/90 text-[#2F4156] border-[#E8E0D9] hover:bg-white'
          }`}
        >
          {wishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#52606D] mb-1">
            <span className="uppercase tracking-wider">{product.categoryName}</span>
            <span className="inline-flex items-center gap-1 text-[#2F4156]">
              <Star className="h-3 w-3 fill-[#567C8D] text-[#567C8D]" />
              <span>{Number(product.ratingAverage ?? 4.9).toFixed(1)}</span>
            </span>
          </div>

          <Link
            href={`/product/${product.slug}`}
            className="text-sm font-semibold text-[#2F4156] hover:text-[#567C8D] line-clamp-2 transition-colors"
          >
            {product.title}
          </Link>
        </div>

        <div className="mt-3 pt-3 border-t border-[#E8E0D9]/70">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-base font-bold text-[#2F4156]">
              {formatCurrency(effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#8A949E] line-through">
                {formatCurrency(product.regularPrice)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={product.stockQuantity <= 0 || adding}
              onClick={handleAddToCart}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#567C8D] px-3 py-2 text-xs font-medium text-white hover:bg-[#486878] disabled:opacity-50 transition-colors"
            >
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
              <span>{adding ? 'Adding...' : 'Add to Bag'}</span>
            </button>
            <button
              type="button"
              disabled={product.stockQuantity <= 0 || buying}
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs font-medium text-[#2F4156] hover:bg-[#E8E0D9] disabled:opacity-50 transition-colors"
            >
              {buying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#567C8D]" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-[#567C8D]" />
              )}
              <span>{buying ? 'Going to Checkout...' : 'Buy Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
