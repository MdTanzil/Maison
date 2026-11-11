'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  FileText,
  Receipt,
  CheckCircle2,
  UserPlus,
  Truck,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  updateOrderStatusAction,
  assignOrderToStaffAction,
  verifyPaymentAction,
  processOrderRefundAction,
} from '@/actions/order-actions';
import { useStore } from '@/components/storefront/store-provider';
import { OrderStatus, PaymentStatus, CourierProvider } from '@prisma/client';

export function OrderDetailClient({
  order,
  staffList,
  permissions,
}: {
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    shippingAddressLine: string;
    shippingArea: string | null;
    shippingCity: string;
    shippingPostalCode: string | null;
    shippingZone: string;
    subtotal: number;
    discountAmount: number;
    shippingCharge: number;
    grandTotal: number;
    couponCode: string | null;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    status: OrderStatus;
    stockDeducted: boolean;
    customerNotes: string | null;
    internalNotes: string | null;
    createdAt: string;
    items: Array<{
      id: string;
      productName: string;
      variantName: string | null;
      sku: string;
      imageUrl: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    statusHistory: Array<{
      id: string;
      status: string;
      previousStatus: string | null;
      note: string | null;
      changedByName: string;
      createdAt: string;
    }>;
    assignments: Array<{
      id: string;
      staffName: string;
      roleType: string;
      status: string;
      notes: string | null;
      assignedAt: string;
    }>;
    payment: {
      id: string;
      transactionRef: string | null;
      collectedCashAmount: number;
      status: string;
    } | null;
    shipment: {
      courierProvider: CourierProvider;
      trackingNumber: string | null;
      deliveryStaffName: string | null;
      status: string;
    } | null;
  };
  staffList: Array<{ id: string; name: string; role: string }>;
  permissions: {
    canUpdateStatus: boolean;
    canAssign: boolean;
    canVerifyPayment: boolean;
  };
}) {
  const router = useRouter();
  const { showToast } = useStore();

  // Status & Note Form
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [statusNote, setStatusNote] = useState('');
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '');
  const [trackingNumber, setTrackingNumber] = useState(
    order.shipment?.trackingNumber || ''
  );
  const [courierProvider, setCourierProvider] = useState<CourierProvider>(
    order.shipment?.courierProvider || 'INTERNAL_DELIVERY'
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assignment Form
  const [assignStaffId, setAssignStaffId] = useState(staffList[0]?.id || '');
  const [assignRoleType, setAssignRoleType] = useState<
    'MODERATOR' | 'ORDER_PROCESSING' | 'DELIVERY_STAFF'
  >('MODERATOR');
  const [assignNotes, setAssignNotes] = useState('');

  // Payment Verification & Refund
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [trxRef, setTrxRef] = useState(order.payment?.transactionRef || '');
  const [collectedCash, setCollectedCash] = useState(
    String(order.payment?.collectedCashAmount || order.grandTotal)
  );
  const [refundReason, setRefundReason] = useState('');

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingStatus(true);
    const res = await updateOrderStatusAction({
      orderId: order.id,
      status,
      note: statusNote,
      internalNotes,
      trackingNumber,
      courierProvider,
    });
    setUpdatingStatus(false);

    if (!res.ok) {
      showToast('Update Failed', res.error, 'error');
      return;
    }
    showToast('Order Updated', `Order ${order.orderNumber} updated to ${status}`);
    setStatusNote('');
    router.refresh();
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await assignOrderToStaffAction({
      orderId: order.id,
      staffId: assignStaffId,
      roleType: assignRoleType,
      notes: assignNotes,
    });
    if (res.ok) {
      showToast('Staff Assigned', 'Assigned order to staff member.', 'success');
      setAssignNotes('');
      router.refresh();
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyPaymentAction({
      orderId: order.id,
      paymentStatus,
      transactionRef: trxRef,
      collectedCashAmount: Number(collectedCash) || 0,
    });
    if (res.ok) {
      showToast('Payment Updated', `Marked payment as ${paymentStatus}`, 'success');
      router.refresh();
    }
  };

  const handleProcessRefund = async () => {
    if (!refundReason.trim()) {
      showToast('Reason Required', 'Enter a reason before processing refund.', 'error');
      return;
    }
    const res = await processOrderRefundAction({
      orderId: order.id,
      amount: order.grandTotal,
      reason: refundReason,
      restockItems: true,
    });
    if (res.ok) {
      showToast('Refund Processed', 'Order refunded and inventory restored.', 'info');
      setRefundReason('');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-2.5 text-[#2F4156] hover:border-[#567C8D]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[#2F4156]">
                Order {order.orderNumber}
              </h1>
              <span className="rounded-full bg-[#567C8D] px-3 py-0.5 text-xs font-semibold text-white">
                {order.status}
              </span>
              <span className="rounded-full bg-[#C8D9E6] px-2.5 py-0.5 text-xs font-semibold text-[#2F4156]">
                {order.stockDeducted ? 'Stock Deducted' : 'Stock Reserved'}
              </span>
            </div>
            <p className="text-xs text-[#52606D] mt-0.5">
              Placed on {formatDate(order.createdAt, true)} • {order.customerName} (
              {order.customerPhone})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/admin/orders/${order.id}/print?format=a4`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
          >
            <FileText className="h-4 w-4" />
            <span>Print A4 Invoice</span>
          </Link>
          <Link
            href={`/admin/orders/${order.id}/print?format=80mm`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#567C8D] bg-[#C8D9E6]/60 px-4 py-2.5 text-xs font-semibold text-[#2F4156] hover:bg-[#C8D9E6]"
          >
            <Receipt className="h-4 w-4 text-[#567C8D]" />
            <span>Print 80mm Thermal Receipt</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Items, Customer Info, Status Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ordered Products */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
              Ordered Items ({order.items.length})
            </h2>
            <div className="divide-y divide-[#E8E0D9]">
              {order.items.map((it) => (
                <div
                  key={it.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {it.imageUrl && (
                      <img
                        src={it.imageUrl}
                        alt={it.productName}
                        className="h-12 w-10 rounded-lg object-cover border border-[#E8E0D9]"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-[#2F4156]">{it.productName}</p>
                      <p className="text-[#52606D]">
                        SKU: <span className="font-mono">{it.sku}</span>{' '}
                        {it.variantName ? `• ${it.variantName}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#52606D]">
                      {it.quantity} × {formatCurrency(it.unitPrice)}
                    </p>
                    <p className="font-bold text-[#2F4156]">
                      {formatCurrency(it.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E8E0D9] pt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#52606D]">Subtotal</span>
                <span className="font-semibold text-[#2F4156]">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52606D]">
                  Discount {order.couponCode ? `(${order.couponCode})` : ''}
                </span>
                <span className="font-semibold text-emerald-700">
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52606D]">
                  Delivery Charge ({order.shippingZone})
                </span>
                <span className="font-semibold text-[#2F4156]">
                  {formatCurrency(order.shippingCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E8E0D9] pt-2 text-sm font-bold text-[#2F4156]">
                <span>Grand Total</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-[#567C8D] mb-2">
                Customer &amp; Delivery Address
              </h3>
              <p className="text-sm font-bold text-[#2F4156]">{order.customerName}</p>
              <p className="text-[#2F4156] mt-0.5">Phone: {order.customerPhone}</p>
              {order.customerEmail && (
                <p className="text-[#52606D]">Email: {order.customerEmail}</p>
              )}
              <p className="text-[#52606D] mt-2 leading-relaxed">
                {order.shippingAddressLine}, {order.shippingArea || ''},{' '}
                {order.shippingCity} {order.shippingPostalCode || ''}
              </p>
            </div>
            <div>
              <h3 className="font-bold uppercase tracking-wider text-[#567C8D] mb-2">
                Customer &amp; Internal Notes
              </h3>
              <p className="text-[#52606D]">
                <strong>Customer Note:</strong> {order.customerNotes || 'None'}
              </p>
              <p className="text-[#2F4156] mt-2">
                <strong>Internal Staff Note:</strong> {order.internalNotes || 'None'}
              </p>
            </div>
          </div>

          {/* Order Status Audit Timeline */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
              Order Status &amp; Staff Audit Timeline
            </h2>
            <div className="space-y-3">
              {order.statusHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE]/60 p-3.5 text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#567C8D] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#2F4156]">
                        {h.previousStatus ? `${h.previousStatus} → ` : ''}
                        {h.status}
                      </span>
                      <span className="text-[11px] text-[#52606D]">
                        {formatDate(h.createdAt, true)} • by {h.changedByName}
                      </span>
                    </div>
                    <p className="text-[#52606D] mt-0.5">{h.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Status Update, Staff Assignment, Payment & Refund */}
        <div className="lg:col-span-5 space-y-6">
          {/* Update Status & Courier Form */}
          {permissions.canUpdateStatus && (
            <form
              onSubmit={handleSaveStatus}
              className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4"
            >
              <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
                Update Order Status &amp; Courier
              </h3>

              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Order Status (Auto-adjusts stock on Confirm / Cancel / Return)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2.5 text-xs font-semibold text-[#2F4156]"
                >
                  {[
                    'PENDING',
                    'CONFIRMED',
                    'PROCESSING',
                    'READY_FOR_SHIPMENT',
                    'SHIPPED',
                    'DELIVERED',
                    'CANCELLED',
                    'RETURNED',
                    'REFUNDED',
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#2F4156] mb-1">
                    Courier Provider
                  </label>
                  <select
                    value={courierProvider}
                    onChange={(e) =>
                      setCourierProvider(e.target.value as CourierProvider)
                    }
                    className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                  >
                    <option value="INTERNAL_DELIVERY">Internal Rider</option>
                    <option value="STEADFAST">Steadfast Courier</option>
                    <option value="PATHAO">Pathao Courier</option>
                    <option value="REDX">RedX Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2F4156] mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Internal Staff Note
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2F4156] mb-1">
                  Status Change Reason / Timeline Note
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Confirmed via phone call with customer"
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={updatingStatus}
                className="w-full rounded-xl bg-[#567C8D] py-2.5 text-xs font-semibold text-white hover:bg-[#486878]"
              >
                {updatingStatus ? 'Updating...' : 'Save Order Status & Sync Inventory'}
              </button>
            </form>
          )}

          {/* Staff Assignment Panel */}
          {permissions.canAssign && (
            <form
              onSubmit={handleAssignStaff}
              className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4"
            >
              <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
                Assign Moderator / Fulfillment / Rider
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#2F4156] mb-1">
                    Staff Member
                  </label>
                  <select
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2F4156] mb-1">
                    Task Role
                  </label>
                  <select
                    value={assignRoleType}
                    onChange={(e) =>
                      setAssignRoleType(
                        e.target.value as
                          | 'MODERATOR'
                          | 'ORDER_PROCESSING'
                          | 'DELIVERY_STAFF'
                      )
                    }
                    className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                  >
                    <option value="MODERATOR">Moderator (Confirm)</option>
                    <option value="ORDER_PROCESSING">Order Processing</option>
                    <option value="DELIVERY_STAFF">Delivery Rider</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Assignment instructions..."
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
              />

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2F4156] py-2.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Assign Staff Member</span>
              </button>

              {order.assignments.length > 0 && (
                <div className="pt-2 border-t border-[#E8E0D9] space-y-1.5 text-xs">
                  <p className="font-semibold text-[#2F4156]">Current Assignments:</p>
                  {order.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex justify-between rounded-lg bg-[#F5F1EE] px-3 py-1.5"
                    >
                      <span className="font-medium text-[#2F4156]">{a.staffName}</span>
                      <span className="text-[10px] font-semibold text-[#567C8D]">
                        {a.roleType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* Payment Verification & Refund */}
          {permissions.canVerifyPayment && (
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
              <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
                Payment Verification &amp; Refunds
              </h3>

              <form onSubmit={handleVerifyPayment} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#2F4156] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PAID">PAID</option>
                      <option value="FAILED">FAILED</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#2F4156] mb-1">
                      Collected Cash (৳)
                    </label>
                    <input
                      type="number"
                      value={collectedCash}
                      onChange={(e) => setCollectedCash(e.target.value)}
                      className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={trxRef}
                  onChange={(e) => setTrxRef(e.target.value)}
                  placeholder="Transaction Ref / Bank Slip / bKash TrxID"
                  className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2 text-xs font-mono"
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#567C8D] py-2 text-xs font-semibold text-white hover:bg-[#486878]"
                >
                  Verify &amp; Save Payment Record
                </button>
              </form>

              <div className="border-t border-[#E8E0D9] pt-4 space-y-2">
                <p className="text-xs font-semibold text-rose-800">
                  Issue Full Refund &amp; Restock Inventory
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Reason for refund..."
                    className="flex-1 rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleProcessRefund}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Refund
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
