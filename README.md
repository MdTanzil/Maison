# MAISON BEIGE — Full-Stack Luxury eCommerce & Multi-Role Operations Platform

A complete, production-ready full-stack eCommerce platform and multi-role business management system built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, **Prisma ORM**, and **Server-Side Role-Based Access Control (RBAC)**.

---

## 1. Brand Identity & Color System: Beige-led Luxury

| Color | Hex | Purpose |
|---|---|---|
| **Warm Beige** | `#F5F1EE` | Main page & dashboard background (`--color-warm-beige`) |
| **Muted Teal** | `#567C8D` | Primary buttons, active navigation, and interactive actions (`--color-muted-teal`) |
| **Pure White** | `#FFFFFF` | Product cards, forms, modals, tables, and content panels (`--color-pure-white`) |
| **Soft Sky Blue** | `#C8D9E6` | Secondary accents, badges, and subtle highlights (`--color-soft-sky`) |
| **Deep Navy** | `#2F4156` | Minimal headings, icons, and high-contrast typography (`--color-deep-navy`) |
| **Warm Beige Shade** | `#E8E0D9` | Borders, dividers, and muted backgrounds (`--color-warm-beige-shade`) |

---

## 2. Default Multi-Role Demo Accounts (Pre-Seeded in PostgreSQL)

You can sign in at `/auth/login` with 1-click role switching or using these credentials:

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Super Admin** | `admin@maisonbeige.com` | `Admin@123` | Full system access, financials, staff, custom roles, settings |
| **Admin / Manager** | `manager@maisonbeige.com` | `Staff@123` | Products, categories, inventory, orders, customer CRM, reports |
| **Moderator** | `moderator@maisonbeige.com` | `Staff@123` | Assigned orders, confirm orders, status updates, print memos (no financials) |
| **Order Processing Staff** | `processor@maisonbeige.com` | `Staff@123` | Process confirmed orders, packaging queue, print A4 & 80mm invoices |
| **Delivery Staff** | `delivery@maisonbeige.com` | `Staff@123` | Assigned deliveries, mark delivered/returned, record collected COD cash |
| **Customer** | `customer@maisonbeige.com` | `Customer@123` | Storefront shopping, order tracking, wishlist, address book, profile |

---

## 3. Running the Application & Automated Tests

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run automated E2E workflow tests
npm test

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
```

### Database Configuration (`.env`)
By default (`USE_EXTERNAL_PG="false"`), the application uses an embedded PostgreSQL 16 engine (`@electric-sql/pglite`) persisted locally in `./.pgdata` via Prisma Driver Adapters so it runs out-of-the-box with zero external daemon setup. To connect to an external PostgreSQL server, set `USE_EXTERNAL_PG="true"` and provide your `DATABASE_URL` in `.env`.
