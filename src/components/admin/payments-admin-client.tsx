'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ShieldCheck, Banknote, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { verifyPaymentAction } from '@/actions/order-actions';
import { useStore } from '@/components/storefront/store-provider';
import { GatewayStatus } from '@/lib/services/integrations';

export function PaymentsAdminClient({
  payments,
  refunds,
  gateways,
  canVerify,
}: {
  payments: Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    customerName: string;
    paymentMethod: string;
    status: string;
    amount: number;
    transactionRef: string;
    collectedCashAmount: number;
    verifiedByName: string | null;
    collectedByName: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    orderNumber: string;
    amount: number;
    reason: string;
    status: string;
    restockItems: boolean;
    processedByName: string;
    createdAt: string;
  }>;
  gateways: GatewayStatus[];
  canVerify: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();

  const handleQuickVerify = async (orderId: string, orderNumber: string, amount: number) => {
    const res = await verifyPaymentAction({
      orderId,
      paymentStatus: 'VERIFIED',
      collectedCashAmount: amount,
    });
    if (res.ok) {
      showToast(
        'Payment Verified',
        `Payment for ${orderNumber} verified on server.`,
        'success'
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          Treasury &amp; Verification
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
          Payment Verification, Gateways &amp; Refunds
        </h1>
        <p className="text-xs text-[#52606D] mt-0.5">
          Payments are never marked verified automatically from client responses; all confirmations are verified on the server.
        </p>
      </div>

      {/* Payment Gateway Architecture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {gateways.map((gw) => (
          <div
            key={gw.code}
            className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2F4156]">{gw.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    gw.isConfigured
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-[#C8D9E6]/70 text-[#2F4156]'
                  }`}
                >
                  {gw.mode.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-[#52606D] mt-2">{gw.description}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-[#E8E0D9]">
              <p className="text-[10px] font-semibold text-[#567C8D]">Required Env Vars:</p>
              <p className="font-mono text-[10px] text-[#52606D] truncate">
                {gw.requiredEnvVars.join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Ledger */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
        <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
          Payment &amp; COD Collection Ledger ({payments.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3 px-3 font-semibold">Order</th>
                <th className="py-3 px-3 font-semibold">Customer</th>
                <th className="py-3 px-3 font-semibold">Method / Trx Ref</th>
                <th className="py-3 px-3 font-semibold">Order Amount</th>
                <th className="py-3 px-3 font-semibold">Cash Collected</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                {canVerify && (
                  <th className="py-3 px-3 font-semibold text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F1EE]/50">
                  <td className="py-3 px-3">
                    <Link
                      href={`/admin/orders/${p.orderId}`}
                      className="font-mono font-bold text-[#567C8D] hover:underline"
                    >
                      {p.orderNumber}
                    </Link>
                    <p className="text-[10px] text-[#52606D]">
                      {formatDate(p.createdAt, true)}
                    </p>
                  </td>
                  <td className="py-3 px-3 font-medium text-[#2F4156]">
                    {p.customerName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-[#2F4156]">{p.paymentMethod}</span>
                    <span className="block font-mono text-[10px] text-[#567C8D]">
                      {p.transactionRef}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-[#2F4156]">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-700">
                    {formatCurrency(p.collectedCashAmount)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        p.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  {canVerify && (
                    <td className="py-3 px-3 text-right">
                      {p.status !== 'VERIFIED' ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickVerify(p.orderId, p.orderNumber, p.amount)
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#567C8D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#486878]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Verify Payment</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#52606D]">
                          Verified {p.verifiedByName ? `by ${p.verifiedByName}` : ''}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Ledger */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
        <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
          Processed Refund Records ({refunds.length})
        </h2>
        {refunds.length === 0 ? (
          <p className="text-xs text-[#52606D]">
            No refunds have been issued yet. You can process refunds directly from any Order Detail screen.
          </p>
        ) : (
          <div className="divide-y divide-[#E8E0D9] text-xs">
            {refunds.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-[#2F4156]">
                    {r.orderNumber}
                  </span>
                  <span className="text-[#52606D] ml-2">Reason: {r.reason}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-700">
                    -{formatCurrency(r.amount)}
                  </span>
                  <span className="block text-[10px] text-[#52606D]">
                    {formatDate(r.createdAt, true)} • by {r.processedByName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
