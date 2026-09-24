# Commercial Offer Sheet Product Gallery Redesign
**Full-Width Multi-Image Product Gallery Standard**

---

## 1. Previous Gallery Behavior
In previously generated Commercial Offer Sheets (both in vector PDF exports and in web preview / print documents), the section titled `PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES` exhibited the following limitations:
- Only the single primary product image was rendered, centered in a large, mostly-empty box (80mm × 44mm in PDF; single `ProductHeroImage` in web preview).
- Massive unused whitespace was left on the left and right margins of the document.
- Available secondary images and production sample photos were either relegated to small disconnected thumbnails or ignored entirely during document layout.
- The gallery container had a fixed, excessive height reserve that did not scale with the actual image content.

---

## 2. Root Cause
1. **PDF Generator (`src/lib/pdf-generator.ts`):**
   - The PDF generator reserved a fixed 80mm × 44mm frame centered on the page at `x = margin + (contentWidth - 80) / 2`.
   - If secondary images existed, they were rendered as a tiny thumbnail rail (12mm × 15mm) below the primary image, instead of being integrated into a unified commercial product visual board.
   - When pre-loading images, secondary data URLs were sometimes excluded if `galleryDataUrls` was empty, defaulting only to `mainDataUrl`.
2. **Web Viewer Component (`src/components/admin/documents/CommercialProductGallery.tsx`):**
   - The React component mirrored an e-commerce PDP layout by using `ProductHeroImage` (large centered single hero) and `ProductImageThumbnails` underneath, rather than a full-width commercial product presentation board suitable for export documents.

---

## 3. New Gallery Layout
- **Full Usable Width:** The gallery spans the entire printable content width (182mm on A4 portrait, spanning from `x = 14mm` to `x = 196mm`).
- **Left-Aligned Flow:** All image tiles begin strictly at the left content margin (`margin = 14mm`) and flow left-to-right.
- **Content-Driven Dynamic Height:** The section height is strictly calculated based on the number of rows required:
  $$\text{Gallery Height} = \text{Rows} \times \text{Tile Height} + (\text{Rows} - 1) \times \text{Gap}$$
- **Zero Wasted Whitespace:** Large empty borders and awkward centering have been eliminated.
- **Section Title Intact:** Preserves the canonical uppercase heading: `PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES`.

---

## 4. Number of Columns & Tile Dimensions
- **Compact Professional Grid:**
  - **4 Columns:** Used when total available images $\le 4$.
    - Tile Width: $43.25\text{ mm}$
    - Tile Height: $54.06\text{ mm}$ ($4:5$ ratio)
    - Horizontal & Vertical Gap: $3.0\text{ mm}$
  - **5 Columns:** Used when total available images $\ge 5$.
    - Tile Width: $34.00\text{ mm}$
    - Tile Height: $42.50\text{ mm}$ ($4:5$ ratio)
    - Horizontal & Vertical Gap: $3.0\text{ mm}$
- **Web / Print Grid Classes:** `grid gap-2.5 sm:gap-3 grid-cols-4 sm:grid-cols-5`.

---

## 5. Canonical 4:5 Image Ratio & Fitting Standard
- **Enforced Frame Ratio:** Every image tile adheres to the website standard $4:5$ aspect ratio (`aspect-[4/5]`, `tileH = tileW * 1.25`).
- **Non-Destructive Fitting:** Images use contain behavior (`doc.addImage` calculated aspect contain with inner padding in PDF; `object-contain` in React).
- **Zero Cropping / Squashing:** Source files remain uncropped; the full garment is visible with natural proportions.

---

## 6. Image Ordering
- **Strict Deterministic Sequence:**
  1. Primary/featured image (`imageDataUrl` / `imageUrl` / `image`) appears at Index 0 (top-left tile).
  2. Secondary images (`galleryDataUrls` / `images`) follow sequentially in their exact registered catalog order.
- **Zero Random Reordering:** No artificial sorting by filename or size.

---

## 7. Multi-Row & Wrapping Behavior
- **Automatic Row Wrapping:** As soon as a row reaches column capacity ($4$ or $5$ images), the next image tile wraps to the subsequent row.
- **Incomplete Last Row Alignment:** Partially filled final rows (e.g. 9 images with 5 columns = Row 1: 5 images, Row 2: 4 images) remain strictly aligned to the **LEFT margin** (`x = 14mm`). Centering of incomplete rows is strictly prevented.

---

## 8. Multiple-Product Handling
- **Vector PDF Generator (`downloadCombinedProductOfferSheetsPDF`):**
  - Iterates through each item in the order.
  - Generates a dedicated, unmixed Offer Sheet page for each product.
  - Each product's gallery displays solely that product's images under its own reference.
