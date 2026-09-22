# AYAAN CLOTHING — Vercel Deployment Guide

> [!IMPORTANT]
> **Single Frontend-Only Application**
>
> Ayaan Clothing runs as a single, self-contained Next.js frontend application. There is no external backend requirement. All catalog data, categories, brands, orders, commercial RFQs, quotations, inventory, promotions, and authentication operate client-side via `mockStore` with browser `localStorage` persistence.

---

## 1. Environment Variables for Vercel

In your Vercel Project Dashboard (**Settings → Environment Variables**), add the following variables for all environments (**Production**, **Preview**, **Development**):

| Variable Name | Recommended Value | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` | Canonical URL for SEO metadata, OpenGraph, sitemap, & robots |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `8801982183886` | Business WhatsApp contact for direct orders & quotes |
| `NEXT_PUBLIC_WHATSAPP_DISPLAY` | `+880 1982-183886` | Display string for WhatsApp button & headers |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_placeholder` | Public Stripe test key (client-safe) |
| `NEXT_PUBLIC_FRONTEND_ONLY` | `true` | Frontend architecture confirmation flag |

> [!NOTE]
> Do **NOT** set backend API URLs (`NEXT_PUBLIC_API_URL`), database strings, or secret keys.

---

## 2. Deploying via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add -A
   git commit -m "feat: configure single frontend-only app for Vercel deployment"
   git push origin main
   ```
2. **Import Project into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository (`ayaan`).
   - Framework Preset: **Next.js** (detected automatically).
   - Root Directory: `./` (default).
3. **Set Environment Variables**:
   - In the **Environment Variables** section, paste the values from Section 1 above.
4. **Deploy**:
   - Click **Deploy**. Vercel will run `npm run build` and provision your globally distributed edge deployment.

---

## 3. Deploying via Vercel CLI

You can also deploy directly from your local terminal:

1. **Log in to Vercel**:
   ```bash
   npx vercel login
   ```
2. **Link & Deploy Preview**:
   ```bash
   npx vercel
   ```
3. **Deploy to Production**:
   ```bash
   npx vercel --prod
   ```

---

## 4. Build Configuration

Vercel automatically detects Next.js settings from `package.json`:
- **Build Command**: `next build` (or `npm run build`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Node.js Version**: 20.x or 22.x

---

## 5. Seeded Accounts for Testing

The local store is pre-seeded with accounts:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@ayaanclothing.com` | `admin123` | Full Admin Portal (`/admin`) |
| **B2B Wholesale Buyer** | `buyer@ayaanclothing.com` | `password` | B2B Wholesale Portal (`/dashboard`) |
| **Retail Customer** | `testuser@example.com` | `testpass` | Customer Storefront & Profile (`/profile`) |
