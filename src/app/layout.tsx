import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/storefront/store-provider';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma, ensureDatabaseReady } from '@/lib/db/prisma';

export const metadata: Metadata = {
  title: 'MAISON BEIGE | Luxury Fashion, Fine Leather & Living Sanctuary',
  description:
    'Beige-led luxury essentials, unstructured Belgian linen tailoring, full-grain calfskin bags, and artisanal home vessels.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  let initialWishlistIds: string[] = [];

  if (user) {
    const wl = await prisma.wishlist.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    if (wl) {
      initialWishlistIds = wl.items.map((i) => i.productId);
    }
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F5F1EE] text-[#1F2933] antialiased">
        <StoreProvider initialWishlistIds={initialWishlistIds}>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
