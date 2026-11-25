'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
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
  Loader2,
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

// Minimum time the nav spinner stays visible after a click, in milliseconds.
// Admin routes render a loading.tsx fallback almost immediately, which settles
// the navigation transition in milliseconds — without a floor the spinner
// would never be seen.
const NAV_SPINNER_MIN_MS = 1200;

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
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const pendingSinceRef = useRef<number | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the nav spinner once the route transition has settled — but never
  // before it has been visible for at least NAV_SPINNER_MIN_MS. The admin
  // routes have a loading.tsx boundary, so the transition commits as soon as
  // the loading fallback renders and isNavigating flips false within
  // milliseconds; without the minimum the spinner never shows. Do NOT clear
  // on pathname change: App Router updates the URL at navigation start.
  useEffect(() => {
    if (isNavigating || !pendingHref) return;
    const elapsed = Date.now() - (pendingSinceRef.current ?? 0);
    const remaining = Math.max(0, NAV_SPINNER_MIN_MS - elapsed);
    clearTimerRef.current = setTimeout(() => setPendingHref(null), remaining);
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [isNavigating, pendingHref]);
  const [signingOut, setSigningOut] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    if (user.isSuperAdmin) return true;
    return user.permissions.includes(item.permission);
  });

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logoutAction();
      showToast('Signed Out', 'Ended staff session safely.', 'info');
      router.push('/auth/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const handleQuickOrderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    router.push(`/admin/orders?q=${encodeURIComponent(quickSearch.trim())}`);
  };

  // Navigate inside a transition so the clicked nav item shows a spinner until
  // the new route actually renders. Plain left-clicks only — modifier keys,
  // middle-clicks and right-clicks keep native Link behavior (new tab, etc.).
  const handleNavClick = (e: React.MouseEvent, href: string) => {
    setSidebarOpen(false);
    if (href === pathname) return;
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    pendingSinceRef.current = Date.now();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1F2933] flex">
      {/* Backdrop — lets the mobile sidebar be dismissed by tapping outside it */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      {/* Sidebar — White & Warm Beige Luxury Surface (No Navy background!) */}
      <aside
        className={`admin-sidebar no-print fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#E8E0D9] bg-white transition-all duration-300 lg:static ${
          collapsed ? 'w-64 lg:w-20' : 'w-64'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-[#E8E0D9] px-5">
          <Link
            href="/admin"
            className={`flex flex-col ${collapsed ? 'lg:hidden' : ''}`}
          >
              <span className="font-serif text-lg font-bold tracking-[0.16em] text-[#2F4156]">
                {storeName}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#567C8D]">
                Atelier Console
              </span>
            </Link>
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
        <div
          className={`mx-4 mt-4 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] p-3 ${
            collapsed ? 'lg:hidden' : ''
          }`}
        >
            <div className="flex items-center gap-2 text-xs font-bold text-[#2F4156]">
              <Shield className="h-3.5 w-3.5 text-[#567C8D]" />
              <span className="truncate">{user.roleNames[0] || 'Staff'}</span>
            </div>
            <p className="text-[11px] text-[#52606D] truncate mt-0.5">{user.email}</p>
          </div>

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
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#567C8D] text-white shadow-sm'
                    : 'text-[#2F4156] hover:bg-[#F5F1EE] hover:text-[#567C8D]'
                }`}
                title={item.label}
              >
                {pendingHref === item.href ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" />
                )}
                <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
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
            <span className={collapsed ? 'lg:hidden' : ''}>View Live Storefront</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" />
            )}
            <span className={collapsed ? 'lg:hidden' : ''}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </span>
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
            <nav className="breadcrumb-nav hidden sm:flex items-center gap-1.5 text-xs text-[#52606D] min-w-0">
              <Link href="/admin" className="hover:text-[#567C8D] font-medium">
                Console
              </Link>
              {pathSegments.slice(1).map((seg, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="capitalize font-semibold text-[#2F4156] truncate">
                    {seg.replace(/-/g, ' ')}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Global Order/Customer Quick Search */}
          <form
            onSubmit={handleQuickOrderSearch}
            className="hidden md:flex flex-1 min-w-0 max-w-md mx-4"
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
              onClick={(e) => handleNavClick(e, '/admin/orders/print-bulk')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2 text-xs font-medium text-[#2F4156] hover:border-[#567C8D]"
            >
              {pendingHref === '/admin/orders/print-bulk' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#567C8D]" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-[#567C8D]" />
              )}
              <span>Bulk Memo Print</span>
            </Link>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-1.5">
              <div className="h-7 w-7 rounded-full bg-[#567C8D] text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-semibold text-[#2F4156] leading-tight truncate max-w-[160px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#567C8D] font-medium truncate max-w-[160px]">
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
