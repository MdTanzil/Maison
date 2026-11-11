import React from 'react';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';

export default async function AboutPage() {
  await ensureDatabaseReady();
  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 space-y-8">
      <div className="rounded-2xl border border-[#E8E0D9] bg-white p-8 sm:p-12 shadow-luxury space-y-6">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#567C8D]">
          The House of {settings?.storeName || 'MAISON BEIGE'}
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2F4156]">
          Quiet Luxury, Tactile Provenance, and Timeless Form.
        </h1>
        <p className="text-sm sm:text-base text-[#52606D] leading-relaxed">
          Founded with a devotion to natural fibers and unhurried craftsmanship, Maison Beige creates garments, leather goods, and architectural home vessels designed to age with grace. Our signature Warm Beige palette reflects raw Belgian flax, undyed Peruvian alpaca, travertine stoneware, and vegetable-tanned hides.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="rounded-xl bg-[#F5F1EE] p-4 border border-[#E8E0D9]">
            <h3 className="text-sm font-semibold text-[#2F4156]">European Flax &amp; Silk</h3>
            <p className="text-xs text-[#52606D] mt-1">
              Breathable, thermoregulating weaves tailored for warm climates and year-round layering.
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F1EE] p-4 border border-[#E8E0D9]">
            <h3 className="text-sm font-semibold text-[#2F4156]">Small-Batch Leather</h3>
            <p className="text-xs text-[#52606D] mt-1">
              Full-grain calfskin tanned using organic tree barks that develop a rich patina over time.
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F1EE] p-4 border border-[#E8E0D9]">
            <h3 className="text-sm font-semibold text-[#2F4156]">Artisanal Sanctuary</h3>
            <p className="text-xs text-[#52606D] mt-1">
              Wheel-thrown ceramics and botanical fragrances blended with pure essential oils.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
