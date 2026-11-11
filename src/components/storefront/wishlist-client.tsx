'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { useStore } from './store-provider';
import { ProductCard, ProductCardProps } from './product-card';

export function WishlistClientGrid({
  allProducts,
}: {
  allProducts: ProductCardProps[];
}) {
  const { wishlistIds } = useStore();
  const wishedProducts = allProducts.filter((p) => wishlistIds.includes(p.id));

  if (wishedProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-12 text-center shadow-luxury space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F1EE] text-[#567C8D]">
          <Heart className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-[#2F4156]">
          Your Wishlist is Currently Empty
        </h2>
        <p className="text-sm text-[#52606D] max-w-md mx-auto">
          Tap the heart icon on any piece in our catalog to save it here for effortless comparison and future purchase.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-xl bg-[#567C8D] px-6 py-3 text-xs font-semibold text-white hover:bg-[#486878]"
        >
          <span>Browse Collection</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {wishedProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
