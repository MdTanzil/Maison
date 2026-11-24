'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  ShieldCheck,
  Truck,
  Sparkles,
  LogOut,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import { useStore } from './store-provider';
import { logoutAction } from '@/actions/auth-actions';
import { SessionUser } from '@/lib/auth/session';

export function StorefrontNavbar({
  user,
  storeName = 'MAISON BEIGE',
  announcementText = 'Complimentary Express Delivery on Orders Above ৳10,000 • Code: LUXURY10 for 10% Off',
  announcementActive = true,
}: {
  user: SessionUser | null;
  storeName?: string;
  announcementText?: string;
  announcementActive?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, wishlistIds, showToast } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push('/shop');
      return;
    }
    router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logoutAction();
      showToast('Signed Out', 'You have been signed out safely.', 'info');
      router.push('/');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Maison' },
    { href: '/shop', label: 'All Collections' },
    { href: '/shop?category=apparel-tailoring', label: 'Apparel & Linen' },
    { href: '/shop?category=fine-leather-bags', label: 'Fine Leather' },
    { href: '/shop?category=home-living-sanctuary', label: 'Home Sanctuary' },
    { href: '/track-order', label: 'Track Order' },
    { href: '/about', label: 'Our Atelier' },
  ];

  return (
    <header className="storefront-header no-print sticky top-0 z-40 w-full border-b border-[#E8E0D9] bg-[#F5F1EE]/95 backdrop-blur-md">
      {/* Announcement Bar — Soft Sky Blue & Warm Beige Luxury Accent */}
      {announcementActive && (
        <div className="bg-[#C8D9E6]/65 border-b border-[#E8E0D9] px-4 py-2 text-center text-xs font-medium text-[#2F4156]">
          <div className="mx-auto max-w-7xl flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#567C8D] shrink-0" />
            <span>{announcementText}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-2 sm:gap-4">
          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="shrink-0 lg:hidden rounded-lg p-1.5 sm:p-2 text-[#2F4156] hover:bg-[#E8E0D9]/50"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Brand Logo */}
          <Link href="/" className="flex min-w-0 flex-col">
            <span className="truncate font-serif text-xl sm:text-2xl lg:text-3xl font-semibold tracking-[0.18em] text-[#2F4156]">
              {storeName}
            </span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-[#567C8D]">
              Atelier &amp; Living
            </span>
          </Link>

          {/* Search Bar with Quick Suggestions */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 min-w-0 max-w-md mx-6 relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Belgian linen, calfskin tote, stoneware, SKU..."
              className="w-full rounded-full border border-[#E8E0D9] bg-white pl-4 pr-10 py-2 text-sm text-[#1F2933] placeholder:text-[#8A949E] focus:outline-none focus:border-[#567C8D] focus:ring-1 focus:ring-[#567C8D]"
            />
            <button
              type="submit"
              aria-label="Search products"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#567C8D] p-1.5 text-white hover:bg-[#486878] transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user?.isStaff && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#567C8D] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#486878] transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Admin Console</span>
              </Link>
            )}

            <Link
              href="/wishlist"
              className="relative hidden sm:inline-flex items-center justify-center rounded-full p-2 sm:p-2.5 text-[#2F4156] hover:bg-white transition-colors border border-transparent hover:border-[#E8E0D9]"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C8D9E6] px-1 text-[10px] font-bold text-[#2F4156]">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative rounded-full p-2 sm:p-2.5 text-[#2F4156] hover:bg-white transition-colors border border-transparent hover:border-[#E8E0D9]"
              title="Shopping Bag"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#567C8D] px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-full border border-[#E8E0D9] bg-white px-3 py-1.5 text-xs font-medium text-[#2F4156] hover:border-[#567C8D]"
                >
                  <User className="h-3.5 w-3.5 text-[#567C8D]" />
                  <span className="hidden sm:inline max-w-[110px] truncate">{user.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  title="Sign Out"
                  className="hidden sm:inline-flex rounded-full p-2 text-[#52606D] hover:text-rose-600 hover:bg-white transition-colors disabled:opacity-60"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E0D9] bg-white px-3.5 py-2 text-xs font-medium text-[#2F4156] hover:border-[#567C8D] transition-colors"
              >
                <User className="h-3.5 w-3.5 text-[#567C8D]" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Desktop Secondary Navigation Bar */}
        <nav className="hidden lg:flex items-center justify-between border-t border-[#E8E0D9]/80 py-2.5 text-xs font-medium">
          <div className="flex items-center gap-7">
            {navLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors py-1 ${
                    active
                      ? 'text-[#567C8D] font-semibold border-b-2 border-[#567C8D]'
                      : 'text-[#2F4156] hover:text-[#567C8D]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-5 text-[#52606D]">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-[#567C8D]" />
              <span>Nationwide Concierge Delivery</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#567C8D]" />
              <span>Authentic Atelier Guarantee</span>
            </span>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E8E0D9] bg-white px-4 py-5 space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, SKU..."
              className="w-full rounded-lg border border-[#E8E0D9] bg-[#F5F1EE] pl-3.5 pr-10 py-2 text-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#567C8D]"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
          <div className="flex flex-col space-y-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#2F4156] hover:bg-[#F5F1EE]"
              >
                {item.label}
              </Link>
            ))}
            {user?.isStaff && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-[#567C8D] px-3 py-2 text-sm font-medium text-white"
              >
                Admin Management Console
              </Link>
            )}
            <Link
              href="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#2F4156] hover:bg-[#F5F1EE]"
            >
              Wishlist
            </Link>
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-[#2F4156] hover:bg-[#F5F1EE] disabled:opacity-60"
              >
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
