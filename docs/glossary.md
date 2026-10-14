# AYC — Glossary of Domain & Technical Terminology

This glossary defines domain-specific garment export terminology, business abbreviations, and engineering concepts used across Ayaan Clothing (AYC).

---

## 1. Ready-Made Garments (RMG) & Export Terminology

| Term | Category | Definition |
|---|---|---|
| **RMG** | Industry | Ready-Made Garments — mass-produced finished apparel across knitwear, woven fabrics, sweaters, and denim. |
| **MOQ** | Commercial | Minimum Order Quantity — the mandatory lowest unit count required to place an order for a wholesale product line. |
| **Package Assortment** | Sourcing | Pre-bundled size and color distribution packed into a master export carton (e.g., 2×S, 4×M, 4×L, 2×XL). |
| **Full Stock** | Commercial | Complete liquidation lot representing all unbroken factory cartons available for clearance in the warehouse. |
| **GSM** | Technical | Grams per Square Meter — metric weight measurement of fabric density (e.g., lightweight summer tee = 160 GSM; heavy polo = 220 GSM). |
| **Combed Cotton** | Sourcing | High-grade cotton fiber treated to remove short fibers and impurities, resulting in superior tensile strength and hand-feel. |
| **Reactive Dye** | Sourcing | Chemical dyeing process that forms covalent bonds with cellulose fibers, ensuring high wash-fastness for export standards. |
| **Incoterms** | Trade Law | International Commercial Terms published by the ICC governing allocation of freight costs and risks between buyer and seller. |
| **FOB** | Incoterm | Free On Board — exporter delivers goods loaded on board the vessel nominated by the buyer at the named port of shipment (e.g., Chattogram Port). |
| **DAP** | Incoterm | Delivered At Place — exporter delivers goods to the buyer's destination premises ready for unloading (standard for air express). |
| **DDP** | Incoterm | Delivered Duty Paid — exporter bears all risks and costs including international freight, insurance, and import customs duties. |
| **CBM** | Logistics | Cubic Meters ($m^3$) — volumetric space calculation ($L \times W \times H / 1{,}000{,}000$) used to determine freight cargo pricing. |
| **HS Code** | Customs | Harmonized System Code — 6-to-8 digit standardized numerical method of classifying traded products for international tariff assessment. |
| **AWB** | Logistics | Air Waybill — non-negotiable transport document issued by an air carrier (e.g., Aramex) confirming receipt of consignment. |
| **BGMEA** | Regulatory | Bangladesh Garment Manufacturers and Exporters Association — the apex national trade organization representing RMG factories. |
| **T/T Wire** | Banking | Telegraphic Transfer — electronic funds transfer between commercial banking institutions (e.g., direct wire to Pubali Bank Limited). |
| **L/C** | Banking | Letter of Credit — financial document issued by a buyer's bank guaranteeing payment upon presentation of compliant trade documents. |

---

## 2. Commercial Document Terminology

| Document Type | Key Identifier | Official Business Purpose |
|---|---|---|
| **Offer Sheet** | `OFFER_SHEET` | Visual garment specification, FOB terms, packaging breakdown, and valid offer dates used during preliminary negotiations. |
| **Proforma Invoice (PI)** | `PROFORMA_INVOICE` | Provisional commercial contract containing beneficiary bank wire details (Pubali Bank Limited), import permit terms, and advance deposit instructions. |
| **Commercial Invoice (CI)** | `COMMERCIAL_INVOICE` | Authoritative customs clearance instrument containing HS codes, verified payment receipts, package schedules, and legal exporter declarations. |
| **Sales Invoice (Legacy)** | `SALES_INVOICE` | Historical standard sales receipt; retired from new generation and retained as read-only alias. |
| **Packing List (Legacy)**| `PACKING_LIST` | Historical shipping container schedule; now integrated directly into the Commercial Invoice. |

---

## 3. Technical & System Architecture Terminology

| Term | Domain | Definition |
|---|---|---|
| **AYC** | Platform | Ayaan Clothing brand and software project identifier. |
| **App Router** | Next.js | Modern React 19 / Next.js 16 directory-based routing architecture utilizing Server Components, streaming, and nested layouts. |
| **Proxy Handler** | Next.js 16 | The root request interception layer implemented in `src/proxy.ts` (the Next.js 16 successor to legacy `middleware.ts`). |
| **Sanctum** | Laravel | Featherweight authentication package providing stateless API token authentication stored in `personal_access_tokens`. |
| **RBAC** | Security | Role-Based Access Control — authorization mechanism mapping administrative users to roles and atomic permissions. |
| **Pessimistic Locking**| Database | Concurrency control strategy (`SELECT ... FOR UPDATE`) that locks database rows during transactions to prevent concurrent double-booking. |
| **COGS** | Accounting | Cost of Goods Sold — purchase cost per piece permanently snapshotted in `order_items.buying_price_at_sale`. |
| **PM2** | DevOps | Production process manager for Node.js applications providing daemon monitoring, clustering, and automatic resurrection. |
| **Supervisor** | DevOps | Linux client/server system monitoring and supervising the Laravel background queue worker daemon (`ayaan-worker`). |
| **GeoIP** | Security | IP geolocation inspection using MaxMind GeoLite2 databases to evaluate visitor country origins. |
| **DomPDF** | Backend | PHP HTML-to-PDF rendering engine converting vector HTML/CSS streams to standard PDF-1.4 documents. |
| **jsPDF** | Frontend | Client-side JavaScript library generating dynamic PDF previews directly in the web browser. |
