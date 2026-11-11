import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { SettingsAdminClient } from '@/components/admin/settings-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await ensureDatabaseReady();
  const settings = await prisma.websiteSettings.findUnique({
    where: { id: 'default' },
  });

  return (
    <SettingsAdminClient
      initialSettings={{
        storeName: settings?.storeName || 'MAISON BEIGE',
        tagline: settings?.tagline || 'Quiet Luxury & Timeless Essentials',
        contactEmail: settings?.contactEmail || 'concierge@maisonbeige.com',
        contactPhone: settings?.contactPhone || '+880 1711-000001',
        secondaryPhone: settings?.secondaryPhone || '+880 1819-223344',
        address:
          settings?.address || 'House 42, Road 11, Banani, Dhaka 1213, Bangladesh',
        city: settings?.city || 'Dhaka',
        currencySymbol: settings?.currencySymbol || '৳',
        taxRate: Number(settings?.taxRate ?? 5),
        insideCityShipping: Number(settings?.insideCityShipping ?? 80),
        subAreaShipping: Number(settings?.subAreaShipping ?? 110),
        outsideCityShipping: Number(settings?.outsideCityShipping ?? 150),
        freeShippingThreshold: Number(settings?.freeShippingThreshold ?? 10000),
        allowGuestCheckout: settings?.allowGuestCheckout ?? true,
        autoDeductStockOnConfirm: settings?.autoDeductStockOnConfirm ?? true,
        announcementText: settings?.announcementText || '',
        announcementActive: settings?.announcementActive ?? true,
        invoiceHeaderNote:
          settings?.invoiceHeaderNote || 'Official Tax Invoice & Order Memo',
        invoiceFooterNote: settings?.invoiceFooterNote || '',
        invoiceTerms: settings?.invoiceTerms || '',
        termsAndConditions: settings?.termsAndConditions || '',
        privacyPolicy: settings?.privacyPolicy || '',
        seoTitle: settings?.seoTitle || '',
        seoDescription: settings?.seoDescription || '',
      }}
    />
  );
}
