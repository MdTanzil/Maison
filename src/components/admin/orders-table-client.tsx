'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Printer,
  Download,
  Eye,
  CheckSquare,
  Square,
  FileText,
  Receipt,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  bulkUpdateOrderStatusAction,
  updateOrderStatusAction,
  assignOrderToStaffAction,
  deleteOrderAction,
} from '@/actions/order-actions';
import { useStore } from '@/components/storefront/store-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrderStatus } from '@prisma/client';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_SHIPMENT',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
];

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function OrdersTableClient({
  orders,
  staffList,
  initialSearch,
  initialStatus,
  initialPayment,
  initialStaff,
  canAssign,
  canUpdateStatus,
  canDeleteOrder,
  allowedStatusesByOrder,
  canCancel,
}: {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    shippingCity: string;
    itemCount: number;
    grandTotal: number;
    paymentMethod: string;
    paymentStatus: string;
    status: OrderStatus;
    trackingNumber: string | null;
    assignedStaff: Array<{ id: string; name: string; roleType: string }>;
    createdAt: string;
  }>;
  staffList: Array<{ id: string; name: string; role: string }>;
  initialSearch: string;
  initialStatus: string;
  initialPayment: string;
  initialStaff: string;
  canAssign: boolean;
  canUpdateStatus: boolean;
  canDeleteOrder: boolean;
  allowedStatusesByOrder: Record<string, OrderStatus[]>;
  canCancel: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState(initialPayment);
  const [staffFilter, setStaffFilter] = useState(initialStaff);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>('CONFIRMED');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Bulk move options: every status except REFUNDED (refund action only),
  // and CANCELLED only for callers holding orders.cancel.
  const BULK_STATUSES: OrderStatus[] = ORDER_STATUSES.filter(
    (s) => s !== 'REFUNDED' && (s !== 'CANCELLED' || canCancel)
  );

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

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (statusFilter && o.status !== statusFilter) return false;
      if (paymentFilter && o.paymentStatus !== paymentFilter) return false;
      if (staffFilter && !o.assignedStaff.some((s) => s.id === staffFilter)) return false;
      if (dateFilter && new Date(o.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) !== dateFilter) return false;
      return true;
    });
  }, [orders, search, statusFilter, paymentFilter, staffFilter, dateFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((o) => o.id));
    }
  };

  const handleBulkStatusUpdate = () => {
    if (!selectedIds.length) {
      showToast('No Orders Selected', 'Select at least one order first.', 'error');
      return;
    }
    const count = selectedIds.length;
    const noun = count === 1 ? 'order' : 'orders';
    setConfirm({
      title: 'Update Order Status',
      message: `Move ${count} selected ${noun} to ${bulkStatus}?`,
      confirmLabel: 'Update Status',
      onConfirm: async () => {
        const res = await bulkUpdateOrderStatusAction({
          orderIds: selectedIds,
          status: bulkStatus,
        });
        if (res.ok) {
          showToast(
            'Bulk Status Updated',
            `Updated ${selectedIds.length} orders to ${bulkStatus}`,
            'success'
          );
          setSelectedIds([]);
          router.refresh();
        } else {
          const failed =
            (res as { failed?: Array<{ orderId: string; error: string }> }).failed ?? [];
          const succeeded =
            (res as { count?: number }).count ?? 0;
          const firstError =
            failed[0]?.error ??
            (res as { error?: string }).error ??
            'Update failed';
          showToast(
            'Bulk Status Update Incomplete',
            `Updated ${succeeded} of ${selectedIds.length} orders. ${failed.length} failed: ${firstError}`,
            'error'
          );
          router.refresh();
        }
      },
    });
  };

  const handleQuickSingleStatus = (
    orderId: string,
    orderNumber: string,
    nextStatus: OrderStatus
  ) => {
    setConfirm({
      title: 'Change Order Status',
      message: `Move order ${orderNumber} to ${nextStatus}?`,
      confirmLabel: 'Change Status',
      onConfirm: async () => {
        const res = await updateOrderStatusAction({ orderId, status: nextStatus });
        if (!res.ok) {
          showToast('Status Error', res.error, 'error');
          return;
        }
        showToast('Status Updated', `Order moved to ${nextStatus}`, 'success');
        router.refresh();
      },
    });
  };

  const handleQuickAssign = (
    orderId: string,
    orderNumber: string,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const staffId = e.target.value;
    if (!staffId) return;
    const staffName = staffList.find((st) => st.id === staffId)?.name ?? 'this staff member';
    // Reset the picker right away so a cancelled confirmation leaves no
    // stale selection behind.
    e.target.value = '';
    setConfirm({
      title: 'Assign Staff',
      message: `Assign order ${orderNumber} to ${staffName} as Moderator?`,
      confirmLabel: 'Assign',
      onConfirm: async () => {
        const res = await assignOrderToStaffAction({
          orderId,
          staffId,
          roleType: 'MODERATOR',
        });
        if (res.ok) {
          showToast('Staff Assigned', 'Assigned order to staff member.', 'success');
          router.refresh();
        }
      },
    });
  };

  const handleDeleteOrder = (orderId: string, orderNumber: string) => {
    setConfirm({
      title: 'Delete Cancelled Order',
      message: `Permanently delete cancelled order ${orderNumber}? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        const res = await deleteOrderAction(orderId);
        if (!res.ok) {
          showToast('Delete Failed', res.error, 'error');
          return;
        }
        showToast('Order Deleted', `Cancelled order ${orderNumber} was permanently deleted.`, 'success');
        router.refresh();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Fulfillment &amp; Operations
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Order Management ({filtered.length})
          </h1>
          <p className="text-xs text-[#52606D] mt-0.5">
            Search, filter, assign moderators/riders, update statuses with automatic stock sync, and print memos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/export/orders"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-2.5 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D]"
          >
            <Download className="h-4 w-4 text-[#567C8D]" />
            <span>Export CSV</span>
          </a>

          <Link
            href={
              selectedIds.length > 0
                ? `/admin/orders/print-bulk?ids=${selectedIds.join(',')}&format=a4`
                : `/admin/orders/print-bulk?format=a4`
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
          >
            <Printer className="h-4 w-4" />
            <span>
              {selectedIds.length > 0
                ? `Bulk Print (${selectedIds.length}) Memos`
                : 'Bulk Print Memos'}
            </span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-[#8A949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order ID, Name, Phone, Tracking..."
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] pl-9 pr-3 py-2 text-xs text-[#2F4156]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs text-[#2F4156]"
          >
            <option value="">All Order Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs text-[#2F4156]"
          >
            <option value="">All Payment Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PAID">PAID</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs text-[#2F4156]"
          >
            <option value="">All Assigned Staff</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs text-[#2F4156]"
          />
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && canUpdateStatus && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#567C8D]/30 bg-[#C8D9E6]/35 px-4 py-2.5">
            <span className="text-xs font-semibold text-[#2F4156]">
              {selectedIds.length} orders selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
                className="rounded-lg border border-[#E8E0D9] bg-white px-3 py-1.5 text-xs font-medium text-[#2F4156]"
              >
                {BULK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    Move to: {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                className="rounded-lg bg-[#567C8D] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#486878]"
              >
                Apply Bulk Status
              </button>
              <Link
                href={`/admin/orders/print-bulk?ids=${selectedIds.join(',')}&format=80mm`}
                className="rounded-lg border border-[#E8E0D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#2F4156] hover:border-[#567C8D]"
              >
                Bulk 80mm Receipts
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Orders Data Table */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white overflow-hidden shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[#567C8D]"
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3 font-semibold">Order ID / Date</th>
                <th className="py-3.5 px-3 font-semibold">Customer &amp; City</th>
                <th className="py-3.5 px-3 font-semibold">Amount / Payment</th>
                <th className="py-3.5 px-3 font-semibold">Order Status</th>
                <th className="py-3.5 px-3 font-semibold hidden lg:table-cell">Assigned Staff</th>
                <th className="py-3.5 px-4 font-semibold text-right">
                  Actions &amp; Direct Print
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {filtered.map((o) => {
                const selected = selectedIds.includes(o.id);
                return (
                  <tr
                    key={o.id}
                    className={`transition-colors ${
                      selected ? 'bg-[#C8D9E6]/25' : 'hover:bg-[#F5F1EE]/50'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSelect(o.id)}
                        className="text-[#567C8D]"
                      >
                        {selected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono font-bold text-[#567C8D] hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <p className="text-[11px] text-[#52606D] mt-0.5">
                        {formatDate(o.createdAt, true)}
                      </p>
                    </td>

                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-[#2F4156]">{o.customerName}</p>
                      <p className="text-[11px] text-[#52606D]">
                        {o.customerPhone} • {o.shippingCity}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <p className="font-bold text-[#2F4156]">
                        {formatCurrency(o.grandTotal)}
                      </p>
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold mt-0.5 ${
                          o.paymentStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {o.paymentMethod} • {o.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      {canUpdateStatus ? (
                        <select
                          value={o.status}
                          onChange={(e) =>
                            handleQuickSingleStatus(
                              o.id,
                              o.orderNumber,
                              e.target.value as OrderStatus
                            )
                          }
                          className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1.5 text-xs font-semibold text-[#2F4156] focus:border-[#567C8D]"
                        >
                          {Array.from(
                            new Set([o.status, ...(allowedStatusesByOrder[o.id] ?? [])])
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-[#C8D9E6] px-2.5 py-1 text-xs font-semibold text-[#2F4156]">
                          {o.status}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <div className="space-y-1">
                        {o.assignedStaff.slice(0, 2).map((st, idx) => (
                          <span
                            key={idx}
                            className="block text-[11px] text-[#2F4156] font-medium truncate max-w-[150px]"
                          >
                            • {st.name}
                          </span>
                        ))}
                        {canAssign && (
                          <select
                            defaultValue=""
                            onChange={(e) => handleQuickAssign(o.id, o.orderNumber, e)}
                            className="rounded border border-[#E8E0D9] bg-[#F5F1EE] px-2 py-1 text-[10px] text-[#567C8D]"
                          >
                            <option value="">+ Assign Staff</option>
                            {staffList.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1.5 text-[11px] font-semibold text-[#2F4156] hover:border-[#567C8D]"
                          title="Order Details"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#567C8D]" />
                          <span>Manage</span>
                        </Link>
                        <Link
                          href={`/admin/orders/${o.id}/print?format=a4`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#567C8D] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#486878]"
                          title="Print A4 Invoice"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>A4</span>
                        </Link>
                        <Link
                          href={`/admin/orders/${o.id}/print?format=80mm`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#C8D9E6] px-2.5 py-1.5 text-[11px] font-semibold text-[#2F4156] hover:bg-[#b5cadb]"
                          title="Print 80mm Thermal Receipt"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>80mm</span>
                        </Link>
                        {canDeleteOrder && o.status === 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(o.id, o.orderNumber)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
                            title="Delete this cancelled order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
