import type { OrderStatus } from '@prisma/client';

// Allowed NEXT statuses from each current status (same-status is handled
// separately as a metadata-only save; REFUNDED never appears here — refunds
// go through processOrderRefundAction only).
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_SHIPMENT', 'CANCELLED'],
  READY_FOR_SHIPMENT: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
  REFUNDED: [],
};

// Which permission(s) may set each target status. `delivery.update` entries
// are additionally assignment-scoped (see isAssigned flag) — enforced in the
// server action, not here.
export function maySetStatus(
  target: OrderStatus,
  opts: { permissions: string[]; isSuperAdmin: boolean; isAssigned: boolean }
): boolean {
  const { permissions, isSuperAdmin, isAssigned } = opts;
  if (isSuperAdmin) return target !== 'REFUNDED'; // Super Admin override (see §3.6)
  const has = (code: string) => permissions.includes(code);
  switch (target) {
    case 'CONFIRMED':
      return has('orders.confirm') || has('orders.update_status');
    case 'PROCESSING':
    case 'READY_FOR_SHIPMENT':
    case 'SHIPPED':
      return has('orders.update_status');
    case 'DELIVERED':
      return has('orders.update_status') || (has('delivery.update') && isAssigned);
    case 'CANCELLED':
      return has('orders.cancel');
    case 'RETURNED':
      return has('orders.cancel');
    case 'PENDING':
    case 'REFUNDED':
      return false; // PENDING is initial-only; REFUNDED only via the refund action
  }
}

// Full allowed-target list for one order + one caller. Used by the server
// action (authoritative) and by pages to build dropdown options (guidance).
export function getAllowedTargetStatuses(
  current: OrderStatus,
  opts: { permissions: string[]; isSuperAdmin: boolean; isAssigned: boolean }
): OrderStatus[] {
  return ORDER_TRANSITIONS[current].filter((t) => maySetStatus(t, opts));
}
