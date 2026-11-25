'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download, Ban, CheckCircle2, Save } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  toggleCustomerBlockAction,
  updateCustomerNotesAction,
} from '@/actions/admin-actions';
import { useStore } from '@/components/storefront/store-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingButton } from '@/components/ui/loading-button';

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function CustomersAdminClient({
  customers,
  canManage,
}: {
  customers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    isBlocked: boolean;
    totalOrders: number;
    totalSpent: number;
    loyaltyPoints: number;
    internalNotes: string;
    defaultAddress: string;
    createdAt: string;
  }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

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

  const [search, setSearch] = useState('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>(
    Object.fromEntries(customers.map((c) => [c.id, c.internalNotes]))
  );

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  const handleToggleBlock = async (id: string) => {
    const res = await toggleCustomerBlockAction(id);
    if (res.ok) {
      showToast(
        res.isBlocked ? 'Customer Blocked' : 'Customer Unblocked',
        'Updated patron account status.',
        'info'
      );
      router.refresh();
    }
  };

  const handleSaveNote = async (id: string) => {
    setSavingNoteId(id);
    try {
      const res = await updateCustomerNotesAction(id, notesMap[id] || '');
      if (res.ok) {
        showToast('CRM Note Saved', 'Updated internal customer note.', 'success');
        router.refresh();
      }
    } finally {
      setSavingNoteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Clientele &amp; CRM
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Customer Directory ({filtered.length})
          </h1>
          <p className="text-xs text-[#52606D] mt-0.5">
            View patron lifetime spending, delivery addresses, CRM notes, and account restrictions.
          </p>
        </div>

        <a
          href="/api/export/customers"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
        >
          <Download className="h-4 w-4" />
          <span>Export Customers CSV</span>
        </a>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-4 shadow-luxury">
        <div className="relative">
          <Search className="h-4 w-4 text-[#8A949E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patron name, email, or phone number..."
            className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-10 pr-4 py-2 text-xs"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white overflow-hidden shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3.5 px-4 font-semibold">Patron / Contact</th>
                <th className="py-3.5 px-3 font-semibold hidden lg:table-cell">Primary Address</th>
                <th className="py-3.5 px-3 font-semibold">Orders / Lifetime Spend</th>
                <th className="py-3.5 px-3 font-semibold">Internal CRM Notes</th>
                <th className="py-3.5 px-3 font-semibold">Status</th>
                {canManage && (
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#F5F1EE]/50">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#2F4156]">{c.name}</p>
                    <p className="text-[#52606D] break-all">{c.email}</p>
                    <p className="text-[11px] font-mono text-[#567C8D] whitespace-nowrap">{c.phone}</p>
                  </td>
                  <td className="py-3.5 px-3 text-[#52606D] max-w-[200px] hidden lg:table-cell">
                    {c.defaultAddress}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <p className="font-bold text-[#2F4156]">
                      {formatCurrency(c.totalSpent)}
                    </p>
                    <p className="text-[11px] text-[#52606D]">
                      {c.totalOrders} Orders • {c.loyaltyPoints} pts
                    </p>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={notesMap[c.id] || ''}
                        onChange={(e) =>
                          setNotesMap((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        placeholder="Add VIP / delivery note..."
                        className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1 text-xs w-44"
                      />
                      {canManage && (
                        <LoadingButton
                          type="button"
                          onClick={() => handleSaveNote(c.id)}
                          loading={savingNoteId === c.id}
                          className="h-auto rounded-lg bg-[#567C8D] p-1.5 text-white hover:bg-[#486878]"
                          title="Save CRM Note"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </LoadingButton>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    {c.isBlocked ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                        Blocked
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Active
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            title: c.isBlocked ? 'Unblock Customer' : 'Block Customer',
                            message: c.isBlocked
                              ? `Unblock ${c.name}? They will regain access to their account and can place orders again.`
                              : `Block ${c.name}? They will no longer be able to sign in or place orders.`,
                            confirmLabel: c.isBlocked ? 'Unblock' : 'Block',
                            destructive: !c.isBlocked,
                            onConfirm: () => handleToggleBlock(c.id),
                          })
                        }
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          c.isBlocked
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {c.isBlocked ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            <span>Block</span>
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
