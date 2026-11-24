'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, AlertTriangle, ArrowUpDown, History } from 'lucide-react';
import { adjustInventoryAction } from '@/actions/catalog-actions';
import { formatDate } from '@/lib/utils';
import { useStore } from '@/components/storefront/store-provider';
import { LoadingButton } from '@/components/ui/loading-button';

export function InventoryAdminClient({
  products,
  transactions,
  canManage,
}: {
  products: Array<{
    id: string;
    title: string;
    sku: string;
    categoryName: string;
    stockQuantity: number;
    reservedStock: number;
    lowStockThreshold: number;
    variants: Array<{ id: string; sku: string; title: string; stockQuantity: number }>;
  }>;
  transactions: Array<{
    id: string;
    productTitle: string;
    sku: string;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    referenceId: string | null;
    performedByName: string;
    createdAt: string;
  }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [txType, setTxType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('Atelier Warehouse Restock');
  const [referenceId, setReferenceId] = useState('PO-2026-09');
  const [submitting, setSubmitting] = useState(false);

  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;
  const totalUnits = products.reduce((a, b) => a + b.stockQuantity, 0);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await adjustInventoryAction({
      productId: selectedProductId,
      type: txType,
      quantity: Number(quantity),
      reason,
      referenceId,
    });
    setSubmitting(false);

    if (!res.ok) {
      showToast('Adjustment Error', res.error, 'error');
      return;
    }

    showToast(
      'Inventory Updated',
      `Stock updated to ${res.newStock} units and transaction logged.`,
      'success'
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
          <span className="text-xs font-semibold uppercase text-[#52606D]">
            Total Units in Archive
          </span>
          <p className="text-2xl font-bold text-[#2F4156] mt-2">{totalUnits} Units</p>
        </div>
        <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
          <span className="text-xs font-semibold uppercase text-[#52606D]">
            Active SKUs Tracked
          </span>
          <p className="text-2xl font-bold text-[#567C8D] mt-2">{products.length} SKUs</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <span className="text-xs font-semibold uppercase text-amber-900">
            Low-Stock Alerts
          </span>
          <p className="text-2xl font-bold text-amber-900 mt-2">{lowStockCount} Products</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
          <span className="text-xs font-semibold uppercase text-rose-900">
            Out of Stock
          </span>
          <p className="text-2xl font-bold text-rose-900 mt-2">{outOfStockCount} Products</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Stock Table */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
            Product &amp; Variant Stock Overview
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                  <th className="py-3 px-3 font-semibold">Product / SKU</th>
                  <th className="py-3 px-3 font-semibold">Available</th>
                  <th className="py-3 px-3 font-semibold">Reserved</th>
                  <th className="py-3 px-3 font-semibold">Threshold</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D9]">
                {products.map((p) => {
                  const isLow = p.stockQuantity <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-[#F5F1EE]/50">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[#2F4156]">{p.title}</p>
                        <p className="font-mono text-[11px] text-[#567C8D]">{p.sku}</p>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#2F4156]">
                        {p.stockQuantity}
                      </td>
                      <td className="py-3 px-3 text-[#52606D]">{p.reservedStock}</td>
                      <td className="py-3 px-3 text-[#52606D]">{p.lowStockThreshold}</td>
                      <td className="py-3 px-3">
                        {p.stockQuantity <= 0 ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Healthy
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Stock Adjustment Form */}
        <div className="lg:col-span-5">
          {canManage && (
            <form
              onSubmit={handleAdjust}
              className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4 text-xs"
            >
              <div className="flex items-center gap-2 border-b border-[#E8E0D9] pb-3">
                <ArrowUpDown className="h-4 w-4 text-[#567C8D]" />
                <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
                  Stock Adjustment &amp; Replenishment
                </h2>
              </div>

              <div>
                <label className="block font-medium text-[#2F4156] mb-1">
                  Select Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-[#2F4156]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.sku} — {p.stockQuantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#2F4156] mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    value={txType}
                    onChange={(e) =>
                      setTxType(
                        e.target.value as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'
                      )
                    }
                    className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2.5 font-semibold text-[#2F4156]"
                  >
                    <option value="STOCK_IN">STOCK IN (+ Add)</option>
                    <option value="STOCK_OUT">STOCK OUT (- Deduct)</option>
                    <option value="ADJUSTMENT">SET EXACT STOCK</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#2F4156] mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#2F4156] mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. New batch arrival, QC damaged item, audit sync"
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
                />
              </div>

              <div>
                <label className="block font-medium text-[#2F4156] mb-1">
                  PO / Reference Code
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 font-mono"
                />
              </div>

              <LoadingButton
                type="submit"
                loading={submitting}
                loadingText="Recording Transaction..."
                className="h-auto w-full rounded-xl bg-[#567C8D] py-3 font-semibold text-white hover:bg-[#486878]"
              >
                Commit Inventory Transaction
              </LoadingButton>
            </form>
          )}
        </div>
      </div>

      {/* Complete Inventory Transaction Ledger */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#567C8D]" />
          <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
            Complete Inventory Transaction History ({transactions.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3 px-3 font-semibold">Timestamp</th>
                <th className="py-3 px-3 font-semibold">Product / SKU</th>
                <th className="py-3 px-3 font-semibold">Type</th>
                <th className="py-3 px-3 font-semibold">Qty</th>
                <th className="py-3 px-3 font-semibold">Stock Change</th>
                <th className="py-3 px-3 font-semibold">Reason / Reference</th>
                <th className="py-3 px-3 font-semibold">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F5F1EE]/50">
                  <td className="py-2.5 px-3 text-[#52606D]">
                    {formatDate(tx.createdAt, true)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-[#2F4156]">{tx.productTitle}</span>
                    <span className="block font-mono text-[10px] text-[#567C8D]">
                      {tx.sku}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="rounded-md bg-[#C8D9E6]/60 px-2 py-0.5 text-[10px] font-bold text-[#2F4156]">
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#2F4156]">{tx.quantity}</td>
                  <td className="py-2.5 px-3 font-mono text-[#52606D]">
                    {tx.previousStock} →{' '}
                    <strong className="text-[#2F4156]">{tx.newStock}</strong>
                  </td>
                  <td className="py-2.5 px-3 text-[#52606D]">
                    {tx.reason}{' '}
                    {tx.referenceId ? `(${tx.referenceId})` : ''}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#2F4156]">
                    {tx.performedByName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
