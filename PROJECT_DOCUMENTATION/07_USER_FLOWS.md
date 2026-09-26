# 07 — User Workflows & Step-by-Step Execution Paths

This document details the exact sequence of events, network interactions, database modifications, and UI state updates across all primary operational workflows.

---

## 1. Customer Registration & Onboarding

```
User Action → Frontend → API → Backend → Database → Response → UI Update
```

1. **User Action**: Wholesale buyer visits `/signup` and inputs Full Name, Company Name, Official Work Email, Phone/WhatsApp, and Password.
2. **Frontend Validation**: `src/app/signup/page.tsx` validates email formatting, password strength (min 8 chars), and required company name.
3. **API Call**: `POST /api/v1/auth/register` with `{ full_name, email, password, company_name, phone }`.
4. **Backend Processing**: `AuthController::register`:
   - Validates unique email against `users` table.
   - Hashes password using Bcrypt with 12 work rounds.
   - Forces `role = 'customer'` (bypassing any arbitrary client role injection).
5. **Database Mutation**:
   - `INSERT INTO users (name, email, password, role, company_name, phone)`.
   - `INSERT INTO personal_access_tokens (tokenable_id, tokenable_type, token, name: 'auth_token')`.
6. **API Response**: Returns `HTTP 201 Created` with Sanctum bearer token string and user resource.
7. **UI Update**: `AuthContext` stores token in `localStorage`, sets `user` state, closes any auth modal, and redirects buyer to `/dashboard` or previous checkout target.

---

## 2. Customer Login & Session Rehydration

1. **User Action**: Buyer enters credentials on `/login`.
2. **API Call**: `POST /api/v1/auth/login` with `{ email, password }`.
3. **Backend Processing**: `AuthController::login`:
   - Checks Redis rate limit (`throttle:auth-login` — max 5 attempts/minute).
   - Validates user exists and `Hash::check(password, user->password)`.
   - Revokes any expired personal access tokens.
   - Creates fresh Sanctum token.
4. **Database Mutation**: `INSERT INTO personal_access_tokens`.
5. **API Response**: `HTTP 200 OK` with bearer token and serialized user object.
6. **Cart Reconciliation**: `CartContext` calls `POST /api/v1/cart/merge`, transferring any anonymous guest cart items into the customer's database cart (`carts`, `cart_items`).

---

## 3. Product Discovery, Faceted Filtering & Search

1. **User Action**: Buyer types "Cotton Hoodies" in the top search bar or selects "Men" + "Original" + "Sweaters" on `/search`.
2. **Frontend State**: `src/app/search/page.tsx` parses URL search parameters (`?search=Cotton+Hoodies&audience=MEN&category=c_sweaters`).
3. **API Call**: `GET /api/v1/products?search=Cotton+Hoodies&audience=MEN&category=c_sweaters`.
4. **Backend Processing**: `ProductController::index`:
   - Applies Eloquent query builder scopes:
     `$query->where('status', 'published')->whereFullText(...)->where('audience', 'MEN')`.
   - Checks Redis tag `catalog`. If cached, returns instantly; otherwise queries PostgreSQL.
5. **Database Read**: `SELECT * FROM products WHERE ... ORDER BY created_at DESC LIMIT 24`.
6. **API Response**: `HTTP 200 OK` with paginated product array and filter metadata.
7. **UI Update**: `ProductCard` components render 4:5 aspect ratio garment images, base wholesale prices, and volume tier badges.

---

## 4. Volume Tier Selection & Cart Accumulation

1. **User Action**: On `/products/[slug]`, buyer selects Size "L", Color "Navy", and enters quantity "60".
2. **Frontend Computation**:
   - `ProductDetailView` evaluates tier rules: 60 units falls in **Tier 2 (30–99 pcs)**.
   - Unit price updates from $18.50 (base) to $16.20 (Tier 2).
   - Line subtotal calculates to $972.00 ($16.20 × 60).
