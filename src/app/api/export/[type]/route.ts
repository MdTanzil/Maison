import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (!user || !user.isStaff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await context.params;

  if (type === 'products') {
    if (!hasPermission(user, 'products.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const products = await prisma.product.findMany({
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Title',
      'SKU',
      'Barcode',
      'Category',
      'Brand',
      'RegularPrice',
      'SalePrice',
      'StockQuantity',
      'LowStockThreshold',
      'Status',
    ];
    const rows = products.map((p) =>
      [
        p.title,
        p.sku,
        p.barcode || '',
        p.category.name,
        p.brand?.name || '',
        p.regularPrice,
        p.salePrice ?? p.regularPrice,
        p.stockQuantity,
        p.lowStockThreshold,
        p.status,
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="maison-beige-products-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === 'orders') {
    if (!hasPermission(user, 'orders.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const orders = await prisma.order.findMany({
      include: { shipment: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'OrderNumber',
      'Date',
      'CustomerName',
      'Phone',
      'City',
      'Subtotal',
      'Discount',
      'Shipping',
      'GrandTotal',
      'PaymentMethod',
      'PaymentStatus',
      'OrderStatus',
      'TrackingNumber',
    ];
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.customerName,
        o.customerPhone,
        o.shippingCity,
        o.subtotal,
        o.discountAmount,
        o.shippingCharge,
        o.grandTotal,
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        o.shipment?.trackingNumber || '',
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="maison-beige-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === 'customers') {
    if (!hasPermission(user, 'customers.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const customers = await prisma.user.findMany({
      where: {
        userRoles: { some: { role: { slug: 'CUSTOMER' } } },
      },
      include: { customerProfile: true, orders: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Name',
      'Email',
      'Phone',
      'TotalOrders',
      'TotalSpent',
      'Status',
      'JoinedDate',
    ];
    const rows = customers.map((c) => {
      const spent = c.orders.reduce((acc, o) => acc + Number(o.grandTotal), 0);
      return [
        c.name,
        c.email,
        c.phone || '',
        c.orders.length,
        spent.toFixed(2),
        c.isBlocked ? 'BLOCKED' : 'ACTIVE',
        c.createdAt.toISOString().slice(0, 10),
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="maison-beige-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
}
