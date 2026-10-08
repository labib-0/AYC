# AYAAN CLOTHING — STOREFRONT PRODUCT CARD REFINEMENT REPORT
## Phase 3: Product Cards + Wishlist + Sold Out + Responsive Accessibility

**Date**: October 8, 2026  
**Status**: APPROVED & VERIFIED  
**Commit**: `fix(storefront): refine product cards wishlist and availability states`  
**Targets**: `origin/main`, `labib/main`, and VPS Production (`root@200.97.169.230`)

---

## 1. Executive Summary

In Phase 3, the storefront product card presentation and interaction model was refined across desktop, tablet, and mobile breakpoints to establish clear visual hierarchy, reduce element collision, ensure absolute stock-independence for customer wishlists, and provide distinct accessible states for purchasable versus sold-out inventory.

All core B2B commerce rules—including Minimum Order Quantity (MOQ), Full Stock exact inventory calculations, wholesale price tiers, customer data isolation, and authoritative cart/quote flows—remain strictly preserved and enforced.

---

## 2. Key Product Card & Overlay Hierarchy Changes

### 2.1 Optical Balance & Overlay Hierarchy
The visual competition directly over product photography was streamlined by establishing a clear 5-tier layer priority:
1. **Product Image Canvas**: Canonical 3:4 aspect container (`aspect-[3/4]`), high-fidelity `ProductImageFrame`, smooth hover zoom disabled on sold-out items to reflect unpurchasability.
2. **Primary Availability & Status Badging (Top Left)**: Authoritative `<ProductPromotionBadges>` rendering single strong indicators (`SOLD OUT`, `PRE-ORDER`, `NEW`, `HOT`).
3. **Wishlist Control (Bottom Right)**: Elevated independent circular control (`z-20 w-8 h-8 rounded-full`) with backdrop blur, guaranteed clear hit target.
4. **Authoritative Brand Identity (Top Right)**: Crisp `<ProductBrandLogoOverlay>` constrained to `w-[60px] sm:w-[66px] aspect-[1.35/1]` with transparent background surface and `object-contain` scaling, ensuring zero logo distortion or visual clutter.
5. **Secondary Metadata & Action (Bottom Left & Bottom Bar)**:
   - *Idle*: Neutral `ORIGINAL` or `MASTER COPY` design type badge at lower left.
   - *Hover / Focus*: Quick Add action container smoothly slides up across lower boundary while design type badge gracefully fades to eliminate crowding.

### 2.2 Quick Add & Wishlist Spatial Separation
- **Previous Spatial Collision**: Quick Add previously spanned full width (`w-full`), visually covering and intercepting clicks intended for the Wishlist heart button.
- **Refinement**: Constrained Quick Add container right boundary (`right-[46px] sm:right-[50px]`) while anchoring the Wishlist button at `right-2.5` (`10px`).
- **Physical Gap**: Guarantees a dedicated 4px to 8px gap between Quick Add and Wishlist, with independent click targets and zero hover/focus conflicts. The overlay parent applies `pointer-events-none` while buttons declare `pointer-events-auto`, allowing clicks through the gap to navigate to the product detail view.

---

## 3. Wishlist State & Stock Independence

### 3.1 Unconditional Inventory Independence
- The Wishlist button is **never tied to inventory levels or availability**.
- Customers can freely wishlist in-stock, low-stock, out-of-stock, and **SOLD OUT** items.
- The Wishlist toggle button is never disabled or hidden based on stock status.

### 3.2 Obvious Visual States & Accessibility
- **Saved / In Wishlist**: Active rose surface (`bg-rose-500 text-white shadow-md border-rose-600 scale-100 opacity-100`) with filled heart icon (`fill-current`).
- **Not Saved / Unsaved**: Neutral translucent surface (`bg-background/90 dark:bg-slate-900/90 text-foreground/75 border-border/70 hover:text-foreground shadow-xs`) with outline heart.
- **Accessible Naming**: Dynamic `aria-label="Remove from wishlist"` vs. `aria-label="Add to wishlist"`, visible keyboard focus ring (`focus-visible:ring-2 focus-visible:ring-ring`).
- **Guest Experience**: Delegates unauthenticated clicks to `toggleWishlist(product)` via `WishlistContext`, which redirects guests to `/login?redirect=...` preserving return destination.

---

## 4. SOLD OUT Presentation & Redundancy Removal

### 4.1 Subdued Aesthetic
- Sold-out product cards receive a subdued grayscale treatment (`opacity-80 grayscale-[0.35]`), clearly distinguishing them from active inventory at a glance.
- Image hover zoom is disabled on sold-out cards to prevent giving false signals of interactive availability.

### 4.2 Non-Competing Quick Add State
- For sold-out items, the Quick Add button is disabled (`disabled`, `aria-disabled="true"`) with subdued neutral styling (`bg-secondary/80 text-muted-foreground/70 border-border/40 cursor-not-allowed shadow-none`).
- Button text clearly displays `Sold Out` and accessible label `Sold out - unavailable for purchase`.
- It does **not** compete as an active call-to-action button.

