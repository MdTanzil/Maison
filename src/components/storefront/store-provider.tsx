'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toggleWishlistDatabaseAction } from '@/actions/catalog-actions';

export interface CartBagItem {
  productId: string;
  variantId?: string | null;
  title: string;
  variantTitle?: string | null;
  sku: string;
  slug: string;
  price: number;
  regularPrice: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
}

export interface AppliedCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  description?: string | null;
}

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  cart: CartBagItem[];
  wishlistIds: string[];
  appliedCoupon: AppliedCoupon | null;
  addToCart: (item: CartBagItem) => void;
  removeFromCart: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  clearCart: () => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  toggleWishlist: (productId: string, productTitle?: string) => void;
  isInWishlist: (productId: string) => boolean;
  subtotal: number;
  itemCount: number;
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  children,
  initialWishlistIds = [],
}: {
  children: React.ReactNode;
  initialWishlistIds?: string[];
}) {
  const [cart, setCart] = useState<CartBagItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(initialWishlistIds);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('mb_luxury_cart_v1');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      const savedWishlist = localStorage.getItem('mb_luxury_wishlist_v1');
      if (savedWishlist) {
        const parsed: string[] = JSON.parse(savedWishlist);
        setWishlistIds((prev) => Array.from(new Set([...prev, ...parsed])));
      }
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('mb_luxury_cart_v1', JSON.stringify(cart));
      localStorage.setItem('mb_luxury_wishlist_v1', JSON.stringify(wishlistIds));
    } catch {
      // ignore storage errors
    }
  }, [cart, wishlistIds, hydrated]);

  const showToast = (
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const addToCart = (item: CartBagItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (x) => x.productId === item.productId && (x.variantId || null) === (item.variantId || null)
      );
      if (idx > -1) {
        const current = prev[idx];
        const nextQty = Math.min(current.maxStock, current.quantity + item.quantity);
        const updated = [...prev];
        updated[idx] = { ...current, quantity: nextQty };
        return updated;
      }
      return [...prev, item];
    });
    showToast('Added to Shopping Bag', `${item.title} (${item.quantity}x)`, 'success');
  };

  const removeFromCart = (productId: string, variantId?: string | null) => {
    setCart((prev) =>
      prev.filter(
        (x) => !(x.productId === productId && (x.variantId || null) === (variantId || null))
      )
    );
    showToast('Removed from Bag', 'Item removed from your shopping bag.', 'info');
  };

  const updateQuantity = (
    productId: string,
    variantId: string | null | undefined,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCart((prev) =>
      prev.map((x) => {
        if (x.productId === productId && (x.variantId || null) === (variantId || null)) {
          return { ...x, quantity: Math.min(x.maxStock, quantity) };
        }
        return x;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string, productTitle?: string) => {
    const exists = wishlistIds.includes(productId);
    const next = exists
      ? wishlistIds.filter((id) => id !== productId)
      : [...wishlistIds, productId];
    setWishlistIds(next);

    toggleWishlistDatabaseAction(productId).catch(() => {
      // Guest user keeps wishlist in localStorage
    });

    showToast(
      exists ? 'Removed from Wishlist' : 'Saved to Wishlist',
      productTitle || 'Updated your curated wishlist',
      'info'
    );
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlistIds,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setAppliedCoupon,
        toggleWishlist,
        isInWishlist,
        subtotal,
        itemCount,
        showToast,
      }}
    >
      {children}
      {/* Global Toast Notification Stack */}
      <div className="no-print fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border p-4 shadow-luxury-md transition-all duration-300 bg-white ${
              t.type === 'error'
                ? 'border-rose-300 text-rose-900'
                : 'border-[#E8E0D9] text-[#2F4156]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#2F4156]">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-[#52606D] mt-0.5">{t.description}</p>
                )}
              </div>
              <span
                className={`h-2 w-2 rounded-full mt-1.5 ${
                  t.type === 'error' ? 'bg-rose-500' : 'bg-[#567C8D]'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
