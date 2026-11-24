import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { SettingsAdminClient } from '@/components/admin/settings-admin-client';
import { CredentialsAdminClient } from '@/components/admin/credentials-admin-client';
import { DemoResetClient } from '@/components/admin/demo-reset-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await ensureDatabaseReady();
  const settings = await prisma.websiteSettings.findUnique({
    where: { id: 'default' },
  });
  const sessionUser = await getCurrentUser();
  const canManageCredentials = hasPermission(sessionUser, 'settings.manage');
  const paymentJson = (settings?.paymentSettingsJson ?? {}) as Record<string, any>;
  const creds = (paymentJson.credentials ?? {}) as Record<string, any>;
  const emailJson = (settings?.emailSettingsJson ?? {}) as Record<string, any>;

  return (
    <div className="space-y-6">
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
      {canManageCredentials && (
        <CredentialsAdminClient
          initialCredentials={{
            smtpHost: emailJson.smtpHost || '',
            smtpPort: Number(emailJson.smtpPort ?? 587),
            smtpUser: emailJson.smtpUser || '',
            smtpSecure: Boolean(emailJson.smtpSecure),
            fromEmail: emailJson.fromEmail || '',
            fromName: emailJson.fromName || '',
            smtpPasswordConfigured: Boolean(emailJson.smtpPassword),
            bkashAppKey: creds.bkash?.appKey || '',
            bkashUsername: creds.bkash?.username || '',
            bkashSandbox: Boolean(creds.bkash?.sandbox ?? true),
            bkashAppSecretConfigured: Boolean(creds.bkash?.appSecret),
            bkashPasswordConfigured: Boolean(creds.bkash?.password),
            nagadMerchantId: creds.nagad?.merchantId || '',
            nagadPgPublicKey: creds.nagad?.pgPublicKey || '',
            nagadPrivateKeyConfigured: Boolean(creds.nagad?.merchantPrivateKey),
            rocketMerchantId: creds.rocket?.merchantId || '',
            rocketApiUser: creds.rocket?.apiUser || '',
            rocketSandbox: Boolean(creds.rocket?.sandbox ?? true),
            rocketPasswordConfigured: Boolean(creds.rocket?.apiPassword),
          }}
        />
      )}
      {sessionUser?.isSuperAdmin && <DemoResetClient />}
    </div>
  );
}
