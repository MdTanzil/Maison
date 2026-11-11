import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';

export default async function ContactPage() {
  await ensureDatabaseReady();
  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-8 sm:p-12 shadow-luxury space-y-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
            Client Concierge
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#2F4156] mt-1">
            Contact &amp; Flagship Salon
          </h1>
          <p className="text-sm text-[#52606D] mt-1">
            Our concierge specialists are available for private styling, sizing advice, and corporate gifting inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#F5F1EE] p-5 border border-[#E8E0D9] space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#2F4156]">
              <MapPin className="h-4 w-4 text-[#567C8D]" />
              <span>Flagship Atelier Address</span>
            </div>
            <p className="text-xs text-[#52606D] leading-relaxed">
              {settings?.address || 'House 42, Road 11, Banani, Dhaka 1213, Bangladesh'}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F1EE] p-5 border border-[#E8E0D9] space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#2F4156]">
              <Phone className="h-4 w-4 text-[#567C8D]" />
              <span>Direct Concierge Lines</span>
            </div>
            <p className="text-xs text-[#52606D]">
              Primary: {settings?.contactPhone || '+880 1711-000001'} • Secondary:{' '}
              {settings?.secondaryPhone || '+880 1819-223344'}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F1EE] p-5 border border-[#E8E0D9] space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#2F4156]">
              <Mail className="h-4 w-4 text-[#567C8D]" />
              <span>Electronic Correspondence</span>
            </div>
            <p className="text-xs text-[#52606D]">
              {settings?.contactEmail || 'concierge@maisonbeige.com'}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F1EE] p-5 border border-[#E8E0D9] space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#2F4156]">
              <Clock className="h-4 w-4 text-[#567C8D]" />
              <span>Boutique Visiting Hours</span>
            </div>
            <p className="text-xs text-[#52606D]">
              Saturday – Thursday: 10:30 AM – 8:30 PM • Friday: 3:00 PM – 9:00 PM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
