'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { resetDemoDataAction } from '@/actions/admin-actions';
import { useStore } from '@/components/storefront/store-provider';

// TEMPORARY (added 24 Nov 2026): one-time demo-data reset UI. Remove after use.
export function DemoResetClient() {
  const router = useRouter();
  const { showToast } = useStore();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      'This will DELETE ALL live data — orders, customers, products, everything — and re-seed the demo data. This cannot be undone. Are you sure?'
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await resetDemoDataAction();
      if (res.ok) {
        showToast(
          'Demo Data Reset',
          'Demo data has been reset and re-seeded. Please sign in again.',
          'success'
        );
        setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
      } else {
        showToast('Reset Failed', res.error, 'error');
      }
    } catch {
      showToast('Reset Failed', 'The demo data could not be reset.', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-luxury">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
            Danger Zone — Temporary
          </span>
          <h2 className="font-serif text-2xl font-semibold text-[#2F4156] mt-1 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" /> Reset Demo Data
          </h2>
          <p className="text-xs text-[#52606D] mt-1 max-w-xl">
            Deletes ALL live data (orders, customers, products, coupons, settings
            and more) and re-seeds the demo data. This cannot be undone. Your
            session will be destroyed, so you will need to sign in again.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          <span>{resetting ? 'Resetting Demo Data...' : 'Reset demo data'}</span>
        </button>
      </div>
    </div>
  );
}
