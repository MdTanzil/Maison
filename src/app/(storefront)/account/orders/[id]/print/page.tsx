import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { InvoicePrintView } from '@/components/admin/invoice-print-view';

export const dynamic = 'force-dynamic';

export default async function CustomerOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  const { id } = await params;
  const sp = await searchParams;
  const initialFormat = sp.format === '80mm' ? '80mm' : 'a4';

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { items: true, shipment: true },
    }),
    prisma.websiteSettings.findUnique({ where: { id: 'default' } }),
  ]);

  if (!order) {
    notFound();
  }

  const isOwner = order.customerId === user.id || order.customerEmail === user.email;
  if (!isOwner) {
    redirect('/account');
  }

  return (
    <InvoicePrintView
      initialFormat={initialFormat}
      backHref="/account"
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
      orders={[
        {
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
        },
      ]}
    />
  );
}
