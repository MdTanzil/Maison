# MAISON BEIGE — Luxury eCommerce & Multi-Role Operations Platform

A complete, production-ready full-stack eCommerce platform and multi-role business
management system built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**,
**PostgreSQL**, **Prisma ORM**, and **server-side role-based access control (RBAC)**.

**Live demo:** https://maison-five-alpha.vercel.app/

---

## What it is

MAISON BEIGE is a luxury online store (BDT pricing) with a full operations console
behind it. Customers shop a curated catalogue with variants, coupons, wishlist and
guest checkout; staff run the whole business from the admin console — products,
inventory, orders, payments, shipments, staff roles, customers, reports and settings.

---

## Features

### Storefront

- Shop with search, category/brand filters and sorting; product pages with image
  gallery, size/shade variants and stock display
- Cart (persisted in the browser), wishlist, coupon codes (e.g. `LUXURY10`)
- Guest checkout and signed-in checkout, cash on delivery plus manual bKash / Nagad
  payment verification via transaction ID
- Order tracking by order ID, tracking code or phone number
- Customer account: order history with invoices, address book, profile and password
- Product reviews, privilege points, and a member-facing order timeline

### Admin console (`/admin`)

- Dashboard with revenue, order and pipeline charts
- Products & catalogue: create/edit products, variants, images, bulk publish /
  archive / discount / restock / delete, CSV import
- Categories & brands, inventory ledger with stock adjustments and history
- Order management: lifecycle statuses, staff assignment, bulk status updates,
  invoice printing (A4 and 80mm thermal), bulk memo printing
- Payments & refunds: manual payment verification, refund processing
- Shipping & couriers: Steadfast / Pathao / RedX dispatch with tracking numbers
- Customers (CRM) with order history, notes and blocking
- Staff & RBAC roles with custom permissions, coupons & promotions
- Reports & analytics, CSV/PDF export
- Website settings including email (SMTP) and payment credentials (bKash / Nagad /
  Rocket), stored encrypted — configurable from the admin panel, no code changes

### Roles

| Role | Capabilities |
|---|---|
| **Super Admin** | Full system access, financials, staff, custom roles, settings |
| **Admin / Manager** | Products, categories, inventory, orders, customer CRM, reports |
| **Moderator** | Assigned orders, confirm orders, status updates, print memos (no financials) |
| **Order Processing Staff** | Process confirmed orders, packaging queue, print A4 & 80mm invoices |
| **Delivery Staff** | Assigned deliveries, mark delivered/returned, record collected COD cash |
| **Customer** | Storefront shopping, order tracking, wishlist, address book, profile |

---

## Demo accounts

The database is pre-seeded with one-click demo accounts. Sign in at `/auth/login`
with the 1-click role buttons, or use these credentials:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@maisonbeige.com` | `Admin@123` |
| Admin / Manager | `manager@maisonbeige.com` | `Staff@123` |
| Moderator | `moderator@maisonbeige.com` | `Staff@123` |
| Order Processing Staff | `processor@maisonbeige.com` | `Staff@123` |
| Delivery Staff | `delivery@maisonbeige.com` | `Staff@123` |
| Customer | `customer@maisonbeige.com` | `Customer@123` |

---

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via Prisma 6 (Neon in production; embedded PGlite locally)
- **Auth:** JWT sessions (`jose`) with server-side RBAC; passwords hashed with bcrypt
- **Other:** Recharts (dashboard charts), jsPDF (invoice PDFs), PapaParse (CSV import)

---

## Getting started

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Copy the environment template and fill in your values
cp .env.example .env

# 3. Create the database tables (and seed on first run)
npm run db:push
npm run db:seed   # optional — the app also seeds automatically on first visit

# 4. Start the development server
npm run dev
```

### Database configuration

By default (`USE_EXTERNAL_PG="false"`), the app uses an embedded PostgreSQL 16
engine (`@electric-sql/pglite`) persisted locally in `./.pgdata`, so it runs
out of the box with no external database. To use an external PostgreSQL server
(such as Neon), set `USE_EXTERNAL_PG="true"` and provide a `DATABASE_URL`
(direct/unpooled connection string) in `.env`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | For external Postgres | PostgreSQL connection string |
| `USE_EXTERNAL_PG` | No (default `"false"`) | `"true"` to use `DATABASE_URL` instead of PGlite |
| `AUTH_SECRET` | Yes | Secret for signing session JWTs |
| `NEXTAUTH_URL` | Yes | Public base URL of the app |
| `SSLCOMMERZ_*`, `BKASH_*`, `NAGAD_*`, `STRIPE_*` | No | Live payment gateways (the store works on COD + manual verification without them) |
| `STEADFAST_*`, `PATHAO_*`, `REDX_*` | No | Courier dispatch integrations |

Payment and courier credentials can also be managed from the admin panel
(Settings → Email & Payment Credentials) instead of environment variables.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Push the Prisma schema, generate the client, and build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run Next.js linting |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Seed the database with demo data |
| `npm test` | Run the automated end-to-end workflow tests |

---

## Project structure

```
prisma/
  schema.prisma        Database schema (Prisma)
  seed.ts              Demo data seed (users, products, orders, coupons)
  init.sql             DDL for the embedded PGlite database
src/
  app/
    (storefront)/      Public shop: home, shop, product, cart, checkout,
                       account, wishlist, track-order, auth
    admin/             Operations console: dashboard, orders, products,
                       inventory, customers, staff, payments, shipping,
                       coupons, reports, settings
    api/               Route handlers (order tracking, CSV/PDF export)
  actions/             Server actions (admin, catalog, orders, auth)
  components/
    admin/             Admin console client components
    storefront/        Shop client components (navbar, cart, product cards)
    ui/                Shared primitives (button, card, input, badge,
                       confirmation dialog, loading button)
  lib/
    auth/              Session + RBAC helpers
    db/                Prisma client, PGlite adapter, database bootstrap
    services/          Audit log, encrypted credentials storage
    validations/       Zod schemas
tests/
  e2e-workflows.test.ts  Automated workflow tests
```

---

## Brand identity

Beige-led luxury design system (see `src/app/globals.css`):

| Color | Hex | Purpose |
|---|---|---|
| Warm Beige | `#F5F1EE` | Main page & dashboard background |
| Muted Teal | `#567C8D` | Primary buttons, active navigation, interactive actions |
| Pure White | `#FFFFFF` | Product cards, forms, modals, tables, content panels |
| Soft Sky Blue | `#C8D9E6` | Secondary accents, badges, subtle highlights |
| Deep Navy | `#2F4156` | Headings, icons, high-contrast typography |
| Warm Beige Shade | `#E8E0D9` | Borders, dividers, muted backgrounds |
