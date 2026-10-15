# AYAAN CLOTHING — Products Table Spacing & Image Visibility Redesign Report

**Date:** October 15, 2026  
**Auditor / Engineer:** Antigravity Agentic Pair Programmer  
**Target Module:** Admin Products Table (`/ayc/products`)  
**Status:** COMPLETE & VERIFIED  

---

## Executive Summary

Based on an audit of the live AYAAN CLOTHING Admin Products table, this initiative redesigned table spacing, column distribution, row dimensions, and thumbnail presentation:

1. **Eliminated Excessive Gap Between Product Name and SKU:** Replaced unconstrained `w-auto` flexible expansion with an explicit, controlled width of **250px** for the Product column (`min-w-[250px] w-[250px]`). Positioned the SKU column (**125px**, monospace font) immediately adjacent to the Product column with natural, consistent 12px table cell spacing.
2. **Spacious Right-Side Columns:** Redesigned the width distribution across all 15 columns, giving ample breathing room to Brand (115px), Category (115px), Audience (75px), Price (72px), MOQ (65px), Stock (84px), Available MOQs (90px), Status (100px), and Actions (98px). Prevented text truncation, badge overlap, and compressed action buttons.
3. **Double Row Height & 64px Thumbnails:** Increased desktop row height from compact (~44px) to **~84px** (within the target 72–88px range), with all cell contents (drag handle, checkbox, photo, title, SKU, brand, numbers, status, and actions) vertically centered (`align-middle`). Thumbnails were enlarged to **48px wide by 64px high** (`w-12 h-16 aspect-[3/4]`), significantly improving garment identification.
4. **Removed Image Borders & Tile Containers:** Removed all decorative borders (`border border-border/40`), background card containers (`bg-secondary`), and image-wrapper padding (`p-0.5`). Garments are now presented directly on the row background with canonical 3:4 aspect ratio (`aspect-[3/4] object-contain`). Integrated a clean, neutral fallback `<Package size={22} className="text-muted-foreground/35" />` for items without photographs.
5. **Controlled Horizontal Scroll Layout:** Configured the table with `min-w-[1405px] w-full table-fixed` wrapped in an `overflow-x-auto subtle-scrollbar` container. On viewports below 1600px, horizontal scrolling allows every column to maintain its optimal width without squeezing content, while the Actions column remains sticky on the right (`sticky right-0`).

---

## 1. Column Width & Layout Distribution

### Comparison: Before vs. After Redesign

| Column Key | Header Label | Width Before | Width After | Alignment & Presentation |
|---|---|---|---|---|
| `reorder` | Drag Handle | 36px (`w-9`) | **36px** (`w-9`) | Centered, `align-middle`, accessible drag handle |
| `select` | Checkbox | 32px (`w-8`) | **34px** (`w-[34px]`) | Centered, `align-middle`, 14px checkbox |
| `thumbnail` | Image | 42px | **60px** (`w-[60px]`) | Centered, `align-middle`, 48px × 64px unbordered image |
| `productId` | ID | 82px | **86px** (`w-[86px]`) | Centered, `align-middle`, monospace pill with title tooltip |
| `product` | Product | `w-auto` (~660px gap) | **250px** (`w-[250px]`) | Left-aligned, `align-middle`, 2-line title + tags |
| `sku` | SKU | 110px | **125px** (`w-[125px]`) | Left-aligned, `align-middle`, monospace font, immediately next to Product |
| `brand` | Brand | 92px | **115px** (`w-[115px]`) | Left-aligned, `align-middle`, brand logo + name |
| `category` | Category | 86px | **115px** (`w-[115px]`) | Left-aligned, `align-middle`, fits full category names |
| `audience` | Audience | 64px | **75px** (`w-[75px]`) | Left-aligned, `align-middle`, bold uppercase badge text |
| `price` | Price | 58px | **72px** (`w-[72px]`) | Right-aligned, `align-middle`, tabular monospace currency |
| `moq` | MOQ | 50px | **65px** (`w-[65px]`) | Right-aligned, `align-middle`, tabular numbers + "pcs" |
| `stock` | Stock | 66px | **84px** (`w-[84px]`) | Right-aligned, `align-middle`, tabular numbers + status warning |
| `availableMoqs` | MOQs | 68px | **90px** (`w-[90px]`) | Right-aligned, `align-middle`, badge pill (e.g. "200 MOQs") |
| `status` | Status | 80px | **100px** (`w-[100px]`) | Left-aligned, `align-middle`, publication pill + availability |
| `actions` | Actions | 86px | **98px** (`w-[98px]`) | Sticky right (`sticky right-0`), Move Up/Down + More Actions |

**Total Table Geometry:** `min-w-[1405px]` with strict column widths in `<colgroup>`.

---

## 2. Root Cause Analysis & Detailed Fixes

### Issue 1: Excessive Empty Space Between Product Name and SKU
- **Root Cause:** In the previous layout, `PRODUCT_COLUMNS` defined 14 fixed-width columns totaling 952px, while the `product` column was given `colWidthClass: "min-w-[190px] w-auto"` with no explicit width. Because CSS `table-layout: fixed` distributes all remaining container width to non-fixed columns, the browser allocated 500px–700px to the `product` column on typical desktop displays. Because product titles only occupied ~200px, a massive 400px–500px blank void was created between the product title and the SKU column.
- **Fix:** Assigned an explicit `width: "250px"` and `colWidthClass: "w-[250px]"` to the `product` column, and `width: "125px"` to the `sku` column. Allowed long titles to wrap across 2 lines (`line-clamp-2 leading-snug text-xs font-bold`), keeping badges cleanly stacked underneath. SKU sits immediately to the right with normal 12px table cell padding.

