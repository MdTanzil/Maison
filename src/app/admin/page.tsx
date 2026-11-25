import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Printer,
  Truck,
  ArrowRight,
  ShieldCheck,
  Activity,
  Bell,
} from 'lucide-react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DashboardCharts } from '@/components/admin/dashboard-charts';
import { DeliveryQuickActions } from '@/components/admin/delivery-quick-actions';
import { DashboardAutoRefresh } from '@/components/admin/dashboard-auto-refresh';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await ensureDatabaseReady();
  const user = (await getCurrentUser())!;
  const params = await searchParams;
  const range = params.range || '30d';

  const now = new Date();
  const dhakaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const dhakaMidnight = new Date(
    Date.UTC(dhakaNow.getFullYear(), dhakaNow.getMonth(), dhakaNow.getDate()) - 6 * 3600 * 1000
  );
  let startDate: Date | undefined;
  if (range === 'today') {
    startDate = dhakaMidnight;
  } else if (range === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  } else if (range === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  } else if (range === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  }

  const canViewFinancials = hasPermission(user, 'reports.view');
  const isDeliveryOnly =
    user.roles.includes('DELIVERY_STAFF') && !user.isSuperAdmin && !canViewFinancials;

  const [
    orders,
    allProducts,
    totalCustomers,
    staffMembers,
    recentLogs,
    assignedToMe,
    myShipments,
    unreadAssignmentNotifications,
  ] = await Promise.all([
    prisma.order.findMany({
      where: startDate ? { createdAt: { gte: startDate } } : undefined,
      include: {
        items: true,
        shipment: true,
        assignments: { include: { staff: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      include: { category: true, images: true },
      orderBy: { soldCount: 'desc' },
    }),
    prisma.user.count({
      where: { userRoles: { some: { role: { slug: 'CUSTOMER' } } } },
    }),
    prisma.user.findMany({
      where: { staffProfile: { isNot: null } },
      include: { staffProfile: true, userRoles: { include: { role: true } } },
    }),
    prisma.staffActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.orderAssignment.findMany({
      where: { staffId: user.id },
      include: {
        order: { include: { items: true, shipment: true } },
      },
      orderBy: { assignedAt: 'desc' },
    }),
    prisma.shipment.findMany({
      where: isDeliveryOnly
        ? {
            OR: [
              { deliveryStaffId: user.id },
              { order: { assignments: { some: { staffId: user.id } } } },
            ],
          }
        : {},
      include: { order: true, deliveryStaff: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.notification.findMany({
      where: { userId: user.id, type: 'ORDER_ASSIGNED', isRead: false },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const recentOrders = isDeliveryOnly
    ? assignedToMe.map((a) => a.order).slice(0, 6)
    : orders.slice(0, 6);

  const activeOrders = orders.filter((o) => !['CANCELLED', 'REFUNDED', 'RETURNED'].includes(o.status));
  const totalRevenue = activeOrders.reduce((acc, o) => acc + Number(o.grandTotal), 0);

  const startOfToday = dhakaMidnight;
  const todaysSales = activeOrders
    .filter((o) => o.createdAt >= startOfToday)
    .reduce((acc, o) => acc + Number(o.grandTotal), 0);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED').length;
  const processingOrders = orders.filter((o) =>
    ['PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED'].includes(o.status)
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelledOrders = orders.filter((o) =>
    ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status)
  ).length;

  const lowStockProducts = allProducts.filter(
    (p) => p.stockQuantity <= p.lowStockThreshold
  );

  // Build daily chart series
  const dateMap = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'Asia/Dhaka' });
    dateMap.set(label, { date: label, revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    const label = o.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      timeZone: 'Asia/Dhaka',
    });
    const entry = dateMap.get(label) || { date: label, revenue: 0, orders: 0 };
    if (!['CANCELLED', 'REFUNDED'].includes(o.status)) {
      entry.revenue += Number(o.grandTotal);
    }
    entry.orders += 1;
    dateMap.set(label, entry);
  }
  const salesByDate = Array.from(dateMap.values());

  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div className="space-y-8">
      <DashboardAutoRefresh />
      {/* New order assignment notifications */}
      {unreadAssignmentNotifications.length > 0 && (
        <div className="rounded-2xl border border-[#567C8D]/40 bg-[#C8D9E6]/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 shrink-0 text-[#567C8D]" />
            <p className="text-sm font-semibold text-[#2F4156]">
              You have {unreadAssignmentNotifications.length} new order
              assignment{unreadAssignmentNotifications.length > 1 ? 's' : ''}
            </p>
          </div>
          <p className="text-xs text-[#52606D] flex-1 leading-relaxed">
            {unreadAssignmentNotifications[0].message}
          </p>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#567C8D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#486878] shrink-0"
          >
            View orders
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Top Welcome & Date Range Filter Bar */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#C8D9E6] px-3 py-0.5 text-xs font-semibold text-[#2F4156]">
              {user.roleNames.join(' • ')} Dashboard
            </span>
            <span className="text-xs text-[#52606D]">
              Live PostgreSQL Business Telemetry
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1.5">
            Good Day, {user.name}
          </h1>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'today', label: 'Today' },
            { key: '7d', label: 'Last 7 Days' },
            { key: '30d', label: 'Last 30 Days' },
            { key: '90d', label: 'Last 90 Days' },
            { key: 'all', label: 'All Time' },
          ].map((item) => (
            <Link
              key={item.key}
              href={`/admin?range=${item.key}`}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                range === item.key
                  ? 'bg-[#567C8D] text-white shadow-sm'
                  : 'bg-[#F5F1EE] text-[#2F4156] hover:bg-[#E8E0D9]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards — Role-Aware */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {canViewFinancials ? (
          <>
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                  Total Revenue
                </span>
                <div className="rounded-xl bg-[#F5F1EE] p-2.5 text-[#567C8D]">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#2F4156] mt-3">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-[#567C8D] mt-1">
                Today&apos;s Sales: {formatCurrency(todaysSales)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                  Total Orders
                </span>
                <div className="rounded-xl bg-[#F5F1EE] p-2.5 text-[#567C8D]">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#2F4156] mt-3">{orders.length}</p>
              <p className="text-xs text-[#52606D] mt-1">
                {pendingOrders} Pending • {deliveredOrders} Delivered
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                  Catalog &amp; Low Stock
                </span>
                <div className="rounded-xl bg-[#F5F1EE] p-2.5 text-[#567C8D]">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#2F4156] mt-3">
                {allProducts.length} Pieces
              </p>
              <p className="text-xs text-amber-700 font-medium mt-1">
                {lowStockProducts.length} Low-Stock Alerts
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                  Registered Patrons
                </span>
                <div className="rounded-xl bg-[#F5F1EE] p-2.5 text-[#567C8D]">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#2F4156] mt-3">{totalCustomers}</p>
              <p className="text-xs text-[#52606D] mt-1">
                {staffMembers.length} Active Staff Accounts
              </p>
            </div>
          </>
        ) : (
          /* Moderator / Processing / Delivery Non-Financial Summary Cards */
          <>
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                Assigned to Me
              </span>
              <p className="text-2xl font-bold text-[#2F4156] mt-2">
                {assignedToMe.length} Orders
              </p>
              <p className="text-xs text-[#567C8D] mt-1">Active operational queue</p>
            </div>
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                Pending Confirmations
              </span>
              <p className="text-2xl font-bold text-amber-700 mt-2">{pendingOrders}</p>
              <p className="text-xs text-[#52606D] mt-1">Awaiting customer call</p>
            </div>
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                Processing &amp; In Transit
              </span>
              <p className="text-2xl font-bold text-[#567C8D] mt-2">{processingOrders}</p>
              <p className="text-xs text-[#52606D] mt-1">Packaging &amp; courier queue</p>
            </div>
            <div className="rounded-2xl border border-[#E8E0D9] bg-white p-5 shadow-luxury">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52606D]">
                Completed / Delivered
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-2">{deliveredOrders}</p>
              <p className="text-xs text-[#52606D] mt-1">
                {cancelledOrders} Cancelled / Returned
              </p>
            </div>
          </>
        )}
      </div>

      {/* Order Status Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending', count: pendingOrders, color: 'bg-amber-50 text-amber-800 border-amber-200' },
          { label: 'Confirmed', count: confirmedOrders, color: 'bg-[#C8D9E6]/60 text-[#2F4156] border-[#C8D9E6]' },
          { label: 'Processing / Shipped', count: processingOrders, color: 'bg-[#F5F1EE] text-[#567C8D] border-[#E8E0D9]' },
          { label: 'Delivered', count: deliveredOrders, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
          { label: 'Cancelled / Returned', count: cancelledOrders, color: 'bg-rose-50 text-rose-800 border-rose-200' },
        ].map((st) => (
          <div
            key={st.label}
            className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 ${st.color}`}
          >
            <span className="text-xs font-semibold min-w-0">{st.label}</span>
            <span className="text-base font-bold">{st.count}</span>
          </div>
        ))}
      </div>

      {/* Recharts Analytics Section */}
      <DashboardCharts
        salesByDate={salesByDate}
        statusBreakdown={statusBreakdown}
        canViewFinancials={canViewFinancials}
      />

      {/* Delivery Staff & Logistics Live Queue */}
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#567C8D]">
              Last-Mile Logistics &amp; Cash Collection
            </span>
            <h2 className="font-serif text-xl font-semibold text-[#2F4156]">
              Assigned Deliveries &amp; COD Collection Desk
            </h2>
          </div>
          <Link
            href="/admin/shipping"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#567C8D] hover:underline"
          >
            <span>Open Full Shipping Module</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Order / Tracking</th>
                <th className="py-3 px-4 font-semibold">Recipient &amp; Address</th>
                <th className="py-3 px-4 font-semibold">Courier / Rider</th>
                <th className="py-3 px-4 font-semibold">COD Due</th>
                <th className="py-3 px-4 font-semibold">Cash Collected</th>
                <th className="py-3 px-4 font-semibold">Quick Delivery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D9]">
              {myShipments.slice(0, 5).map((sh) => (
                <tr key={sh.id} className="hover:bg-[#F5F1EE]/50">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${sh.orderId}`}
                      className="font-mono font-bold text-[#567C8D] hover:underline"
                    >
                      {sh.order.orderNumber}
                    </Link>
                    <p className="text-[11px] font-mono text-[#52606D]">
                      {sh.trackingNumber || 'No Tracking'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#2F4156]">{sh.recipientName}</p>
                    <p className="text-[11px] text-[#52606D]">
                      {sh.recipientPhone} • {sh.deliveryAddress}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded-md bg-[#F5F1EE] px-2 py-0.5 font-medium text-[#2F4156]">
                      {sh.courierProvider}
                    </span>
                    <p className="text-[11px] text-[#52606D] mt-0.5">
                      {sh.deliveryStaff?.name || 'Unassigned'}
                    </p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#2F4156] whitespace-nowrap">
                    {formatCurrency(Number(sh.codAmount))}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                    {formatCurrency(Number(sh.collectedCash))}
                  </td>
                  <td className="py-3 px-4">
                    <DeliveryQuickActions
                      orderId={sh.orderId}
                      orderNumber={sh.order.orderNumber}
                      codAmount={Number(sh.codAmount)}
                      currentStatus={sh.order.status}
                      canReturn={hasPermission(user, 'orders.cancel')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders, Low Stock Alerts & Staff Performance/Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-[#567C8D] hover:underline"
            >
              Manage All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E0D9] bg-[#F5F1EE] text-[#2F4156]">
                  <th className="py-2.5 px-3 font-semibold">Order ID</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Total</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Memo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D9]">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F5F1EE]/50">
                    <td className="py-3 px-3 font-mono font-bold text-[#567C8D] whitespace-nowrap">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-[#2F4156]">{o.customerName}</p>
                      <p className="text-[11px] text-[#52606D]">{o.customerPhone}</p>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#2F4156] whitespace-nowrap">
                      {formatCurrency(Number(o.grandTotal))}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-[#C8D9E6]/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#2F4156]">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/orders/${o.id}/print?format=a4`}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F5F1EE] px-2.5 py-1 text-[11px] font-medium text-[#2F4156] hover:bg-[#567C8D] hover:text-white transition-colors"
                      >
                        <Printer className="h-3 w-3" />
                        Print
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts & Staff Activity Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Low Stock Alerts */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
                  Low-Stock Alerts ({lowStockProducts.length})
                </h3>
              </div>
              <Link
                href="/admin/inventory"
                className="text-xs font-semibold text-[#567C8D] hover:underline"
              >
                Restock →
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-[#52606D]">
                All products are stocked above their threshold.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#2F4156]">{p.title}</p>
                      <p className="text-[11px] text-[#52606D]">
                        SKU: {p.sku} • Threshold: {p.lowStockThreshold}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 font-bold text-amber-950 shrink-0 whitespace-nowrap">
                      {p.stockQuantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff Audit Activity Stream */}
          <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#567C8D]" />
                <h3 className="font-serif text-lg font-semibold text-[#2F4156]">
                  Live Staff Activity Audit Log
                </h3>
              </div>
              {hasPermission(user, 'staff.manage') && (
                <Link
                  href="/admin/staff"
                  className="text-xs font-semibold text-[#567C8D] hover:underline"
                >
                  Full Log →
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-[#E8E0D9] bg-[#F5F1EE]/60 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-[#2F4156]">
                      {log.staffName}{' '}
                      <span className="text-[10px] text-[#567C8D]">({log.roleName})</span>
                    </span>
                    <span className="text-[10px] text-[#52606D]">
                      {formatDate(log.createdAt, true)}
                    </span>
                  </div>
                  <p className="text-[#52606D] mt-1">{log.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
