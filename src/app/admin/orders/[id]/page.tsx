import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { OrderDetailClient } from '@/components/admin/order-detail-client';
import { getAllowedTargetStatuses } from '@/lib/orders/status-rules';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureDatabaseReady();
  const { id } = await params;
  const user = (await getCurrentUser())!;
  if (!user || !hasPermission(user, 'orders.view')) {
    redirect('/admin');
  }

  const [order, staffUsers] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        assignments: { include: { staff: true }, orderBy: { assignedAt: 'desc' } },
        payments: true,
        refunds: true,
        shipment: { include: { deliveryStaff: true } },
      },
    }),
    prisma.user.findMany({
      where: { staffProfile: { isNot: null }, isActive: true },
      include: { userRoles: { include: { role: true } } },
    }),
  ]);

  if (!order) {
    notFound();
  }

  const isDeliveryOnly =
    user.roles.includes('DELIVERY_STAFF') && !user.isSuperAdmin && !hasPermission(user, 'reports.view');
  const isAssigned =
    order.assignments.some((a) => a.staffId === user.id) ||
    order.shipment?.deliveryStaffId === user.id;
  if (isDeliveryOnly && !isAssigned) {
    redirect('/admin/orders');
  }

  return (
    <OrderDetailClient
      allowedStatuses={getAllowedTargetStatuses(order.status, {
        permissions: user.permissions,
        isSuperAdmin: user.isSuperAdmin,
        isAssigned,
      })}
      permissions={{
        canUpdateStatus:
          hasPermission(user, 'orders.update_status') ||
          hasPermission(user, 'orders.confirm') ||
          hasPermission(user, 'delivery.update'),
        canAssign: hasPermission(user, 'orders.assign'),
        canVerifyPayment: hasPermission(user, 'payments.verify'),
      }}
      staffList={staffUsers.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.userRoles[0]?.role.name || 'Staff',
      }))}
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        shippingAddressLine: order.shippingAddressLine,
        shippingArea: order.shippingArea,
        shippingCity: order.shippingCity,
        shippingPostalCode: order.shippingPostalCode,
        shippingZone: order.shippingZone,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        shippingCharge: Number(order.shippingCharge),
        grandTotal: Number(order.grandTotal),
        couponCode: order.couponCode,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        stockDeducted: order.stockDeducted,
        customerNotes: order.customerNotes,
        internalNotes: order.internalNotes,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          variantName: it.variantName,
          sku: it.sku,
          imageUrl: it.imageUrl,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
        })),
        statusHistory: order.statusHistory.map((h) => ({
          id: h.id,
          status: h.status,
          previousStatus: h.previousStatus,
          note: h.note,
          changedByName: h.changedByName || 'Staff',
          createdAt: h.createdAt.toISOString(),
        })),
        assignments: order.assignments.map((a) => ({
          id: a.id,
          staffName: a.staff.name,
          roleType: a.roleType,
          status: a.status,
          notes: a.notes,
          assignedAt: a.assignedAt.toISOString(),
        })),
        payment: order.payments[0]
          ? {
              id: order.payments[0].id,
              transactionRef: order.payments[0].transactionRef,
              collectedCashAmount: Number(order.payments[0].collectedCashAmount),
              status: order.payments[0].status,
            }
          : null,
        shipment: order.shipment
          ? {
              courierProvider: order.shipment.courierProvider,
              trackingNumber: order.shipment.trackingNumber,
              deliveryStaffName: order.shipment.deliveryStaff?.name ?? null,
              status: order.shipment.status,
            }
          : null,
      }}
    />
  );
}
