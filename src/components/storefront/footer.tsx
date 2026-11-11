import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, ShieldCheck, RefreshCw, CreditCard } from 'lucide-react';

export function StorefrontFooter({
  storeName = 'MAISON BEIGE',
  tagline = 'Quiet Luxury & Timeless Essentials',
  contactEmail = 'concierge@maisonbeige.com',
  contactPhone = '+880 1711-000001',
  address = 'House 42, Road 11, Banani, Dhaka 1213, Bangladesh',
}: {
  storeName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}) {
  return (
    <footer className="storefront-footer no-print border-t border-[#E8E0D9] bg-[#F5F1EE] text-[#1F2933]">
      {/* Value Proposition Strip */}
      <div className="border-b border-[#E8E0D9] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-[#F5F1EE] p-3 text-[#567C8D]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2F4156]">Artisanal Provenance</h4>
              <p className="text-xs text-[#52606D] mt-1">
                Every garment and object is crafted from certified natural flax, silk, leather, and stoneware.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-[#F5F1EE] p-3 text-[#567C8D]">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2F4156]">7-Day Effortless Exchange</h4>
              <p className="text-xs text-[#52606D] mt-1">
                Complimentary size and style exchanges within 7 days of delivery with original invoice memo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-[#F5F1EE] p-3 text-[#567C8D]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2F4156]">Flexible Concierge Payment</h4>
              <p className="text-xs text-[#52606D] mt-1">
                Cash on Delivery, verified bKash/Nagad merchant transfer, bank deposit, and card checkout.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-serif text-2xl font-semibold tracking-[0.18em] text-[#2F4156]">
                {storeName}
              </span>
            </Link>
            <p className="text-sm text-[#52606D] max-w-sm leading-relaxed">
              {tagline}. Designed with a warm minimalist sensibility for enduring daily elegance.
            </p>
            <div className="space-y-2 text-xs text-[#52606D] pt-2">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#567C8D] shrink-0" />
                <span>{address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#567C8D] shrink-0" />
                <span>{contactPhone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#567C8D] shrink-0" />
                <span>{contactEmail}</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-4">
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm text-[#52606D]">
              <li>
                <Link href="/shop?category=apparel-tailoring" className="hover:text-[#567C8D]">
                  Apparel &amp; Tailoring
                </Link>
              </li>
              <li>
                <Link href="/shop?category=fine-leather-bags" className="hover:text-[#567C8D]">
                  Fine Leather &amp; Bags
                </Link>
              </li>
              <li>
                <Link href="/shop?category=home-living-sanctuary" className="hover:text-[#567C8D]">
                  Home &amp; Living Sanctuary
                </Link>
              </li>
              <li>
                <Link href="/shop?category=timepieces-accents" className="hover:text-[#567C8D]">
                  Timepieces &amp; Accents
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-[#567C8D]">
                  All Curated Pieces
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-4">
              Client Concierge
            </h4>
            <ul className="space-y-2.5 text-sm text-[#52606D]">
              <li>
                <Link href="/track-order" className="hover:text-[#567C8D]">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-[#567C8D]">
                  My Account &amp; History
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="hover:text-[#567C8D]">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#567C8D]">
                  Contact &amp; Boutique Hours
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#567C8D]">
                  About Maison Beige
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2F4156] mb-4">
              Legal &amp; Governance
            </h4>
            <ul className="space-y-2.5 text-sm text-[#52606D]">
              <li>
                <Link href="/privacy-policy" className="hover:text-[#567C8D]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#567C8D]">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#567C8D]">
                  Staff &amp; Partner Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#E8E0D9] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#52606D] gap-4">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p>Beige-led Luxury Design System • Secured by Role-Based Access Control</p>
        </div>
      </div>
    </footer>
  );
}
