import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';
import { CouponsAdminClient } from '@/components/admin/coupons-admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  await ensureDatabaseReady();
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <CouponsAdminClient
      coupons={coupons.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description || '',
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        minOrderAmount: Number(c.minOrderAmount),
        maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
        expiryDate: c.expiryDate.toISOString().slice(0, 10),
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        isActive: c.isActive,
      }))}
    />
  );
}
