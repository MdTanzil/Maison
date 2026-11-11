'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Settings } from 'lucide-react';
import { updateWebsiteSettingsAction } from '@/actions/admin-actions';
import { useStore } from '@/components/storefront/store-provider';

export function SettingsAdminClient({
  initialSettings,
}: {
  initialSettings: {
    storeName: string;
    tagline: string;
    contactEmail: string;
    contactPhone: string;
    secondaryPhone: string;
    address: string;
    city: string;
    currencySymbol: string;
    taxRate: number;
    insideCityShipping: number;
    subAreaShipping: number;
    outsideCityShipping: number;
    freeShippingThreshold: number;
    allowGuestCheckout: boolean;
    autoDeductStockOnConfirm: boolean;
    announcementText: string;
    announcementActive: boolean;
    invoiceHeaderNote: string;
    invoiceFooterNote: string;
    invoiceTerms: string;
    termsAndConditions: string;
    privacyPolicy: string;
    seoTitle: string;
    seoDescription: string;
  };
}) {
  const router = useRouter();
  const { showToast } = useStore();
  const [form, setForm] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateWebsiteSettingsAction(form);
    setSaving(false);

    if (res.ok) {
      showToast(
        'Website Settings Saved',
        'Updated global brand, shipping, invoice, and policy settings.',
        'success'
      );
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Super Admin Configuration
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F4156] mt-1">
            Website, Shipping &amp; Invoice Settings
          </h1>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#567C8D] px-6 py-3 text-xs font-semibold text-white hover:bg-[#486878]"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving Settings...' : 'Save Global Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* Store Identity & Announcement */}
        <div className="lg:col-span-6 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
            Brand Identity &amp; Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">Store Name</label>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Primary Phone
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Store Flagship Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>

          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Storefront Top Announcement Bar Text
            </label>
            <input
              type="text"
              value={form.announcementText}
              onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.announcementActive}
                onChange={(e) =>
                  setForm({ ...form, announcementActive: e.target.checked })
                }
              />
              <span className="font-semibold text-[#2F4156]">
                Show Announcement Bar
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowGuestCheckout}
                onChange={(e) =>
                  setForm({ ...form, allowGuestCheckout: e.target.checked })
                }
              />
              <span className="font-semibold text-[#2F4156]">
                Enable Guest Checkout
              </span>
            </label>
          </div>
        </div>

        {/* Shipping, Tax & Invoice Settings */}
        <div className="lg:col-span-6 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#2F4156]">
            Shipping Charges &amp; Official Invoice Configuration
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Inside City (৳)
              </label>
              <input
                type="number"
                value={form.insideCityShipping}
                onChange={(e) =>
                  setForm({ ...form, insideCityShipping: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Sub-Area (৳)
              </label>
              <input
                type="number"
                value={form.subAreaShipping}
                onChange={(e) =>
                  setForm({ ...form, subAreaShipping: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Outside City (৳)
              </label>
              <input
                type="number"
                value={form.outsideCityShipping}
                onChange={(e) =>
                  setForm({ ...form, outsideCityShipping: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-[#2F4156] mb-1">
                Free Above (৳)
              </label>
              <input
                type="number"
                value={form.freeShippingThreshold}
                onChange={(e) =>
                  setForm({ ...form, freeShippingThreshold: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Invoice Header Title
            </label>
            <input
              type="text"
              value={form.invoiceHeaderNote}
              onChange={(e) => setForm({ ...form, invoiceHeaderNote: e.target.value })}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>

          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Invoice Terms &amp; Exchange Policy
            </label>
            <textarea
              rows={2}
              value={form.invoiceTerms}
              onChange={(e) => setForm({ ...form, invoiceTerms: e.target.value })}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>

          <div>
            <label className="block font-medium text-[#2F4156] mb-1">
              Invoice Thank-You Footer Note
            </label>
            <input
              type="text"
              value={form.invoiceFooterNote}
              onChange={(e) => setForm({ ...form, invoiceFooterNote: e.target.value })}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>
        </div>

        {/* Legal & SEO Policies */}
        <div className="lg:col-span-12 rounded-2xl border border-[#E8E0D9] bg-white p-6 shadow-luxury grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-[#2F4156] mb-1">
              Terms &amp; Conditions Content
            </label>
            <textarea
              rows={4}
              value={form.termsAndConditions}
              onChange={(e) =>
                setForm({ ...form, termsAndConditions: e.target.value })
              }
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#2F4156] mb-1">
              Privacy Policy Content
            </label>
            <textarea
              rows={4}
              value={form.privacyPolicy}
              onChange={(e) => setForm({ ...form, privacyPolicy: e.target.value })}
              className="w-full rounded-xl border border-[#E8E0D9] bg-[#F5F1EE] px-3.5 py-2"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
