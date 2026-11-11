'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/components/storefront/store-provider';
import { formatCurrency } from '@/lib/utils';
import { validateCouponServerAction } from '@/actions/order-actions';

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotal,
    appliedCoupon,
    setAppliedCoupon,
    showToast,
  } = useStore();
  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || '');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setValidatingCoupon(true);
    const res = await validateCouponServerAction({
      code,
      subtotal,
      productIds: cart.map((i) => i.productId),
    });
    setValidatingCoupon(false);

    if (!res.ok || !res.coupon) {
      showToast('Coupon Not Applied', res.error, 'error');
      return;
    }

    setAppliedCoupon({
      code: res.coupon.code,
      discountType: res.coupon.discountType,
      discountValue: res.coupon.discountValue,
      discountAmount: res.coupon.discountAmount,
      description: res.coupon.description,
    });
    setCouponInput(res.coupon.code);
    showToast(
      `Coupon ${res.coupon.code} Applied`,
      `Saved ${formatCurrency(res.coupon.discountAmount)} on your order`,
      'success'
    );
  };

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const estimatedShipping = subtotal - discount >= 10000 ? 0 : 80;
  const finalPayable = Math.max(0, subtotal - discount + estimatedShipping);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-12 shadow-luxury space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F1EE] text-[#567C8D]">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156]">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-sm text-[#52606D] max-w-md mx-auto">
            Explore our Belgian linen tailoring, full-grain leather totes, and stoneware vessels to curate your bag.
          </p>
          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-[#567C8D] px-6 py-3 text-sm font-medium text-white hover:bg-[#486878]"
            >
              <span>Discover the Collection</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          Your Selection
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
          Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)} Pieces)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cart Items Table */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variantId || 'std'}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#E8E0D9] bg-white p-4 sm:p-5 shadow-luxury"
            >
              <div className="flex items-center gap-4">
                <Link
                  href={`/product/${item.slug}`}
                  className="h-24 w-20 rounded-lg overflow-hidden bg-[#F5F1EE] border border-[#E8E0D9] shrink-0"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </Link>
                <div>
                  <Link
                    href={`/product/${item.slug}`}
                    className="text-base font-semibold text-[#2F4156] hover:text-[#567C8D]"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-[#52606D] mt-0.5">
                    Variant: {item.variantTitle || 'Standard'} • SKU: {item.sku}
                  </p>
                  <p className="text-sm font-bold text-[#2F4156] mt-1.5">
                    {formatCurrency(item.price)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E8E0D9]">
                <div className="inline-flex items-center rounded-lg border border-[#E8E0D9] bg-[#F5F1EE]">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.variantId, item.quantity - 1)
                    }
                    className="p-2 text-[#2F4156] hover:text-[#567C8D]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-3 text-xs font-semibold text-[#2F4156]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.variantId, item.quantity + 1)
                    }
                    className="p-2 text-[#2F4156] hover:text-[#567C8D]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[95px]">
                  <p className="text-sm font-bold text-[#2F4156]">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId, item.variantId)}
                  className="rounded-lg p-2 text-[#8A949E] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Coupon Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-5">
            <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
              Order Summary
            </h2>

            {/* Coupon Input */}
            <div className="space-y-2 pt-2 border-t border-[#E8E0D9]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2F4156]">
                Privilege Voucher / Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="e.g. LUXURY10"
                  className="flex-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs font-mono uppercase text-[#2F4156]"
                />
                <button
                  type="button"
                  disabled={validatingCoupon}
                  onClick={() => handleApplyCoupon()}
                  className="rounded-lg bg-[#567C8D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#486878]"
                >
                  {validatingCoupon ? '...' : 'Apply'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {['LUXURY10', 'WELCOME500', 'ATELIER15'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleApplyCoupon(c)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E8E0D9] bg-[#F5F1EE] px-2 py-1 text-[11px] font-mono text-[#567C8D] hover:bg-[#C8D9E6]/50"
                  >
                    <Tag className="h-3 w-3" />
                    {c}
                  </button>
                ))}
              </div>

              {appliedCoupon && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {appliedCoupon.code} (-{formatCurrency(appliedCoupon.discountAmount)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-2.5 border-t border-[#E8E0D9] pt-4 text-sm">
              <div className="flex justify-between text-[#52606D]">
                <span>Subtotal</span>
                <span className="font-medium text-[#2F4156]">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Privilege Discount</span>
                  <span className="font-medium">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#52606D]">
                <span>Estimated Delivery</span>
                <span className="font-medium text-[#2F4156]">
                  {estimatedShipping === 0
                    ? 'Complimentary'
                    : formatCurrency(estimatedShipping)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E8E0D9] pt-3 text-base font-bold text-[#2F4156]">
                <span>Total Payable</span>
                <span>{formatCurrency(finalPayable)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#567C8D] py-3.5 text-sm font-semibold text-white hover:bg-[#486878] transition-colors shadow-sm"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="flex items-center justify-center gap-2 text-xs text-[#52606D]">
              <ShieldCheck className="h-4 w-4 text-[#567C8D]" />
              <span>Stock validated &amp; protected at checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
