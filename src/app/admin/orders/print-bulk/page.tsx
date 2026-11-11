import React from 'react';
import { redirect } from 'next/navigation';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { InvoicePrintView } from '@/components/admin/invoice-print-view';

export const dynamic = 'force-dynamic';

export default async function BulkOrderPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; format?: string }>;
}) {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, 'orders.print_memo')) {
    redirect('/admin');
  }

  const sp = await searchParams;
  const idList = sp.ids
    ? sp.ids
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: idList.length > 0 ? { id: { in: idList } } : undefined,
      include: { items: true, shipment: true },
      orderBy: { createdAt: 'desc' },
      take: idList.length > 0 ? 50 : 5,
    }),
    prisma.websiteSettings.findUnique({ where: { id: 'default' } }),
  ]);

  return (
    <InvoicePrintView
      initialFormat={sp.format === '80mm' ? '80mm' : 'a4'}
      backHref="/admin/orders"
      store={{
        storeName: settings?.storeName || 'MAISON BEIGE',
        tagline: settings?.tagline || 'Quiet Luxury & Timeless Essentials',
        address: settings?.address || 'House 42, Road 11, Banani, Dhaka 1213',
        contactPhone: settings?.contactPhone || '+880 1711-000001',
        contactEmail: settings?.contactEmail || 'concierge@maisonbeige.com',
        invoiceHeaderNote: settings?.invoiceHeaderNote || 'Official Tax Invoice & Order Memo',
        invoiceFooterNote:
          settings?.invoiceFooterNote ||
          'Thank you for choosing Maison Beige. Each piece is crafted for enduring elegance.',
        invoiceTerms:
          settings?.invoiceTerms ||
          'Goods once sold can be exchanged within 7 days in unused condition with original tags and invoice.',
      }}
      orders={orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        shippingAddressLine: order.shippingAddressLine,
        shippingArea: order.shippingArea,
        shippingCity: order.shippingCity,
        shippingPostalCode: order.shippingPostalCode,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        shippingCharge: Number(order.shippingCharge),
        grandTotal: Number(order.grandTotal),
        couponCode: order.couponCode,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        customerNotes: order.customerNotes,
        trackingNumber: order.shipment?.trackingNumber ?? null,
        courierProvider: order.shipment?.courierProvider ?? null,
        items: order.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          variantName: it.variantName,
          sku: it.sku,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
        })),
      }))}
    />
  );
}
