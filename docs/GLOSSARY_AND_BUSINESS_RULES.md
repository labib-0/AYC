# Glossary & Business Rules — AYAAN CLOTHING (AYC)

## 1. Domain Glossary

| Term | Domain | Authoritative Definition & Context in AYC |
| :--- | :--- | :--- |
| **RMG** | Manufacturing | **Ready-Made Garments**: Mass-produced finished apparel manufactured in Bangladesh factories for global export. |
| **Stock Lot / Overrun** | Inventory | Surplus garments produced by export garment factories exceeding brand purchase orders, made available for bulk international wholesale. |
| **OEM** | Manufacturing | **Original Equipment Manufacturer**: Custom manufacturing of apparel styles according to foreign buyer specifications, branding, and sizing charts. |
| **Tech Pack** | Sourcing | Technical specification sheet detailing garment dimensions, stitch patterns, fabric composition, trims, and artwork placements. |
| **GSM** | Textile Metric | **Grams per Square Meter**: Standard unit of fabric weight. In AYC, GSM is rendered **only** when authentic lab or mill test data exists. |
| **MOQ** | Commercial | **Minimum Order Quantity**: The lowest unit count a buyer can purchase for a given product (typically matching 1–2 master cartons). |
| **Quantity Step** | Logistics | The carton multiplier (e.g. 30 pcs/carton). Buyer orders must be integer multiples of the package step. |
| **Size Curve / Assortment**| Logistics | The ratio of garment sizes packed within a single carton (e.g., S:6, M:12, L:8, XL:4 = 30 pcs). |
| **Offer Sheet** | Documentation | Preliminary wholesale price quotation detailing package breakdowns, terms of sale, and validity dates. |
| **Proforma Invoice (PI)** | Documentation | Pre-shipment legal invoice required by foreign exchange banks to authorize international wire transfers or open Letters of Credit. |
| **Commercial Invoice (CI)** | Documentation | Authoritative shipping invoice required by customs authorities at export and destination ports for clearing cargo and computing duties. |
| **T/T** | Banking | **Telegraphic Transfer**: International electronic bank wire transfer (e.g., SWIFT) sent directly between corporate commercial bank accounts. |
| **L/C** | Banking | **Letter of Credit**: Financial instrument issued by a buyer's bank guaranteeing payment upon presentation of compliant export trade documents. |
| **AWB** | Freight | **Air Waybill**: Tracking bill of lading issued by international air carriers (e.g. Aramex Express, DHL) for air shipments. |
| **FOB** | Incoterms | **Free On Board**: Trade term where the seller pays for transportation to the port of origin (DAC airport or CGP port); the buyer pays freight and insurance onward. |

---

## 2. Authoritative System Invariants

Every technical implementation across the frontend, backend API, database, and background workers must adhere to these non-negotiable rules:

### Invariant 1: Product Identifier Integrity
* **Product Name (`products.name`)**: Non-unique. Multiple products may share the same human title across different production batches or colorways.
* **Master SKU (`products.sku`)**: Strictly globally unique. Identifies exact physical warehouse items.
* **Visible Product ID (`products.product_id`)**: Strictly globally unique. Commercial identifier displayed on export documents (e.g. `PRD-0042`).
* **URL Slug (`products.slug`)**: Strictly globally unique. URL routing segment for SEO. Soft-deleted products release their slugs by appending a timestamp suffix.

### Invariant 2: Single Physical Stock Model
* **No Reserved Quantity**: Inventory tracking relies entirely on real, uncommitted stock (`inventories.quantity` and `products.stock`).
* **Immediate Deduction**: Stock is deducted at the exact millisecond of checkout inside a database transaction (`FOR UPDATE`).
* **Automatic Cancellation Reversal**: Order cancellation restores stock immediately, logging an audit record in `admin_inventory_adjustments`.

### Invariant 3: Factual Commercial Documents (Zero Fabrication)
* Commercial document generators (Offer Sheet, PI, CI) display **only** authentic product attributes present in the database.
* Missing attributes (e.g. absent GSM or weave) are omitted cleanly rather than printing placeholder text or fabricated numbers.

### Invariant 4: Supplier Privacy & Cost Confidentiality
* Supplier identities (`supplier_id`, `supplier_name`) and internal purchase costs (`buying_price`, `buying_price_at_sale`) are strictly confidential.
* The Laravel API strips these fields from all public and customer-facing API resources. Only authorized administrators with `catalog.manage` or `reports.view` permissions can view cost metrics.

### Invariant 5: Payment Receipt State Locking
* Buyers may upload or replace wire transfer receipts only while an order is in `pending` or `payment_rejected` status.
* Once an administrator verifies the deposit and marks the order `paid`, receipt replacement returns `HTTP 403 Forbidden` to maintain financial audit integrity.
* Uploaded receipts are restricted to 10 MB, validated for real image MIME types, transcoded to high-efficiency WebP, and stripped of all EXIF metadata.

### Invariant 6: Bangladesh Storefront Geo-Restriction
* Storefront catalog routes (`/` and `/products/*`) are restricted for visitors from Bangladesh IP addresses via an internal Laravel GeoIP check to protect international wholesale export pricing from competing with domestic retail markets.
* All operational endpoints (`/login`, `/signup`, `/dashboard`, `/order-access`, `/rfq`) and the entire Admin Portal (`/ayc`) remain globally accessible regardless of geographical location.

### Invariant 7: Atomic Zero-Downtime Releases
* Production deployments build into an isolated timestamped directory in `.next_releases/`, copy previous release chunks to protect active clients, and swap the `.next` symlink atomically via `mv -Tf`.
* Direct builds into `.next/` while live traffic is active are strictly forbidden.
