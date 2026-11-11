import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabaseReady();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (!user.isStaff) {
    redirect('/account');
  }

  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });

  return (
    <AdminShell user={user} storeName={settings?.storeName || 'MAISON BEIGE'}>
      {children}
    </AdminShell>
  );
}
