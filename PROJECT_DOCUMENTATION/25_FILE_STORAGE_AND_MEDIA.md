# 25 — File Storage, Media & Document Management

This document details asset handling, file uploads, document generation, and storage disk configurations.

---

## 1. Storage Disks & Directory Organization

Configured in `backend/config/filesystems.php`:
- **Local Disk (`public`)**:
  - Root: `backend/storage/app/public/`
  - Symlinked to public web access via `php artisan storage:link` (`backend/public/storage`).
  - Serving Path: `http://127.0.0.1:8000/storage/...`
- **Cloud Disk (`s3`)**:
  - Available for containerized and multi-region production deployments via AWS S3 / Cloudflare R2 (`FILESYSTEM_DISK=s3`).

### Storage Directory Structure:
```
backend/storage/app/public/
├── products/              # High-resolution garment photographs
├── categories/            # Category showcase banners
├── brands/                # Uploaded brand logos
├── payment_receipts/      # Scanned customer bank wire deposit slips
├── rfq_attachments/       # Buyer tech packs, CAD sketches, specification sheets
└── documents/             # Server-compiled Proforma & Commercial Invoices (PDF)
```

---

## 2. Upload Pipelines & Validation

### 2.1 Product Image Pipeline
- **Endpoint**: `POST /api/v1/products/{id}/images` (or general `/api/v1/upload`).
- **Validation**:
  - MIME: `image/jpeg,image/png,image/webp`.
  - Max Size: 10MB per file.
- **Naming Rule**: Generated via `Str::uuid() . '.' . $extension` to prevent filesystem collisions.
- **Database Persistence**: Saved to `product_images` table with explicit `sort_order` and `is_primary` flag.
- **Reordering**: Supported via `PUT /api/v1/products/{id}/images/reorder` with array of ordered IDs.

### 2.2 Payment Slip Pipeline
- **Endpoint**: `POST /api/v1/orders/{id}/payment-proof`.
- **Validation**: `mimes:jpg,jpeg,png,pdf|max:10240`.
- **Security**: Stored in `payment_receipts/` directory. Accessible only to the order owner and administrative staff.

---

## 3. Garment Photography 4:5 Aspect Ratio Standard

All garment assets displayed across the customer storefront and admin management portal enforce a strict portrait standard:
- **Aspect Ratio**: 4:5 (Width:Height = 0.80).
- **Recommended Upload Resolution**: `1200 x 1500 px` or `800 x 1000 px`.
- **Presentation Treatment**: CSS `object-fit: cover; object-position: top center;` ensures garment necklines and hemlines are properly framed without distortion.

---

## 4. Static Brand & Category Assets in Repository

The frontend contains optimized SVG vector logos and curated category photographs stored in `public/`:
- `public/brands/`: Vector SVG logos for active export brands.
- `public/categories/`: High-resolution WebP images for category tiles (`tshirts.webp`, `hoodies.webp`, `denim.webp`).
- Category images resolve dynamically via `src/lib/category-images.ts` and `src/lib/brand-logos.ts`, falling back gracefully to clean initials if an asset is not yet uploaded.
