# PRODUCT DETAIL PAGE UI HIERARCHY REDESIGN REPORT
**Project:** Ayaan Clothing — Next.js B2B Customer Storefront  
**Date:** September 2026  
**Status:** Completed & Validated

---

## Executive Summary

The Product Detail page (`src/app/products/[slug]/ProductDetailView.tsx` and related components) has been completely redesigned from a long editorial article/document format into a **refined, high-velocity B2B ecommerce purchasing interface**.

The interface now establishes a distinct 5-level visual hierarchy where commercial identity, volume pricing tiers, quantity stepping, package assortment configurations, real-time commercial totals, and the primary Add to Cart action communicate their purpose immediately. Every clickable element features prominent interactive affordances (rings, tactile borders, active tinting, hover states, and clear button surfaces).

---

## 1. Problems Found in Legacy Implementation

1. **Editorial / Article-Like Appearance**:
   - Section headers looked like publication subheadings (`BUY MORE, SAVE MORE`, `ORDER QUANTITY`, `SPECIFICATIONS`) instead of cohesive UI module boundaries.
   - Long vertical scroll with low visual distinction between static technical data and transactional controls.
2. **Weak Top Metadata Strip**:
   - Rendered as plain text separated by interpunct dots (`GAP · ORIGINAL · SKU · MEN · SHORTS`), failing to emphasize the brand or communicate that these were standardized metadata attributes.
3. **Passive Interactive Controls**:
   - Volume pricing tiers were rendered as standard text rows with minimal visual feedback, lacking obvious radio/selected indicators and tactile borders.
   - Order quantity buttons were tiny with low contrast, lacking prominent tabular count hierarchy.
   - Estimated total sat passively without clear visual connection to the active volume tier and quantity breakdown.
4. **Document-Like Package Assortment**:
   - Looked like an arbitrary table from a technical spec sheet rather than an essential, configured B2B purchase module.
5. **Secondary Actions Competing with Primary CTA**:
   - Add to Cart lacked dominance, while specifications in the left column read like unstructured editorial copy.

---

## 2. New 5-Level Visual Hierarchy

The right-side purchasing column now guides the buyer's eye seamlessly through 5 distinct levels:

```
LEVEL 1 — PRODUCT IDENTITY
  ├── Brand Badge (high-contrast, dominant)
  ├── Design Type Tag (Original / Master Copy)
  ├── Audience & Category Tags
  ├── Monospace SKU
  └── Product Name (Manrope H1, tight line-height)

LEVEL 2 — CORE COMMERCIAL DATA
  ├── Primary Unit Price ($XX.XX / pc in bold Manrope)
  ├── MOQ Pill (e.g. MOQ: 50 pcs)
  ├── Live Available Stock Counter (e.g. 900 pcs available)
  └── Subtle Horizontal Divider

LEVEL 3 — PURCHASING OPTIONS (COMMERCE MODULES)
  ├── Buy More, Save More Panel (Selectable PricingTierOption rows)
  ├── Order Quantity & Estimated Total Decision Block (QuantityStepper + CommerceSummary)
  └── Package Assortment Panel (Summary Chips + Styled Ratio Matrix)

LEVEL 4 — PRIMARY ACTION
  ├── Dominant Full-Width "ADD TO CART" CTA Button (Cart icon, elevation, hover/active)
  ├── Subordinate Icon-Only Wishlist Button
  └── Secondary WhatsApp Inquiry Link

LEVEL 5 — SUPPORTING INFORMATION
  ├── Canonical 4:5 Media Gallery with Return to Photos overlay
  └── Structured Specifications Grid (Key-value cards, only real product data)
```

---

## 3. Interactive Element Changes & Affordances

| Element | Previous Appearance | Redesigned Interactive Affordance |
| :--- | :--- | :--- |
| **Brand Link** | Plain text link | High-contrast dark badge (`bg-foreground text-background shadow-2xs hover:bg-foreground/90`) |
| **Pricing Tier Rows** | Plain clickable row | `role="radio"` container with circular radio selection indicator, `ring-2 ring-foreground/90 bg-secondary/40` active state, and hover elevation |
| **Quantity Buttons** | Thin generic borders | Tactile `−` and `+` buttons (`w-10 h-10`, hover background, active press, disabled states) around high-contrast tabular number box |
| **Add to Cart** | Standard button | Full-width `h-12 sm:h-13` dominant dark CTA, bold Manrope typography, shopping cart icon, scale transition |
| **Wishlist Button** | Basic border | Compact `h-12 w-12` rounded-xl button, rose fill on active, distinct hover/active scale |
| **Gallery Thumbnails** | Low-contrast ring | High-contrast `border-foreground ring-2 ring-foreground/25 opacity-100 scale-[1.02]` on active; subtle hover on inactive |
| **Gallery Video** | Ambiguous embed | Selectable 4:5 thumbnail with red play button, "VIDEO" tag, and "← Back to Photos" overlay |

