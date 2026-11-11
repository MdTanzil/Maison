'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Plus, Trash2, Power } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  upsertCouponAction,
  toggleCouponStatusAction,
  deleteCouponAction,
} from '@/actions/admin-actions';
import { useStore } from '@/components/storefront/store-provider';

export function CouponsAdminClient({
  coupons,
}: {
  coupons: Array<{
    id: string;
    code: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    expiryDate: string;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
  }>;
}) {
  const router = useRouter();
  const { showToast } = useStore();

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10');
  const [minOrderAmount, setMinOrderAmount] = useState('3000');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('2000');
  const [expiryDate, setExpiryDate] = useState('2027-03-31');
  const [usageLimit, setUsageLimit] = useState('200');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await upsertCouponAction({
      code,
      description,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      expiryDate,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perCustomerLimit: 2,
      isActive: true,
    });
    if (!res.ok) {
      showToast('Validation Error', res.error, 'error');
      return;
    }
    showToast('Coupon Saved', `Saved promotional code ${code.toUpperCase()}.`);
    setCode('');
    setDescription('');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          Promotions &amp; Privileges
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
          Coupons &amp; Discount Management ({coupons.length})
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
            Active &amp; Scheduled Coupons
          </h2>
          <div className="divide-y divide-[#E8E0D9] text-xs">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#F5F1EE] border border-[#E8E0D9] px-2.5 py-1 font-mono font-bold text-[#567C8D]">
                      {c.code}
                    </span>
                    <span className="font-bold text-[#2F4156]">
                      {c.discountType === 'PERCENTAGE'
                        ? `${c.discountValue}% OFF`
                        : `${formatCurrency(c.discountValue)} OFF`}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.isActive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[#52606D] mt-1">{c.description}</p>
                  <p className="text-[11px] text-[#52606D] mt-0.5">
                    Min Order: {formatCurrency(c.minOrderAmount)} • Expires: {c.expiryDate}{' '}
                    • Used: {c.usedCount}/{c.usageLimit ?? '∞'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await toggleCouponStatusAction(c.id);
                      router.refresh();
                    }}
                    className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] p-2 text-[#2F4156] hover:border-[#567C8D]"
                    title="Toggle Active"
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteCouponAction(c.id);
                      router.refresh();
                    }}
                    className="rounded-lg border border-[#E8E0D9] bg-white p-2 text-rose-600 hover:bg-rose-50"
                    title="Delete Coupon"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="lg:col-span-5 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4 text-xs"
        >
          <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
            Create or Update Coupon
          </h3>
          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Coupon Code *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WINTER20"
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')
                }
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (৳)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Min Order Amount (৳)
              </label>
              <input
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Max Discount Cap (৳)
              </label>
              <input
                type="number"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Seasonal promotional offer..."
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#567C8D] py-2.5 font-semibold text-white hover:bg-[#486878]"
          >
            <Plus className="h-4 w-4" />
            <span>Save Coupon</span>
          </button>
        </form>
      </div>
    </div>
  );
}