3. **User Action**: Clicks "Add to Order".
4. **Frontend State**: `CartContext.addItem()` adds item to state, saves to `localStorage`, and triggers slide-over `MiniCart`.
5. **Background API Sync**: `POST /api/v1/cart/items` synchronizes quantity and selected packaging assortment with database cart.

---

## 5. Wholesale Checkout & Bank Wire Booking

1. **User Action**: Buyer clicks "Proceed to Wholesale Booking" from cart.
2. **Validation Step**: `POST /api/v1/checkout/validate` checks stock availability against `inventories` table and recalculates tier pricing.
3. **User Input**: Buyer selects delivery address and chooses payment method: **"Bank Wire Transfer (TT)"**.
4. **API Call**: `POST /api/v1/orders` with items, address ID, and notes.
5. **Backend Processing**: `OrderController::store`:
   - Runs inside a database transaction (`DB::transaction`).
   - Locks inventory rows (`SELECT ... FOR UPDATE`).
   - Inserts `orders` record with status `pending_payment` and unique order number `ORD-2026-XXXX`.
   - Captures `buying_price_at_sale` in `order_items` from `products.cost_price`.
   - Decrements `inventories.available_quantity` and increments `reserved_quantity`.
6. **API Response**: `HTTP 201 Created` with full order payload and bank transfer instructions:
   - Bank Name: *Pubali Bank Limited*
   - SWIFT: *PUBABDDH210*
   - Account: *1788-901-044316*
7. **UI Update**: Redirects buyer to order confirmation page displaying remittance instructions and deposit slip upload widget.

---

## 6. Payment Proof Submission & Admin Verification

1. **Buyer Action**: Buyer visits `/dashboard/orders/[id]`, attaches scanned wire remittance slip (PDF or JPG), and clicks "Submit Payment Receipt".
2. **API Call**: `POST /api/v1/orders/[id]/payment-proof` (multipart form-data).
3. **Backend Processing**:
   - Saves file to `storage/app/public/payment_receipts/`.
   - Creates record in `payments` table with status `pending_review`.
   - Updates order status to `payment_verification_pending`.
   - Logs `order_status_events` entry.
4. **Admin Notification**: Order appears in `/admin/orders` with amber "Verification Pending" badge.
5. **Admin Action**: Merchandiser clicks order, inspects high-resolution receipt in lightbox, confirms funds arrived in Pubali Bank, and clicks **"Verify Payment"**.
6. **Admin API Call**: `POST /api/v1/admin/orders/[id]/payment-proof/review` with `{ action: 'approve' }`.
7. **Backend Processing**:
   - Updates payment status to `completed`.
   - Shifts order status from `payment_verification_pending` to `confirmed`.
   - Commits inventory reduction permanently.
8. **UI Update**: Order updates to green "Confirmed", and warehouse packing team is notified to begin export cartonization.

---

## 7. B2B RFQ Negotiation & Commercial Quotation

1. **Buyer Action**: Buyer submits custom inquiry on `/rfq` for 10,000 custom polo shirts.
2. **API Call**: `POST /api/v1/rfq` with target specs and attachments.
3. **Database Insertion**: Record created in `quotes` / `rfqs` with status `submitted`.
4. **Admin Review**: Merchandiser opens `/admin/rfq/[id]`, reviews requirements, and replies via integrated thread (`POST /api/v1/admin/rfqs/[id]/messages`).
5. **Formal Quote Creation**: Admin navigates to `/admin/quotations`, clicks "Create Commercial Quote", adds line items, specifies FOB Chittagong Port terms, sets payment to "LC at Sight", and sets validity for 30 days.
6. **Document Generation**: System creates formal record in `quotations` table and compiles official Proforma Invoice PDF.
7. **Buyer Acceptance**: Buyer reviews quote on `/dashboard/quotes/[id]`, downloads Proforma PDF, and clicks **"Accept Quotation"**.
8. **Order Conversion**: `POST /api/v1/quotations/[id]/respond` with `{ action: 'accept' }` automatically creates a confirmed wholesale order.
