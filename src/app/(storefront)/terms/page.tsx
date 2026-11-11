import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';

export default async function TermsPage() {
  await ensureDatabaseReady();
  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-8 sm:p-12 shadow-luxury space-y-4">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          Conditions of Sale
        </span>
        <h1 className="font-serif text-3xl font-semibold text-[#2F4156]">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-[#52606D] leading-relaxed whitespace-pre-line">
          {settings?.termsAndConditions ||
            'All orders are subject to availability and confirmation. Goods once sold may be exchanged within 7 days in unused condition with original invoice.'}
        </p>
      </div>
    </div>
  );
}
