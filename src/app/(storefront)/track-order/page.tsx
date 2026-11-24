'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Truck, CheckCircle2, Clock, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TrackedOrder {
  orderNumber: string;
  customerName: string;
  shippingCity: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  couponCode: string | null;
  grandTotal: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    totalPrice: number;
  }>;
  shipment: {
    courierProvider: string;
    trackingNumber: string | null;
    status: string;
  } | null;
  statusHistory: Array<{
    id: string;
    status: string;
    note: string | null;
    changedByName: string | null;
    createdAt: string;
  }>;
}

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || 'MB-261110-1042';
  const [query, setQuery] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const fetchOrder = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOrder(null);
        setError(data.error || 'Order not found.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to fetch tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQ) {
      fetchOrder(initialQ);
    }
  }, [initialQ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(query);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 sm:p-10 shadow-luxury space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Live Concierge Logistics
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
            Track Your Order
          </h1>
          <p className="text-sm text-[#52606D] mt-1">
            Enter your Order ID (e.g., <code className="font-mono text-[#567C8D]">MB-261110-1042</code>), Courier Tracking Code, or Phone Number.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID, Tracking Code (SF-BD-8827341), or Phone..."
            className="flex-1 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-3 text-sm text-[#2F4156]"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#567C8D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#486878]"
          >
            <Search className="h-4 w-4" />
            <span>{loading ? 'Searching...' : 'Track Order'}</span>
          </button>
        </form>

        {/* Sample quick-click order pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[#52606D]">Sample Orders:</span>
          {['MB-261109-1041', 'MB-261110-1042', 'MB-261111-1043', 'MB-261111-1044'].map(
            (sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  fetchOrder(sample);
                }}
                className="rounded-md border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1 font-mono text-[#567C8D] hover:bg-[#C8D9E6]/60"
              >
                {sample}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800">
            {error}
          </div>
        )}

        {order && (
          <div className="space-y-6 pt-4 border-t border-[#E8E0D9]">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 rounded-xl bg-[#F5F1EE] p-4 border border-[#E8E0D9]">
              <div>
                <p className="text-xs text-[#52606D]">Order Number</p>
                <p className="text-sm font-mono font-bold text-[#2F4156]">
                  {order.orderNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#52606D]">Current Status</p>
                <span className="inline-flex items-center rounded-full bg-[#567C8D] px-2.5 py-0.5 text-xs font-semibold text-white mt-0.5">
                  {order.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-[#52606D]">Courier &amp; Tracking</p>
                <p className="text-xs font-semibold text-[#2F4156] mt-0.5">
                  {order.shipment?.courierProvider || 'INTERNAL'} •{' '}
                  <span className="font-mono text-[#567C8D]">
                    {order.shipment?.trackingNumber || 'Pending'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-[#52606D]">Subtotal</p>
                <p className="text-sm font-semibold text-[#2F4156]">
                  {formatCurrency(order.subtotal)}
                </p>
                {order.discountAmount > 0 && (
                  <>
                    <p className="text-xs text-[#52606D] mt-2">
                      Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                    </p>
                    <p className="text-sm font-semibold text-[#567C8D]">
                      -{formatCurrency(order.discountAmount)}
                    </p>
                  </>
                )}
                <p className="text-xs text-[#52606D] mt-2">Shipping</p>
                <p className="text-sm font-semibold text-[#2F4156]">
                  {order.shippingCharge === 0 ? 'Free' : formatCurrency(order.shippingCharge)}
                </p>
                <p className="text-xs text-[#52606D] mt-2">Total Amount</p>
                <p className="text-sm font-bold text-[#2F4156]">
                  {formatCurrency(order.grandTotal)} ({order.paymentStatus})
                </p>
              </div>
            </div>

            {/* Order Timeline */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-3">
                Fulfillment &amp; Status History
              </h3>
              <div className="space-y-3">
                {order.statusHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE]/60 p-3.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#567C8D] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#2F4156]">
                          {h.status}
                        </span>
                        <span className="text-[11px] text-[#52606D]">
                          {formatDate(h.createdAt, true)}
                        </span>
                      </div>
                      <p className="text-xs text-[#52606D] mt-0.5">{h.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-3">
                Ordered Items
              </h3>
              <div className="divide-y divide-[#E8E0D9] rounded-xl border border-[#E8E0D9] bg-white">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#2F4156]">
                        {item.productName}
                      </span>
                      {item.variantName && (
                        <span className="text-[#52606D] ml-2">({item.variantName})</span>
                      )}
                      <span className="text-[#52606D] ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-bold text-[#2F4156]">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
