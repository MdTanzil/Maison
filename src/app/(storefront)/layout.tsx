import React from 'react';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { StorefrontNavbar } from '@/components/storefront/navbar';
import { StorefrontFooter } from '@/components/storefront/footer';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabaseReady();
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    prisma.websiteSettings.findUnique({ where: { id: 'default' } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F1EE]">
      <StorefrontNavbar
        user={user}
        storeName={settings?.storeName || 'MAISON BEIGE'}
        announcementText={settings?.announcementText}
        announcementActive={settings?.announcementActive ?? true}
      />
      <main className="flex-1">{children}</main>
      <StorefrontFooter
        storeName={settings?.storeName || 'MAISON BEIGE'}
        tagline={settings?.tagline}
        contactEmail={settings?.contactEmail}
        contactPhone={settings?.contactPhone}
        address={settings?.address}
      />
    </div>
  );
}