### 4.3 Elimination of Redundant Indicators
- Retains one strong primary top-left `SOLD OUT` badge.
- Omits duplicate "Sold Out" text in the lower card metadata row (`isSoldOut ? null : isPreorder ? ...`), eliminating repetitive label clutter.

---

## 5. Typography, MOQ & Stock Grouping

### 5.1 Product Title Integrity
- Preserves exact database-stored names without admin case alteration (no forced uppercase or lowercase transforms).
- Implements `text-[14px] font-body font-medium leading-snug line-clamp-2 min-h-[2.4rem]` to guarantee consistent card heights and clean vertical alignment across grid columns.

### 5.2 Cohesive MOQ and Stock Status Grouping
- Removed wide `justify-between` separation that previously pushed semantically related MOQ and stock urgency figures to opposite edges of the card.
- Replaced with a unified flex row (`flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5`):
  - In-stock: `MOQ 300 pcs`
  - Low stock: `MOQ 300 pcs · Only 2 left`
  - Pre-Order: `MOQ 300 pcs · Pre-Order`
  - Out of stock: `MOQ 300 pcs · Out of Stock`

---

## 6. Pricing & Full Stock Invariants

1. **Lowest Valid Unit Price**: Exposes the authoritative wholesale customer price via `getLowestValidCustomerUnitPrice(product)`, respecting Full Stock, Bulk, and Standard tiers.
2. **Zero Internal Cost Leakage**: Purchase price, cost price, and supplier margins are strictly excluded from storefront cards and schemas.
3. **No Promotional Deception**: Never introduces fake MSRP markups, simulated percentage discounts, or artificial strikethrough prices.
4. **Full Stock Exactness**: Where Full Stock is active, available stock quantities (e.g. 1,550 pcs) are accurately honored regardless of whether they divide evenly into MOQ multiples.

---

## 7. Verification & Regression Testing

### 7.1 Automated Suite: `storefront-product-card-and-wishlist-refinement.test.ts`
All 20 automated tests passed with 0 failures:
- **Group 1**: Product Card Structural Hierarchy & Visual Balance (canonical 3:4, frame, badges, brand logo).
- **Group 2**: Wishlist Functionality & Independence (toggle handler, active/saved states, guest redirect, sold out wishlistability).
- **Group 3**: Quick Add Enforcement & Pricing Invariants (disabled sold-out appearance, available modal opening, MOQ formula, Full Stock pricing, Pre-order handling).
- **Group 4**: Spatial Separation, Responsiveness & Hit Targets (Quick Add right inset, independent hit areas, title line-clamp-2, grouped MOQ metadata).
- **Group 5**: Accessibility Compliance & Data Privacy (aria labels, disabled labels, visible focus rings, zero cost-price leakage).
- **Group 6**: SSR Render Output Verification (badge rendering, brand logo aspect ratio, variant rendering).

### 7.2 Full Regression Gate Results
- **TypeScript**: `npx tsc --noEmit` → PASS (0 errors)
- **ESLint**: `npx eslint src` → PASS (0 errors)
- **Storefront Unit Regression**: 41/41 suites passed (100%)
- **Storefront Contract Regression**: PASS
- **Storefront Integration Security**: PASS
- **Next.js Production Build**: `npm run build` → PASS (57/57 pages generated)
- **Master Release Gate**: `npm run release:gate` → **APPROVED**

---

## 8. Browser QA & Visual Findings

Visual inspection conducted on `https://ayaanclothing.com/products` and homepage grids across viewports:
1. **Desktop (1920x865)**:
   - Product cards exhibit uniform row heights and crisp 3:4 aspect containers.
   - Hovering cards smoothly reveals `QUICK ADD` with an adjacent, separated `Wishlist` heart icon.
   - Brand logos render with zero distortion or boxy containers.
   - Low-stock badges (`ONLY 1 LEFT`, `ONLY 2 LEFT`) align directly with MOQ without jarring gaps.
2. **Mobile Viewport (375x812)**:
   - 2-column mobile grid renders without horizontal overflow or clipped text.
   - Wishlist button remains permanently accessible and comfortably tappable (32x32px minimum target).
   - Card titles clamp consistently at 2 lines, keeping all pricing rows horizontally aligned.
3. **Quick Add Modal**:
   - Opens instantaneously on click with correct SKU, available stock, MOQ stepper, Add to Cart, and Add to RFQ actions.
   - Closes cleanly via `Escape` key or explicit close button (`X`).

---

## 9. Deployment Protocol

1. **Commit Message**: `fix(storefront): refine product cards wishlist and availability states`
2. **Git Remotes**: Pushed to `origin/main` and `labib/main`.
3. **VPS Production**: Pulled commit onto `/var/www/ayaan`, verified Next.js production build, and executed graceful PM2 restart of `ayaan-customer`.