- **Web Document Viewer (`CommercialProductGallery.tsx`):**
  - Features product selector tabs (`Item 1`, `Item 2`...) allowing instant review of each product's full-width image gallery.
  - Active item indicator highlights the current item name and SKU.

---

## 9. Page-Break & Boundary Handling
- **Mid-Gallery Page Break:**
  - Before rendering each row, available vertical space is checked against A4 height ($297\text{ mm}$).
  - If a row would overflow the printable margin, `doc.addPage()` is triggered.
  - Subsequent pages start with a continuation banner:
    `PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES (CONTINUED) • Ref: OF-...`
  - Subsequent image tiles resume cleanly from the left margin on the new page.
- **Specification Section Protection:**
  - Before starting Section 1 (`1. PRODUCT SPECIFICATION & DETAILS`), the generator verifies available height ($\sim 55\text{ mm}$ needed).
  - If insufficient space remains, Section 1 moves cleanly to a new page, guaranteeing **zero coordinate overlap** with the image gallery.

---

## 10. Missing Image Handling
- **Individual Broken/Empty Images:**
  - Skipped safely without corrupting the PDF or breaking layout.
  - Web viewer utilizes `onError` handlers to gracefully hide broken image tiles without leaving oversized placeholders.
- **All Images Missing:**
  - Displays a compact, professional fallback banner: `No product images available.` (12mm height in PDF, compact bordered box in web viewer).

---

## 11. Files Changed
1. **`src/lib/pdf-generator.ts`**:
   - Replaced centered single-image box with multi-row, full-width 4:5 grid starting at left margin (`margin = 14mm`, `contentWidth = 182mm`).
   - Added automatic row wrapping with page-break overflow protection and continuation banner.
   - Standardized image source resolution across `downloadProductOfferSheetPDF` and `downloadCombinedProductOfferSheetsPDF`.
   - Maintained canonical 4:5 reference constants (`thumbW = 12; thumbH = 15;`).
2. **`src/components/admin/documents/CommercialProductGallery.tsx`**:
   - Redesigned component from hero-and-thumbnails into a full-width responsive 4:5 grid (`grid-cols-4 sm:grid-cols-5`).
   - Integrated non-destructive `object-contain` fitting on all sample tiles.
   - Updated section title to `PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES`.
   - Added interactive preview modal and compact empty fallback.
3. **`tests/offer-sheet-gallery.test.ts`** [NEW]:
   - Comprehensive automated test suite validating requirements A through J plus web component architectural invariants.

---

## 12. Tests
- **Offer Sheet Gallery Test Suite (`tests/offer-sheet-gallery.test.ts`):**
  - **Test A:** Product with 1 image $\rightarrow$ 1 image rendered from left margin (`14mm`) [PASS]
  - **Test B:** Product with 4 images $\rightarrow$ all 4 rendered in single 4-column row [PASS]
  - **Test C:** Product with 5 images $\rightarrow$ all 5 rendered across 5 columns in single row [PASS]
  - **Test D:** Product with 9 images $\rightarrow$ 9 rendered across 2 rows, incomplete row left-aligned [PASS]
  - **Test E:** Product with 12 images $\rightarrow$ all 12 rendered across 3 rows [PASS]
  - **Test F:** Multiple products $\rightarrow$ images strictly isolated to respective products [PASS]
  - **Test G:** Missing image $\rightarrow$ invalid image skipped; compact fallback rendered when 0 images [PASS]
  - **Test H:** Gallery overflow $\rightarrow$ multi-page break triggered with continuation header [PASS]
  - **Test I:** Section 1 begins strictly after gallery with zero overlap ($y_{\text{spec}} > y_{\text{gallery}}$) [PASS]
  - **Test J:** No image duplication $\rightarrow$ duplicate URLs deduplicated safely [PASS]
  - **Component Invariants:** Verified 4:5 aspect ratio, object-contain, heading, and removal of hero image box [PASS]
  - **Result: 34 PASSED | 0 FAILED**
- **Global 4:5 Image Standardization Suite (`tests/product-image-ratio-4-5.test.ts`):**
  - **Result: 46 PASSED | 0 FAILED**
- **Product Detail UI Hierarchy Suite (`tests/product-detail-ui-hierarchy.test.ts`):**
  - **Result: ALL PASSED**

---

## 13. TypeScript Result
Command: `npx tsc --noEmit`
- **Exit Code:** `0`
- **Errors:** `0`

---

## 14. Production Build Result
Command: `npm run build`
- **Compiler:** Next.js 16.3.2 (Turbopack)
- **Status:** Compiled successfully in 1100ms
- **Static Pages:** 40/40 static pages generated
- **Errors:** `0`
