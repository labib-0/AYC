# AYC — Testing Strategy & Quality Assurance

## 1. Testing Frameworks & Philosophy

Ayaan Clothing employs a multi-tiered testing strategy ensuring that wholesale pricing invariants, multi-warehouse inventory balances, and commercial trade documents remain completely stable across releases.

### 1.1 Test Suite Breakdown
1. **Frontend Unit & Regression Tests (Node.js / Vitest / Custom Runners)**:
   - Located in `tests/`.
   - Executed via `npm test` (`node scripts/run-storefront-regression.mjs`).
   - Validates client-side pricing calculators, carton assortment formulas, address validation modals, and SEO metadata.
2. **Authoritative API Contract Tests**:
   - Located in `tests/live-api-contract-verification.test.ts` and `tests/fixtures/`.
   - Validates payload schemas against live and mock Laravel responses.
3. **Backend Unit & Feature Tests (PHPUnit 12)**:
   - Located in `backend/tests/Unit/` and `backend/tests/Feature/`.
   - Runs against an in-memory SQLite database (`:memory:`) without touching production PostgreSQL.
4. **End-to-End Browser QA Automation (Playwright / Puppeteer)**:
   - Located in `scripts/qa-*-browser.mjs`.
   - Simulates complete human cashier and buyer workflows in headless Chrome.

---

## 2. Test Execution Commands

```bash
# 1. Run Frontend Storefront Regression Suite (46 Unit Suites)
npm test

# 2. Run TypeScript Static Type Analysis
npx tsc --noEmit

# 3. Run ESLint Code Quality Rules
npm run lint

# 4. Compile Production Application Build
npm run build

# 5. Run Backend Unit Tests (PHPUnit)
cd backend && ./vendor/bin/phpunit tests/Unit

# 6. Run Backend Feature Tests (e.g. SEO, Catalog)
cd backend && ./vendor/bin/phpunit tests/Feature/Seo
cd backend && ./vendor/bin/phpunit tests/Feature/Catalog
```

---

## 3. Test Environments & Production Safety Rules

| Test Category | Target Database / Environment | Production VPS Safe? |
|---|---|:---:|
| **Unit & Calculation Tests** | Memory / No DB required | ✅ Yes |
| **Backend Feature Tests** | Local SQLite `:memory:` via `phpunit.xml` | ✅ Yes (Isolated) |
| **Static Analysis (TS / Lint)** | Node.js AST parser | ✅ Yes |
| **Live Backend Integration** | Requires local Laravel on `127.0.0.1:8000` | ⚠️ Local dev only |
| **Production Health Checks** | Safe read-only HTTP GET / HEAD against production domain | ✅ Yes |
| **Destructive Seeders / Migrations**| Prohibited on production | ❌ NEVER on Production |

---

## 4. Requirements Traceability Matrix (RTM)

This matrix maps functional and non-functional requirements to their authoritative source implementation files and verification suites.

| Requirement ID | Domain | Primary Implementation File(s) | Primary Verification Test File(s) | Status |
|---|---|---|---|:---:|
| **`FR-AUTH-001`** | Customer Registration | `backend/.../Api/V1/AuthController.php` | `backend/tests/Feature/Auth/RegistrationTest.php` | Verified |
| **`FR-AUTH-002`** | Role Separation | `backend/.../Middleware/EnsureUserHasRole.php` | `tests/test-admin-customer-separation.ts` | Verified |
| **`FR-AUTH-003`** | Google OAuth | `backend/.../Api/V1/GoogleAuthController.php` | `backend/tests/Feature/Auth/GoogleAuthTest.php` | Verified |
| **`FR-CAT-001`** | 3-Tier Volume Pricing | `backend/.../Order/OrderCalculationService.php` | `tests/standard-pricing-and-full-stock-basis.test.ts` | Verified |
| **`FR-CAT-002`** | Carton Assortment | `backend/.../Models/Product.php` | `tests/package-assortment-matrix.test.ts` | Verified |
| **`FR-CAT-003`** | 4:5 Media Pipeline | `backend/.../Media/ProductImagePipelineService.php` | `tests/product-gallery-4-5-size-and-overlays.test.ts` | Verified |
| **`FR-INV-001`** | Multi-Warehouse Stock | `backend/.../Models/Inventory.php` | `tests/compact-inventory-ui.test.ts` | Verified |
| **`FR-INV-002`** | Audited Stock Adjust | `backend/.../AdminInventoryAdjustment.php` | `tests/product-edit-inventory-adjustment.test.ts` | Verified |
| **`FR-ORD-001`** | Wholesale Order Flow | `backend/.../Api/V1/OrderController.php` | `tests/canonical-customer-order-lifecycle.test.ts` | Verified |
| **`FR-PAY-001`** | Bank Wire Verification | `backend/.../AdminOrderController.php` | `tests/order-flow-final-regression.test.ts` | Verified |
| **`FR-POS-001`** | Mandatory POS Customer | `src/app/ayc/pos/page.tsx` | `tests/verify-pos-customer-workflow.mjs` | Verified |
| **`FR-POS-002`** | Cash Tender & Change | `backend/.../Order/AdminPosSaleService.php` | `tests/qa-pos-customer-correction-browser.mjs` | Verified |
| **`FR-DOC-001`** | 3-Document Standard | `backend/.../Services/Documents/*` | `tests/stf-phase-j-commercial-document-normalization.test.ts` | Verified |
| **`FR-SEO-001`** | XML Sitemap & Proxy | `src/app/sitemap.ts`, `src/proxy.ts` | `tests/google-search-console-and-technical-seo.test.ts` | Verified |
| **`FR-GEO-001`** | Bangladesh Storefront Lock| `src/proxy.ts`, `StorefrontCountryAccessService` | `tests/geo-block-403-page.test.ts` | Verified |
| **`NFR-SEC-001`** | Sanctum Token Hashing | `backend/database/migrations/...tokens...` | `backend/tests/Feature/Auth/SanctumTokenTest.php` | Verified |
| **`NFR-SEC-002`** | Portal Route Isolation | `src/proxy.ts` | `tests/test-admin-customer-separation.ts` | Verified |
| **`NFR-SEC-003`** | SVG XSS Sanitization | `backend/.../Media/SvgSanitizer.php` | `backend/tests/Unit/SvgSanitizerTest.php` | Verified |
| **`NFR-PERF-001`**| Core Web Vitals | `src/app/page.tsx`, `globals.css` | `scripts/qa-cart-browser.mjs` | Verified |
| **`NFR-REL-001`** | Pessimistic Locking | `AdminOrderController.php` | `tests/order-flow-final-regression.test.ts` | Verified |
| **`NFR-REL-002`** | Immutable COGS | `order_items.buying_price_at_sale` | `tests/sales-profit-analytics.test.ts` | Verified |
| **`NFR-BKP-001`** | Automated Backups | `/usr/local/bin/ayaan-backup.sh` | Systemd timer inspection & `pg_restore -l` | Verified |

---

## 5. Known Gaps in Automated Test Coverage

1. **Third-Party Logistics Live Sandboxes**: Live Aramex API calls rely on recorded fixtures and contract mocks in local environments to prevent incurring real carrier API rate fees during release gates.
2. **Multi-Currency Dynamic FX Sync**: Current system operates natively in USD ($); multi-currency presentation utilizes fixed conversion tables rather than real-time forex streaming.
