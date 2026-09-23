# Global Product Image Standard

## Canonical Ratio
**4:5** (`aspect-ratio: 4 / 5`)

All product images throughout the entire website must use a consistent 4:5 display ratio across desktop, tablet, and mobile breakpoints. The width scales responsively while the 4:5 ratio remains locked.

```css
aspect-ratio: 4 / 5;
```

---

## Reference Sizes

- **Product Listing / Shop Grid:** `800 × 1000 px`
- **Product Detail Main Image:** `1200 × 1500 px`
- **Product Thumbnails:** `400 × 500 px`
- **Compact / Row Previews:** `160 × 200 px`

*Note: Reference dimensions define the canonical visual proportions for display framing and responsive image quality targets. Source images are not required to be physically resized to these exact pixel dimensions.*

---

## Source Image Policy
**Original source images are never destructively cropped.**

- Stored and uploaded image files remain 100% original and intact.
- Phone/camera photos in any aspect ratio (1:1, 3:4, 2:3, 9:16, landscape, etc.) are accepted without requiring manual cropping during upload.
- No destructive `object-fit: cover` that clips product edges or silhouettes.

---

## Display Policy
**All product-image frames use 4:5.**

The website displays source images inside a canonical 4:5 container frame across all viewports and contexts. The container preserves stable layout geometry during loading, loaded, and fallback states.

---

## Fit
**Contain / Non-Destructive Presentation.**

- Container: `aspect-ratio: 4 / 5; overflow: hidden;`
- Image: `width: 100%; height: 100%; object-fit: contain; object-position: center;`
- Surface: Clean contextual background (`bg-secondary/40`, `dark:bg-white/5`, etc.) with subtle borders and rounded corners appropriate to the container.

---

## Covered Areas

### Customer Storefront
- **Homepage Hot Sale:** 4:5 via shared `ProductCard`
- **Featured Products:** 4:5 via shared `ProductCard`
- **Shop By Brand Product Expansion:** 4:5 via shared `ProductCard`
- **Audience Product Results:** 4:5 via shared `ProductCard`
- **Category Product Results:** 4:5 via shared `ProductCard`
- **Catalog & Search Results (`/search`):** 4:5 via shared `ProductCard` & `ProductCardSkeleton`
- **Search Overlay (`SearchOverlay`):** 4:5 trending and instant live search item cards
- **Related Products:** 4:5 via shared `ProductCard`
- **Product Detail Main Image (`ProductGallery`):** 4:5 portrait frame with swipe, zoom, and lightbox
- **Product Detail Thumbnails (`ProductGallery`):** 4:5 thumbnail rail buttons
- **Product Quick Add Modal (`ProductQuickAddModal`):** 4:5 gallery view
- **Cart (`MiniCart`):** 4:5 drawer item thumbnail
- **Customer Saved Items (`SavedItemsCard`):** 4:5 saved product thumbnail
- **Customer RFQ Page (`/rfq`):** 4:5 item preview
- **Customer Orders List (`/profile/orders`):** 4:5 order item row thumbnail
- **Customer Order Detail (`/profile/orders/[id]`):** 4:5 order detail item image
- **Customer Dashboard Order Detail (`/dashboard/orders/[id]`):** 4:5 item thumbnail
- **Customer Dashboard RFQ Detail (`/dashboard/rfq/[id]`):** 4:5 item thumbnail
- **Customer Dashboard Reorder Catalog (`/dashboard/reorder`):** 4:5 item card and skeleton
- **Customer Dashboard Reorder Preview (`DashboardReorderPreview`):** 4:5 preview thumbnail

### Admin Management Portal
- **Product Catalog Table (`ProductTableRow`):** 4:5 table row thumbnail
- **Product Create / Edit Image Upload (`ProductImagesSection`):** 4:5 preview cards (non-destructive upload)
- **Inventory Rows (`InventoryRow`):** 4:5 table row thumbnail
- **Inventory Mobile Cards (`InventoryTable`):** 4:5 mobile item thumbnail
- **Stock Adjustment Modal (`StockAdjustmentModal`):** 4:5 product summary thumbnail
- **Inventory History Modal (`InventoryHistoryModal`):** 4:5 product thumbnail
- **Admin Order Detail Items (`OrderItemsTable`):** 4:5 order items thumbnail
- **Admin RFQ Items (`RfqItemsTable`):** 4:5 inquiry item thumbnail

