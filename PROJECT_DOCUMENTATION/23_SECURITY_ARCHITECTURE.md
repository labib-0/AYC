# 23 — Security Architecture & Hardening Controls

This document details the security mitigations, access controls, data protection mechanisms, and threat defenses implemented across the full stack.

---

## 1. Authentication & Session Security

1. **Cryptographic Token Storage**:
   - Authentication tokens issued by Laravel Sanctum are stored in PostgreSQL (`personal_access_tokens`) as one-way SHA-256 hashes (`hash('sha256', $plainTextToken)`).
   - Even in the event of an unauthorized database dump, tokens cannot be reversed into valid bearer credentials.
2. **Password Cryptography**:
   - Passwords are encrypted using PHP native Bcrypt with work factor 12 (`BCRYPT_ROUNDS=12`).
   - Plaintext passwords are never logged or stored.
3. **Session Separation**:
   - Customer and Administrator sessions are maintained in completely isolated LocalStorage keys (`customer_token` vs `admin_token`).
   - Admin login features no client-side demo prefill bypasses.

---

## 2. Authorization & Privilege Escalation Defenses

1. **Role Enforcement (`EnsureUserHasRole.php`)**:
   - Every administrative API endpoint under `/api/v1/admin/*` is guarded by `role:admin`.
   - The middleware inspects the authenticated user model directly from the database, preventing token tampering or client-side claims forgery.
2. **Ownership Scoping**:
   - In customer controllers (`OrderController@show`, `QuotationController@show`, `AddressController@update`), records are strictly scoped by the authenticated user's ID:
     `$order = Order::where('user_id', $request->user()->id)->findOrFail($id);`
   - Prevents Insecure Direct Object References (IDOR).
3. **Host-Level Isolation (`src/proxy.ts`)**:
   - If a customer browses to `/admin`, Next.js middleware immediately issues a 307 redirect away from the customer domain to the dedicated admin gateway.

---

## 3. Network & Transport Security

### 3.1 HTTP Security Headers Middleware (`SecurityHeadersMiddleware.php`)
Every HTTP response originating from the Laravel backend includes hardened headers:
- `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking attacks.
- `X-Content-Type-Options: nosniff`: Prevents MIME-confusion attacks.
- `X-XSS-Protection: 1; mode=block`: Activates browser XSS filtering.
- `Referrer-Policy: strict-origin-when-cross-origin`: Prevents URL path leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`: Disables unneeded browser APIs.

### 3.2 CORS Strictness (`backend/config/cors.php`)
- Rejects wildcard `*` origins on credentialed traffic.
- Whitelists explicit origins: `http://localhost:3000`, `http://localhost:3001` (and production equivalents).

---

## 4. Input Sanitization & Injection Prevention

1. **SQL Injection**:
   - 100% of database interactions utilize Laravel Eloquent ORM or parameterized PDO queries (`$query->where(...)`).
   - Zero raw SQL concatenations (`DB::raw("... WHERE id = " . $id)`) exist in active application routes.
2. **Cross-Site Scripting (XSS)**:
   - React 19 automatically escapes all strings rendered inside JSX templates (`{product.name}`).
   - User inputs containing HTML tags are stripped during Form Request validation.
3. **Mass Assignment Protection**:
   - All Eloquent models define explicit `$fillable` arrays.
   - Critical system fields (`id`, `role`, `status`, `buying_price_at_sale`) are strictly omitted from mass assignment.

---

## 5. File Upload Hardening (`UploadController.php`)

All file uploads (product images, payment slips, RFQ tech packs) are subjected to validation:
1. **MIME-Type & Extension Whitelist**:
   - Images: `image/jpeg`, `image/png`, `image/webp`.
   - Documents: `application/pdf`.
   - Executable scripts (`.php`, `.sh`, `.exe`, `.js`) are strictly rejected.
2. **File Size Capping**: Maximum 10MB per file.
3. **Storage Isolation**: Files are stored in non-executable storage directories with randomized UUID filenames (`Str::uuid() . '.' . $extension`), preventing path traversal attacks.