### Issue 2: Crowded Right-Side Columns
- **Root Cause:** Squeezing the remaining 10 business columns into narrow boundaries (e.g., Brand 92px, Category 86px, Price 58px, MOQ 50px) forced text truncation on everyday category names like "Dresses & Gowns" or "Outerwear & Jackets", and caused status badges to crowd each other.
- **Fix:** Increased column widths across the board (Brand: 115px, Category: 115px, Audience: 75px, Price: 72px, MOQ: 65px, Stock: 84px, MOQs: 90px, Status: 100px, Actions: 98px). Established an intentional horizontal scroll container with `subtle-scrollbar`, prioritizing comfortable legibility over squeezing.

### Issue 3: Small Garment Thumbnails & Compact Rows
- **Root Cause:** Product thumbnails were rendered at `w-7 h-[37px]` (28px × 37px) inside a compact `py-1.5` table row (~44px total height), making it difficult to distinguish garment styles, fabric patterns, or embroidery details.
- **Fix:** Increased row height to **~84px** (`py-2.5 sm:py-3 align-middle`) and enlarged the image frame to **48px wide by 64px high** (`w-12 h-16 aspect-[3/4]`), centered within a 60px column. This provides more than double the visual area for garment photographs while maintaining the canonical 3:4 fashion photography ratio.

### Issue 4: Decorative Borders and Background Tiles Around Images
- **Root Cause:** Thumbnails were wrapped in `rounded-md overflow-hidden bg-secondary border border-border/40 shrink-0 p-0.5 mx-auto`, creating an artificial framed box around each photograph.
- **Fix:** Stripped the border, background color, padding, and rounded container. Garment photographs now sit cleanly and directly on the table row background with `object-contain`. When an image is unavailable, a neutral, subtle `<Package size={22} className="text-muted-foreground/35" />` icon is displayed without any container tile.

---

## 3. Verification & Automated Test Results

### Automated Test Suites Executed

| Test Suite File | Checks | Result | Notes |
|---|---|---|---|
| `tests/admin-product-table-no-horizontal-scroll.test.ts` | 30 / 30 | **PASSED** | 15 columns verified, budget checks, tooltips, sticky actions. |
| `tests/admin-product-count-metrics-consistency.test.ts` | 15 / 15 | **PASSED** | Shared service, statistics endpoint, unpaginated catalog, draft integrity. |
| `tests/admin-sidebar-collapse-expand.test.ts` | 11 / 11 | **PASSED** | Single toggle verified; duplicate header & bottom toggles confirmed removed. |
| `tests/admin-global-reordering-show-all.test.ts` | 19 / 19 | **PASSED** | [5, 10, 20, 50, All] options across all listing tables. |
| `tests/admin-product-actions-audit.test.ts` | 42 / 42 | **PASSED** | Stock adjust, Sold Out, duplicate, delete, and permission gating. |
| `tests/admin-drag-drop-reorder.test.ts` | 14 / 14 | **PASSED** | Drag handles, sequence ordering, and normalization. |

### Compilation & Build Validation
- **TypeScript:** `npx tsc --noEmit` exited cleanly with **0 errors**.
- **Next.js Production Build:** `npm run build` compiled all **56 static and dynamic routes** successfully.

### Browser Live Verification
- **Page Tested:** `http://localhost:3000/ayc/products`
- **Product Name & SKU:** Verified that Product Name (250px) and SKU (125px) sit side-by-side with no gap.
- **Right-Side Columns:** Verified generous breathing room for Brand, Category, Audience, Price, MOQ, Stock, MOQs, Status, and Actions.
- **Thumbnails:** Verified 64px unbordered, direct garment presentation.
- **Row Height:** Verified ~84px height with clean vertical centering (`align-middle`).
- **Interactive Actions:** Verified that clicking the first row's More Actions button opens the dropdown menu cleanly inside the viewport without clipping.

---

## 4. Modified Files

1. [src/components/admin/products/ProductTable.tsx](file:///Users/luhasan/Documents/ayaan/src/components/admin/products/ProductTable.tsx):
   - Redesigned `PRODUCT_COLUMNS` with explicit widths: `reorder` (36px), `select` (34px), `thumbnail` (60px), `productId` (86px), `product` (250px), `sku` (125px), `brand` (115px), `category` (115px), `audience` (75px), `price` (72px), `moq` (65px), `stock` (84px), `availableMoqs` (90px), `status` (100px), `actions` (98px).
   - Configured `min-w-[1405px]` and `subtle-scrollbar` on both skeleton and live table elements.
   - Updated skeleton loader to match 84px row height and 64px image placeholder.
2. [src/components/admin/products/ProductTableRow.tsx](file:///Users/luhasan/Documents/ayaan/src/components/admin/products/ProductTableRow.tsx):
   - Added `Package` icon import for neutral missing-image fallback.
   - Updated all cells with `align-middle py-2.5 sm:py-3` and matching widths.
   - Removed thumbnail borders, background tile, and padding; rendered direct `w-12 h-16 aspect-[3/4] object-contain` presentation.
   - Styled Product title with `line-clamp-2 leading-snug text-xs font-bold` and title tooltip.
   - Positioned SKU immediately adjacent to Product.
   - Enhanced sticky right actions column styling and shadow.
3. [tests/admin-product-table-no-horizontal-scroll.test.ts](file:///Users/luhasan/Documents/ayaan/tests/admin-product-table-no-horizontal-scroll.test.ts):
   - Updated fixed column budget to 1155px and actions width to 98px.
