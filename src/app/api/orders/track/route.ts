import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  await ensureDatabaseReady();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Order number or tracking code is required' }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: { equals: query, mode: 'insensitive' } },
        { customerPhone: { contains: query } },
        { shipment: { trackingNumber: { equals: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      shipment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: 'No matching order found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      shippingCity: order.shippingCity,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingCharge: Number(order.shippingCharge),
      couponCode: order.couponCode,
      grandTotal: Number(order.grandTotal),
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
      })),
      shipment: order.shipment
        ? {
            courierProvider: order.shipment.courierProvider,
            trackingNumber: order.shipment.trackingNumber,
            status: order.shipment.status,
          }
        : null,
      statusHistory: order.statusHistory,
    },
  });
}