### Documents & PDF Previews
- **Commercial Offer Sheet (`OfferSheetDocument`):** 4:5 item table thumbnail
- **Proforma Invoice (`ProformaInvoiceDocument`):** 4:5 item table thumbnail
- **Commercial Quotation (`QuotationDocument`):** 4:5 item table thumbnail
- **Commercial Product Gallery Hero (`ProductHeroImage`):** 4:5 export document hero image frame
- **Commercial Document Thumbnails (`ProductImageThumbnails`):** 4:5 thumbnail buttons
- **PDF Binary Generator (`pdf-generator.ts`):** 4:5 bounding box (`12mm × 15mm`) for gallery thumbnails

---

## Exceptions
**Only non-product imagery is excluded.**

Per architectural rules, the 4:5 standardization applies strictly to **product images**. The following non-product elements retain their intended designs:
1. **Brand Logos:** Brand tiles (`BrandTile`), brand logo tiles (`BrandLogoTile`), and brand logo overlays (`ProductBrandLogoOverlay`) retain true 1:1 square ratio (`aspect-square`) with `object-contain`.
2. **Category Banners / Highlights:** Category explorer cards (`CategoryHighlights`, `AllCategoriesPanel`) retain their landscape aspect ratios (`16:10` / `4:3`).
3. **Audience Editorial Icons:** Vector silhouette icons (`AudienceIcons`, `AudienceCard`).
4. **Promotional Hero Banners:** Top banner (`TopBanner`), admin banner management (`BannerImageUploader`, `HomepageBannerPreview`).
5. **Certificates & Badges:** Compliance certificates (`BrandTrust`).
6. **User Avatars:** Customer and admin profile avatars.
7. **Payment Proofs:** Bank wire transfer slip reviews (`PaymentProofReview`).

---

## Components

### Canonical Component
- **`src/components/common/ProductImageFrame.tsx`**: Authoritative 4:5 container with non-destructive `object-contain`, graceful fallback handling, and responsive scaling.
- **`src/components/product/ProductImageFrame.tsx`**: Re-export for seamless imports within product domain components.

### Core Consumers
- `ProductCard` (`src/components/product/ProductCard.tsx`)
- `ProductCardSkeleton` (`src/components/product/ProductCardSkeleton.tsx`)
- `ProductGallery` (`src/components/product/ProductGallery.tsx`)
- `MiniCart` (`src/components/cart/MiniCart.tsx`)
- `SearchOverlay` (`src/components/layout/SearchOverlay.tsx`)
- `SavedItemsCard` (`src/components/account/SavedItemsCard.tsx`)
- `ProductTableRow` (`src/components/admin/products/ProductTableRow.tsx`)
- `ProductImagesSection` (`src/components/admin/products/form/ProductImagesSection.tsx`)
- `InventoryRow` (`src/components/admin/inventory/InventoryRow.tsx`)
- `InventoryTable` (`src/components/admin/inventory/InventoryTable.tsx`)
- `StockAdjustmentModal` (`src/components/admin/inventory/StockAdjustmentModal.tsx`)
- `InventoryHistoryModal` (`src/components/admin/inventory/InventoryHistoryModal.tsx`)
- `OrderItemsTable` (`src/components/admin/orders/OrderItemsTable.tsx`)
- `RfqItemsTable` (`src/components/admin/rfq/RfqItemsTable.tsx`)
- `OfferSheetDocument` (`src/components/admin/documents/OfferSheetDocument.tsx`)
- `ProformaInvoiceDocument` (`src/components/admin/documents/ProformaInvoiceDocument.tsx`)
- `QuotationDocument` (`src/components/admin/documents/QuotationDocument.tsx`)
- `ProductHeroImage` (`src/components/admin/documents/ProductHeroImage.tsx`)
- `ProductImageThumbnails` (`src/components/admin/documents/ProductImageThumbnails.tsx`)

---

## Validation

- **TypeScript:** `npx tsc --noEmit` — 0 errors
- **ESLint:** `npm run lint` — 0 errors
- **Automated Tests:** `npx tsx tests/product-image-ratio-4-5.test.ts` — 46/46 tests passed
- **Regression Tests:** All category, audience, brand, and pagination suites passing
- **Production Build:** `npm run build` — Compiled successfully (40/40 routes)
