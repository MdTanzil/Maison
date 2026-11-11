'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Users,
  UserCheck,
  Tag,
  CreditCard,
  Truck,
  BarChart3,
  Settings,
  Printer,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Bell,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { SessionUser } from '@/lib/auth/session';
import { logoutAction } from '@/actions/auth-actions';
import { useStore } from '@/components/storefront/store-provider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Order Management', icon: ShoppingBag, permission: 'orders.view' },
  { href: '/admin/products', label: 'Products & Catalog', icon: Package, permission: 'products.view' },
  { href: '/admin/categories', label: 'Categories & Brands', icon: Layers, permission: 'categories.manage' },
  { href: '/admin/inventory', label: 'Inventory & Stock', icon: Boxes, permission: 'inventory.view' },
  { href: '/admin/customers', label: 'Customers (CRM)', icon: Users, permission: 'customers.view' },
  { href: '/admin/staff', label: 'Staff & RBAC Roles', icon: UserCheck, permission: 'staff.manage' },
  { href: '/admin/payments', label: 'Payments & Refunds', icon: CreditCard, permission: 'payments.view' },
  { href: '/admin/shipping', label: 'Shipping & Couriers', icon: Truck, permission: 'orders.view' },
  { href: '/admin/coupons', label: 'Coupons & Promotions', icon: Tag, permission: 'coupons.manage' },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3, permission: 'reports.view' },
  { href: '/admin/settings', label: 'Website Settings', icon: Settings, permission: 'settings.manage' },
];

export function AdminShell({
  user,
  storeName = 'MAISON BEIGE',
  children,
}: {
  user: SessionUser;
  storeName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    if (user.isSuperAdmin) return true;
    return user.permissions.includes(item.permission);
  });

  const handleLogout = async () => {
    await logoutAction();
    showToast('Signed Out', 'Ended staff session safely.', 'info');
    router.push('/auth/login');
    router.refresh();
  };

  const handleQuickOrderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    router.push(`/admin/orders?q=${encodeURIComponent(quickSearch.trim())}`);
  };

  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1F2933] flex">
      {/* Sidebar — White & Warm Beige Luxury Surface (No Navy background!) */}
      <aside
        className={`admin-sidebar no-print fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#E8E0D9] bg-white transition-all duration-300 lg:static ${
          collapsed ? 'w-20' : 'w-64'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-[#E8E0D9] px-5">
          {!collapsed && (
            <Link href="/admin" className="flex flex-col">
              <span className="font-serif text-lg font-bold tracking-[0.16em] text-[#2F4156]">
                {storeName}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#567C8D]">
                Atelier Console
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setSidebarOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="rounded-lg p-2 text-[#2F4156] hover:bg-[#F5F1EE]"
            title="Toggle Sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Active Role Pill */}
        {!collapsed && (
          <div className="mx-4 mt-4 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2F4156]">
              <Shield className="h-3.5 w-3.5 text-[#567C8D]" />
              <span className="truncate">{user.roleNames[0] || 'Staff'}</span>
            </div>
            <p className="text-[11px] text-[#52606D] truncate mt-0.5">{user.email}</p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#567C8D] text-white shadow-sm'
                    : 'text-[#2F4156] hover:bg-[#F5F1EE] hover:text-[#567C8D]'
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Storefront & Logout Actions */}
        <div className="border-t border-[#E8E0D9] p-3 space-y-1.5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl bg-[#F5F1EE] px-3.5 py-2.5 text-xs font-medium text-[#2F4156] hover:bg-[#C8D9E6]/60 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-[#567C8D] shrink-0" />
            {!collapsed && <span>View Live Storefront</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="admin-topbar no-print sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-[#E8E0D9] bg-white/95 backdrop-blur px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 text-[#2F4156] hover:bg-[#F5F1EE]"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="breadcrumb-nav hidden sm:flex items-center gap-1.5 text-xs text-[#52606D]">
              <Link href="/admin" className="hover:text-[#567C8D] font-medium">
                Console
              </Link>
              {pathSegments.slice(1).map((seg, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="capitalize font-semibold text-[#2F4156]">
                    {seg.replace(/-/g, ' ')}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Global Order/Customer Quick Search */}
          <form
            onSubmit={handleQuickOrderSearch}
            className="hidden md:flex flex-1 max-w-md mx-4"
          >
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Quick search order ID (MB-26...), phone, customer..."
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-4 py-2 text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D] focus:bg-white"
            />
          </form>

          {/* Right User Badge & Quick Print Link */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders/print-bulk"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-xs font-medium text-[#2F4156] hover:border-[#567C8D]"
            >
              <Printer className="h-3.5 w-3.5 text-[#567C8D]" />
              <span>Bulk Memo Print</span>
            </Link>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-1.5">
              <div className="h-7 w-7 rounded-full bg-[#567C8D] text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[#2F4156] leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#567C8D] font-medium">
                  {user.roleNames.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
