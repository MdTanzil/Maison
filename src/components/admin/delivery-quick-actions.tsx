'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RotateCcw, Banknote } from 'lucide-react';
import { updateOrderStatusAction } from '@/actions/order-actions';
import { useStore } from '@/components/storefront/store-provider';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function DeliveryQuickActions({
  orderId,
  orderNumber,
  codAmount,
  currentStatus,
  canReturn = false,
}: {
  orderId: string;
  orderNumber: string;
  codAmount: number;
  currentStatus: string;
  canReturn?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [cashInput, setCashInput] = useState(String(codAmount));
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const runConfirmed = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  };

  const handleDeliver = async () => {
    setLoading(true);
    const res = await updateOrderStatusAction({
      orderId,
      status: 'DELIVERED',
      collectedCash: Number(cashInput) || 0,
      note: `Delivered by rider. Collected cash: ৳${cashInput}`,
    });
    setLoading(false);
    if (!res.ok) {
      showToast('Update Error', res.error, 'error');
      return;
    }
    showToast(
      'Order Delivered',
      `${orderNumber} marked DELIVERED & cash recorded.`,
      'success'
    );
    router.refresh();
  };

  const handleReturn = async () => {
    setLoading(true);
    const res = await updateOrderStatusAction({
      orderId,
      status: 'RETURNED',
      note: 'Customer unavailable / parcel returned to warehouse.',
    });
    setLoading(false);
    if (!res.ok) {
      showToast('Update Error', res.error, 'error');
      return;
    }
    showToast('Marked Returned', `${orderNumber} marked RETURNED & stock restored.`, 'info');
    router.refresh();
  };

  // Terminal states: nothing left to do.
  if (
    currentStatus === 'RETURNED' ||
    currentStatus === 'CANCELLED' ||
    currentStatus === 'REFUNDED'
  ) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
        Completed ({currentStatus})
      </span>
    );
  }

  // Not yet dispatched: no delivery action is possible.
  if (
    currentStatus === 'PENDING' ||
    currentStatus === 'CONFIRMED' ||
    currentStatus === 'PROCESSING' ||
    currentStatus === 'READY_FOR_SHIPMENT'
  ) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-[#F5F1EE] border border-[#E8E0D9] px-3 py-1 text-xs font-semibold text-[#52606D]">
        Awaiting dispatch
      </span>
    );
  }

  // Delivered and the viewer cannot mark returns: nothing left to do.
  if (currentStatus === 'DELIVERED' && !canReturn) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
        Completed ({currentStatus})
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus === 'SHIPPED' && (
        <>
          <div className="flex items-center gap-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1">
            <Banknote className="h-3.5 w-3.5 text-[#567C8D]" />
            <input
              type="number"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="w-20 bg-transparent text-xs font-semibold text-[#2F4156] focus:outline-none"
              title={`COD Due: ${formatCurrency(codAmount)}`}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setConfirm({
                title: 'Mark Order Delivered',
                message: `Mark ${orderNumber} as DELIVERED and log ৳${cashInput} cash collected?`,
                confirmLabel: 'Deliver & Log Cash',
                onConfirm: handleDeliver,
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#567C8D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#486878]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Deliver &amp; Log Cash</span>
          </button>
        </>
      )}
      {canReturn && (
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            setConfirm({
              title: 'Mark Order Returned',
              message: `${orderNumber} will be marked RETURNED and its stock restored to the warehouse.`,
              confirmLabel: 'Mark Returned',
              destructive: true,
              onConfirm: handleReturn,
            })
          }
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Return</span>
        </button>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        loading={confirmLoading}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