---

## 4. Pricing Tier Redesign (`PricingTierOption`)

A reusable, accessible component (`src/components/product/PricingTierOption.tsx`):
- **Structure**: Grid layout with Tier Name (`Standard`, `Bulk`, `Take All`), Quantity Range, Discount Badge (`20% OFF`), and Unit Price.
- **Affordance**: Unmistakable circular radio indicator with active center dot, active border, and subtle tinted background.
- **Accessibility**: ARIA `role="radio"`, `aria-checked`, keyboard focus with `Enter` and `Space` triggers.
- **Compact & Professional**: Fits naturally inside a subtle card panel without excessive padding or oversized borders.

---

## 5. Quantity Control Redesign (`QuantityStepper`)

A dedicated B2B commerce stepper (`src/components/product/QuantityStepper.tsx`):
- Features tactile increment/decrement controls with high-contrast borders and clear `Minus` / `Plus` icons.
- Displays prominent tabular numbers in bold font (`min-w-20 font-display font-bold text-[15px] sm:text-[16px]`).
- Includes disabled state handling when at MOQ lower bound or total warehouse stock upper bound.
- Accompanied by helper text: `Multiples of {moq} pcs`.

---

## 6. Package Assortment Redesign

Transformed into a defined commerce module:
- Header: `CommerceSectionHeader` with `Package` icon and a total units pill (`{total} pcs total`).
- Summary Chips: High-contrast badges for `Colors: Black` (with color swatch dot) and `Sizes: 32`.
- Ratio Matrix Table: Cleanly bordered table with uppercase table headers, color chips, zebra/hover rows, and highlighted total column and footer.

---

## 7. Primary CTA Redesign

- Full-width dominant button (`#add-to-cart-button`): Deep navy/foreground background, high contrast white text, prominent `ShoppingCart` icon, and tactile press animation (`active:scale-[0.99]`).
- Visually dominates all secondary actions on the screen.
- Wishlist button is cleanly tucked alongside as a subordinate secondary icon button.
- Preserves strict business rule: **ADD TO CART only** (zero fake Buy Now, direct checkout, or RFQ buttons).

---

## 8. Media Gallery Redesign (`ProductGallery.tsx`)

- Enforces canonical 4:5 image ratio (`aspect-[4/5] aspect-product`) with non-destructive `object-contain`.
- Thumbnails feature sharp active rings (`border-foreground ring-2 ring-foreground/25`) and active scale.
- Video mode features an integrated "← Back to Photos" overlay button allowing instant return to photos without having to hunt for the first thumbnail.
- Video thumbnail button matches 4:5 dimensions, with a prominent red play badge and "VIDEO" label.
- Preserved 100% of existing functionality: touch swipe, arrow controls, thumbnail auto-scroll, and lightbox viewer.

---

## 9. Typography Hierarchy

- **Headings & Commerce Numbers**: `Manrope` (`font-display`):
  - Product Title: `text-2xl sm:text-3xl lg:text-[30px] font-extrabold uppercase tracking-tight`
  - Commercial Price: `text-3xl sm:text-4xl font-extrabold tabular-nums`
  - Estimated Total: `text-2xl sm:text-[26px] font-extrabold tabular-nums`
  - Module Headers: `text-[12px] sm:text-[13px] font-bold uppercase tracking-wider`
- **Metadata & Data Labels**: `Inter` (`font-sans`):
  - Metadata strip: `text-[11px] sm:text-[12px]`
  - Matrix table cells & SKU: `font-mono tabular-nums text-[11.5px]`

---

## 10. Section Header System (`CommerceSectionHeader`)

