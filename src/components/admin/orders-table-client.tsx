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
  UserPlus,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  bulkUpdateOrderStatusAction,
  updateOrderStatusAction,
  assignOrderToStaffAction,
} from '@/actions/order-actions';
import { useStore } from '@/components/storefront/store-provider';
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

export function OrdersTableClient({
  orders,
  staffList,
  initialSearch,
  initialStatus,
  initialPayment,
  initialStaff,
  canAssign,
  canUpdateStatus,
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
  const [processingBulk, setProcessingBulk] = useState(false);

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

  const handleBulkStatusUpdate = async () => {
    if (!selectedIds.length) {
      showToast('No Orders Selected', 'Select at least one order first.', 'error');
      return;
    }
    setProcessingBulk(true);
    const res = await bulkUpdateOrderStatusAction({
      orderIds: selectedIds,
      status: bulkStatus,
    });
    setProcessingBulk(false);
    if (res.ok) {
      showToast(
        'Bulk Status Updated',
        `Updated ${selectedIds.length} orders to ${bulkStatus}`,
        'success'
      );
      setSelectedIds([]);
      router.refresh();
    }
  };

  const handleQuickSingleStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const res = await updateOrderStatusAction({ orderId, status: nextStatus });
    if (!res.ok) {
      showToast('Status Error', res.error, 'error');
      return;
    }
    showToast('Status Updated', `Order moved to ${nextStatus}`, 'success');
    router.refresh();
  };

  const handleQuickAssign = async (orderId: string, staffId: string) => {
    if (!staffId) return;
    const res = await assignOrderToStaffAction({
      orderId,
      staffId,
      roleType: 'MODERATOR',
    });
    if (res.ok) {
      showToast('Staff Assigned', 'Assigned order to staff member.', 'success');
      router.refresh();
    }
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
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    Move to: {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={processingBulk}
                onClick={handleBulkStatusUpdate}
                className="rounded-lg bg-[#567C8D] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#486878]"
              >
                {processingBulk ? 'Updating...' : 'Apply Bulk Status'}
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
                <th className="py-3.5 px-3 font-semibold">Assigned Staff</th>
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

                    <td className="py-3.5 px-3">
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

                    <td className="py-3.5 px-3">
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
                            handleQuickSingleStatus(o.id, e.target.value as OrderStatus)
                          }
                          className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2.5 py-1.5 text-xs font-semibold text-[#2F4156] focus:border-[#567C8D]"
                        >
                          {ORDER_STATUSES.map((s) => (
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

                    <td className="py-3.5 px-3">
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
                            onChange={(e) => handleQuickAssign(o.id, e.target.value)}
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

                    <td className="py-3.5 px-4 text-right">
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
