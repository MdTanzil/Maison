'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Printer,
  Truck,
  CreditCard,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useStore } from '@/components/storefront/store-provider';
import { formatCurrency } from '@/lib/utils';
import { placeOrderAction, validateCouponServerAction, getCheckoutProfileAction } from '@/actions/order-actions';

export default function CheckoutPage() {
  const {
    cart,
    subtotal,
    appliedCoupon,
    setAppliedCoupon,
    clearCart,
    showToast,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddressLine, setShippingAddressLine] = useState('');
  const [shippingArea, setShippingArea] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingZone, setShippingZone] = useState<'INSIDE_CITY' | 'SUB_AREA' | 'OUTSIDE_CITY'>(
    'INSIDE_CITY'
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL' | 'BANK_TRANSFER' | 'SSLCOMMERZ' | 'STRIPE'
  >('COD');
  const [transactionRef, setTransactionRef] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || '');
  const [submitting, setSubmitting] = useState(false);

  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    trackingNumber: string;
    grandTotal: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCheckoutProfileAction().then((res) => {
      if (cancelled || !res.ok || !res.profile) return;
      const p = res.profile;
      setCustomerName((prev) => prev || p.name);
      setCustomerPhone((prev) => prev || p.phone);
      setCustomerEmail((prev) => prev || p.email);
      setShippingAddressLine((prev) => prev || p.addressLine1);
      setShippingArea((prev) => prev || p.area);
      setShippingCity((prev) => prev || p.city);
      setShippingPostalCode((prev) => prev || p.postalCode);
      if (
        p.zoneType === 'INSIDE_CITY' ||
        p.zoneType === 'SUB_AREA' ||
        p.zoneType === 'OUTSIDE_CITY'
      ) {
        setShippingZone(p.zoneType);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const baseShipping =
    shippingZone === 'OUTSIDE_CITY' ? 150 : shippingZone === 'SUB_AREA' ? 110 : 80;
  const shippingCharge = subtotal - discount >= 10000 ? 0 : baseShipping;
  const grandTotal = Math.max(0, subtotal - discount + shippingCharge);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const res = await validateCouponServerAction({
      code: couponInput,
      subtotal,
      productIds: cart.map((i) => i.productId),
    });
    if (!res.ok || !res.coupon) {
      showToast('Invalid Coupon', res.error, 'error');
      return;
    }
    setAppliedCoupon({
      code: res.coupon.code,
      discountType: res.coupon.discountType,
      discountValue: res.coupon.discountValue,
      discountAmount: res.coupon.discountAmount,
      description: res.coupon.description,
    });
    showToast('Privilege Code Applied', `Saved ${formatCurrency(res.coupon.discountAmount)}`);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Empty Bag', 'Add at least one item before placing an order.', 'error');
      return;
    }

    setSubmitting(true);
    const res = await placeOrderAction({
      customerName,
      customerPhone,
      customerEmail,
      shippingAddressLine,
      shippingArea,
      shippingCity,
      shippingPostalCode,
      shippingZone,
      paymentMethod,
      transactionRef,
      senderPhone,
      couponCode: appliedCoupon?.code || undefined,
      customerNotes,
      items: cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    });
    setSubmitting(false);

    if (!res.ok || !res.orderNumber) {
      showToast('Checkout Failed', res.error, 'error');
      return;
    }

    setConfirmedOrder({
      orderId: res.orderId!,
      orderNumber: res.orderNumber,
      trackingNumber: res.trackingNumber!,
      grandTotal,
    });
    clearCart();
    showToast('Order Confirmed!', `Order ${res.orderNumber} has been placed.`, 'success');
  };

  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-8 sm:p-10 shadow-luxury-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
              Thank You for Your Order
            </span>
            <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
              Order {confirmedOrder.orderNumber} Received
            </h1>
            <p className="text-sm text-[#52606D] mt-2">
              Your order has been logged in our atelier system and stock has been reserved.
            </p>
          </div>

          <div className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div>
              <p className="text-xs text-[#52606D]">Order Number</p>
              <p className="text-sm font-mono font-bold text-[#2F4156]">
                {confirmedOrder.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#52606D]">Courier Tracking ID</p>
              <p className="text-sm font-mono font-bold text-[#567C8D]">
                {confirmedOrder.trackingNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#52606D]">Total Payable</p>
              <p className="text-sm font-bold text-[#2F4156]">
                {formatCurrency(confirmedOrder.grandTotal)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/track-order?q=${confirmedOrder.orderNumber}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#567C8D] px-5 py-3 text-xs font-semibold text-white hover:bg-[#486878]"
            >
              <Truck className="h-4 w-4" />
              <span>Track Live Order Status</span>
            </Link>
            <Link
              href={`/admin/orders/${confirmedOrder.orderId}/print?format=a4`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E8E0D9] bg-white px-5 py-3 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D]"
            >
              <Printer className="h-4 w-4 text-[#567C8D]" />
              <span>View / Print Official Invoice</span>
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F5F1EE] px-5 py-3 text-xs font-semibold text-[#2F4156] hover:bg-[#E8E0D9]"
            >
              <span>Continue Shopping</span>
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
          Concierge Checkout
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
          Complete Your Order
        </h1>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer, Delivery & Payment */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer & Shipping Address */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#E8E0D9] pb-3">
              <MapPin className="h-5 w-5 text-[#567C8D]" />
              <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
                1. Recipient &amp; Delivery Address
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Email Address (for Invoice)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Delivery Zone *
                </label>
                <select
                  value={shippingZone}
                  onChange={(e) =>
                    setShippingZone(
                      e.target.value as 'INSIDE_CITY' | 'SUB_AREA' | 'OUTSIDE_CITY'
                    )
                  }
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-sm text-[#2F4156]"
                >
                  <option value="INSIDE_CITY">Inside Dhaka Metro (৳80)</option>
                  <option value="SUB_AREA">Dhaka Sub-Area: Savar/Gazipur (৳110)</option>
                  <option value="OUTSIDE_CITY">Outside Dhaka Nationwide (৳150)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Detailed Street / House / Apartment Address *
              </label>
              <input
                type="text"
                required
                value={shippingAddressLine}
                onChange={(e) => setShippingAddressLine(e.target.value)}
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Area / Thana
                </label>
                <input
                  type="text"
                  value={shippingArea}
                  onChange={(e) => setShippingArea(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2F4156] mb-1">
                Special Delivery or Gift Instructions
              </label>
              <textarea
                rows={2}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Gate code, preferred delivery window, or complimentary gift note..."
                className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#E8E0D9] pb-3">
              <CreditCard className="h-5 w-5 text-[#567C8D]" />
              <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
                2. Payment Method
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  code: 'COD' as const,
                  title: 'Cash on Delivery (COD)',
                  desc: 'Pay in cash upon receiving your parcel.',
                },
                {
                  code: 'BKASH_MANUAL' as const,
                  title: 'bKash Merchant Payment',
                  desc: 'Send to 01711-000001 & enter TrxID for verification.',
                },
                {
                  code: 'NAGAD_MANUAL' as const,
                  title: 'Nagad Merchant Payment',
                  desc: 'Send to 01811-000002 & enter TrxID for verification.',
                },
                {
                  code: 'BANK_TRANSFER' as const,
                  title: 'Direct Bank Transfer',
                  desc: 'City Bank PLC • A/C: 1402938475001 (MAISON BEIGE LTD).',
                },
                {
                  code: 'SSLCOMMERZ' as const,
                  title: 'SSLCommerz Online Gateway',
                  desc: 'Local Visa/Mastercard/Mobile Banking (Server-verified).',
                },
                {
                  code: 'STRIPE' as const,
                  title: 'Stripe International Card',
                  desc: 'Global Visa/Mastercard/Amex checkout.',
                },
              ].map((pm) => (
                <button
                  key={pm.code}
                  type="button"
                  onClick={() => setPaymentMethod(pm.code)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    paymentMethod === pm.code
                      ? 'border-[#567C8D] bg-[#F5F1EE] ring-1 ring-[#567C8D]'
                      : 'border-[#E8E0D9] bg-white hover:border-[#567C8D]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#2F4156]">{pm.title}</span>
                    <span
                      className={`h-3.5 w-3.5 rounded-full border ${
                        paymentMethod === pm.code
                          ? 'border-[#567C8D] bg-[#567C8D]'
                          : 'border-[#8A949E]'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-[#52606D] mt-1">{pm.desc}</p>
                </button>
              ))}
            </div>

            {paymentMethod !== 'COD' && (
              <div className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-4 space-y-3">
                <p className="text-xs font-medium text-[#2F4156]">
                  Payment Verification Details (Verified by Finance Team before dispatch)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Transaction ID / Reference Number *"
                    className="rounded-lg border border-[#E8E0D9] bg-white px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="Sender Phone / Account Last 4 Digits"
                    className="rounded-lg border border-[#E8E0D9] bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-8 shadow-luxury space-y-5 sticky top-28">
            <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
              Order Summary ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
            </h2>

            <div className="max-h-64 overflow-y-auto divide-y divide-[#E8E0D9] pr-1">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'std'}`}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-12 w-10 rounded-md object-cover border border-[#E8E0D9]"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#2F4156] line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#52606D]">
                        {item.variantTitle} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2F4156]">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Bar */}
            <div className="flex gap-2 pt-2 border-t border-[#E8E0D9]">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Promo code (e.g. LUXURY10)"
                className="flex-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs font-mono uppercase"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="rounded-lg bg-[#C8D9E6] px-3.5 py-2 text-xs font-semibold text-[#2F4156] hover:bg-[#b5cadb]"
              >
                Apply
              </button>
            </div>

            <div className="space-y-2 border-t border-[#E8E0D9] pt-4 text-sm">
              <div className="flex justify-between text-[#52606D]">
                <span>Subtotal</span>
                <span className="font-medium text-[#2F4156]">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Privilege Discount ({appliedCoupon?.code})</span>
                  <span className="font-medium">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#52606D]">
                <span>Delivery ({shippingZone.replace('_', ' ')})</span>
                <span className="font-medium text-[#2F4156]">
                  {shippingCharge === 0 ? 'Complimentary' : formatCurrency(shippingCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E8E0D9] pt-3 text-lg font-bold text-[#2F4156]">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#567C8D] py-3.5 text-sm font-semibold text-white hover:bg-[#486878] disabled:opacity-50 transition-colors shadow-sm"
            >
              <span>{submitting ? 'Processing Order...' : 'Confirm & Place Order'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-[#52606D]">
              <ShieldCheck className="h-4 w-4 text-[#567C8D]" />
              <span>Encrypted Checkout • Official VAT Memo Included</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
