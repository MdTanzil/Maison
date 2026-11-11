'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Truck, Send } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { dispatchCourierShipmentAction } from '@/actions/admin-actions';
import { DeliveryQuickActions } from './delivery-quick-actions';
import { useStore } from '@/components/storefront/store-provider';
import { GatewayStatus } from '@/lib/services/integrations';
import { CourierProvider } from '@prisma/client';

export function ShippingAdminClient({
  shipments,
  shippingMethods,
  deliveryRiders,
  couriers,
  canManageShipping,
}: {
  shipments: Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    orderStatus: string;
    courierProvider: CourierProvider;
    trackingNumber: string;
    deliveryStaffId: string | null;
    deliveryStaffName: string;
    status: string;
    codAmount: number;
    collectedCash: number;
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
  }>;
  shippingMethods: Array<{
    id: string;
    name: string;
    code: string;
    zoneType: string;
    charge: number;
    estimatedDays: string;
  }>;
  deliveryRiders: Array<{ id: string; name: string }>;
  couriers: GatewayStatus[];
  canManageShipping: boolean;
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [selectedCourier, setSelectedCourier] = useState<Record<string, CourierProvider>>(
    Object.fromEntries(shipments.map((s) => [s.orderId, s.courierProvider]))
  );
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>(
    Object.fromEntries(
      shipments.map((s) => [s.orderId, s.deliveryStaffId || deliveryRiders[0]?.id || ''])
    )
  );

  const handleDispatch = async (orderId: string, orderNumber: string) => {
    const provider = selectedCourier[orderId] || 'STEADFAST';
    const riderId = selectedRider[orderId] || undefined;

    const res = await dispatchCourierShipmentAction({
      orderId,
      courierProvider: provider,
      deliveryStaffId: riderId,
    });

    if (res.ok) {
      showToast(
        'Parcel Dispatched',
        `${orderNumber} booked via ${provider} (Tracking: ${res.trackingNumber})`,
        'success'
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          Logistics &amp; Courier Hub
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
          Shipping Zones, Couriers &amp; Rider Dispatch
        </h1>
      </div>

      {/* Courier Integrations & Shipping Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {couriers.map((c) => (
            <div
              key={c.code}
              className="rounded-2xl border border-[#E8E0D9] bg-white p-4 shadow-luxury flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-[#2F4156]">{c.name}</span>
                <p className="text-[11px] text-[#52606D] mt-1">{c.description}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E8E0D9] text-[10px]">
                <span className="font-semibold text-[#567C8D]">Env: </span>
                <span className="font-mono text-[#52606D]">
                  {c.requiredEnvVars[0]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury space-y-2.5 text-xs">
          <h3 className="font-serif text-base font-semibold text-[#2F4156]">
            Configured Shipping Zones &amp; Rates
          </h3>
          {shippingMethods.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl bg-[#F5F1EE] px-3.5 py-2 border border-[#E8E0D9]"
            >
              <div>
                <p className="font-semibold text-[#2F4156]">{m.name}</p>
                <p className="text-[10px] text-[#52606D]">{m.estimatedDays}</p>
              </div>
              <span className="font-bold text-[#567C8D]">
                {formatCurrency(m.charge)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipments & Rider Dispatch Table */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
        <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
          Active Shipments &amp; Courier Consignments ({shipments.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3 px-3 font-semibold">Order / Tracking</th>
                <th className="py-3 px-3 font-semibold">Recipient &amp; Address</th>
                <th className="py-3 px-3 font-semibold">Courier &amp; Rider Assignment</th>
                <th className="py-3 px-3 font-semibold">COD / Collected</th>
                <th className="py-3 px-3 font-semibold">Delivery &amp; Cash Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-[#F5F1EE]/50">
                  <td className="py-3 px-3">
                    <Link
                      href={`/admin/orders/${s.orderId}`}
                      className="font-mono font-bold text-[#567C8D] hover:underline"
                    >
                      {s.orderNumber}
                    </Link>
                    <p className="font-mono text-[11px] text-[#2F4156]">
                      {s.trackingNumber}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-[#2F4156]">{s.recipientName}</p>
                    <p className="text-[11px] text-[#52606D]">
                      {s.recipientPhone} • {s.deliveryAddress}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    {canManageShipping ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={selectedCourier[s.orderId] || s.courierProvider}
                          onChange={(e) =>
                            setSelectedCourier((prev) => ({
                              ...prev,
                              [s.orderId]: e.target.value as CourierProvider,
                            }))
                          }
                          className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2 py-1 text-[11px]"
                        >
                          <option value="INTERNAL_DELIVERY">Internal Rider</option>
                          <option value="STEADFAST">Steadfast</option>
                          <option value="PATHAO">Pathao</option>
                          <option value="REDX">RedX</option>
                        </select>
                        <select
                          value={selectedRider[s.orderId] || ''}
                          onChange={(e) =>
                            setSelectedRider((prev) => ({
                              ...prev,
                              [s.orderId]: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] px-2 py-1 text-[11px]"
                        >
                          {deliveryRiders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDispatch(s.orderId, s.orderNumber)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2F4156] px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          <Send className="h-3 w-3" />
                          <span>Dispatch</span>
                        </button>
                      </div>
                    ) : (
                      <span>
                        {s.courierProvider} • {s.deliveryStaffName}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-[#2F4156]">
                      Due: {formatCurrency(s.codAmount)}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Collected: {formatCurrency(s.collectedCash)}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <DeliveryQuickActions
                      orderId={s.orderId}
                      orderNumber={s.orderNumber}
                      codAmount={s.codAmount}
                      currentStatus={s.orderStatus}
                    />
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