A unified module header system replacing article-like headings:
- Compact uppercase typography with optional primary-tinted icon (`TrendingDown`, `Package`, `Sliders`).
- Supports right-aligned subtitles (`Select a tier to update order quantity`, `Product Details`) and badge pills (`50 pcs total`).
- Establishes clear UI module containment.

---

## 11. Shared Components Created

1. `src/components/product/CommerceSectionHeader.tsx`: Unified header for commerce UI modules.
2. `src/components/product/PricingTierOption.tsx`: Selectable volume pricing tier row with radio indicator and discount badge.
3. `src/components/product/QuantityStepper.tsx`: Tactile B2B quantity stepper with boundary handling.
4. `src/components/product/CommerceSummary.tsx`: Real-time commercial order total summary block.

---

## 12. Files Changed

- `src/components/product/CommerceSectionHeader.tsx` (NEW)
- `src/components/product/PricingTierOption.tsx` (NEW)
- `src/components/product/QuantityStepper.tsx` (NEW)
- `src/components/product/CommerceSummary.tsx` (NEW)
- `src/components/product/ProductGallery.tsx` (MODIFIED)
- `src/app/products/[slug]/ProductDetailView.tsx` (MODIFIED)
- `tests/product-detail-ui-hierarchy.test.ts` (NEW)

---

## 13. TypeScript Result

```bash
$ npx tsc --noEmit
# Exit code: 0 (Zero errors)
```

---

## 14. ESLint Result

```bash
$ npm run lint
# Exit code: 0 (Zero errors across all storefront and admin components)
```

---

## 15. Automated Test Suites & Production Build Results

### Automated Test Suites

```bash
$ npx tsx tests/product-detail-ui-hierarchy.test.ts
==================================================
PRODUCT DETAIL PAGE UI HIERARCHY AUDIT TESTS
==================================================
▶ Suite 1: Shared Commerce UI Components
✅ [PASS] CommerceSectionHeader exists and supports title, icon, subtitle, and badge
✅ [PASS] PricingTierOption exists and provides accessible radio attributes and selection styling
✅ [PASS] QuantityStepper exists and supports increment, decrement, and disabled states
✅ [PASS] CommerceSummary exists and dynamically connects total to unit price calculation

▶ Suite 2: Level 1 — Product Identity & Metadata Strip
✅ [PASS] Brand is styled with prominent badge/pill as the strongest metadata item
✅ [PASS] Design Type (Original / Master Copy) is clearly identifiable as a metadata tag
✅ [PASS] Eliminates legacy plain article text with interpunct dots in metadata
✅ [PASS] Product Title is a commanding Manrope heading with controlled line height

▶ Suite 3: Level 2 — Dedicated Commercial Price Block
✅ [PASS] Primary B2B unit price is visually dominant with / pc suffix
✅ [PASS] MOQ and stock availability indicators are neatly aligned in commercial header

▶ Suite 4: Level 3 — Purchasing Options & Modules
✅ [PASS] Buy More Save More module uses PricingTierOption with selection handlers
✅ [PASS] Order Quantity and Estimated Total are rendered in dedicated commerce blocks
✅ [PASS] Package Assortment is enclosed in a commerce panel with total units and ratio matrix

▶ Suite 5: Level 4 — Primary Action
✅ [PASS] Add to Cart button visually dominates as the primary full-width action
✅ [PASS] Wishlist toggle button is clearly subordinate and secondary
✅ [PASS] Strictly preserves Add to Cart only: no Buy Now, direct checkout, or RFQ triggers

▶ Suite 6: Level 5 — Supporting Information
✅ [PASS] Specifications module uses CommerceSectionHeader and structured key-value tiles

▶ Suite 7: Media Gallery Interaction Affordances
✅ [PASS] ProductGallery contains Back to Photos control and refined interactive thumbnail states
==================================================
PRODUCT DETAIL UI HIERARCHY TESTS: ALL PASSED
==================================================
```

```bash
$ npx tsx tests/product-image-ratio-4-5.test.ts
==================================================
TEST RUN COMPLETE: 46 PASSED | 0 FAILED
==================================================
```

### Production Build

```bash
$ npm run build
▲ Next.js 16.3.2 (Turbopack)
✓ Compiled successfully in 889ms
✓ Finished TypeScript in 1344ms 
✓ Generating static pages using 9 workers (40/40) in 343ms
✓ Finalizing page optimization in 19ms
# Exit code: 0
```
