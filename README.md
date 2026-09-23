This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Promotions & Promo Code System

Ayaan Clothing includes a centralized, frontend-only coupon and promotional discount engine:

- **Storage & Source of Truth:** Promo codes and coupons are managed via the Admin Portal (`/admin/promotions`) and stored centrally in the mock store (`src/lib/mock-data/mock-store.ts`, backed by persistent browser `localStorage`).
- **Validation:** Centralized in [`src/lib/coupon.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/coupon.ts) (`validateCoupon()`). Matches codes case-insensitively, enforces active date ranges (`starts_at`, `expires_at`), checks usage limits (`usage_limit` vs `usage_count`), and verifies minimum order requirements (`min_spend`).
- **Discount Calculation:** Handles percentage (`%`) and fixed amount (`$`) discounts, applies `max_discount` caps when defined, and strictly constrains discounts to not exceed the merchandise subtotal. Promo discounts apply to goods value before freight.
- **Checkout & Cart Integration:** Embedded in [`CheckoutModal.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/cart/CheckoutModal.tsx). Automatically recalculates or revalidates discounts when cart items or quantities change. Applied coupon details (`coupon_code`, `discount_amount`) are recorded into the order record, displayed on customer dashboards, and rendered on Proforma Invoices.

