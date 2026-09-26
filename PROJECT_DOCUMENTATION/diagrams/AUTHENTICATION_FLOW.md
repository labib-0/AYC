# Authentication & Authorization Flow Diagrams

This document details the exact sequence of token generation, storage, header transmission, and role authorization.

---

## 1. Customer Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Wholesale Buyer
    participant Client as Next.js Storefront (:3000)
    participant AuthContext as AuthContext (React)
    participant Api as Laravel API (:8000)
    participant DB as PostgreSQL

    Buyer->>Client: Inputs email & password on /login
    Client->>Api: POST /api/v1/auth/login {email, password}
    Api->>Api: throttle:auth-login check (max 5/min)
    Api->>DB: Query user by email & verify Hash::check(password)
    DB-->>Api: User verified (id: 42, role: 'customer')
    Api->>DB: INSERT INTO personal_access_tokens (tokenable_id: 42)
    DB-->>Api: Token persisted
    Api-->>Client: HTTP 200 OK { token: "1|abcdef...", user: { id: 42, role: "customer" } }
    Client->>AuthContext: Store token in localStorage("customer_token")
    AuthContext->>Client: Set user state & trigger cart merge
    Client-->>Buyer: Redirect to /dashboard or checkout
```

---

## 2. Admin Authentication & Session Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as System Administrator
    participant Gateway as Admin Gateway (:3001)
    participant AdminAuth as AdminAuthContext
    participant Api as Laravel API (:8000)
    participant DB as PostgreSQL

    Admin->>Gateway: Opens http://localhost:3001/admin/login
    Admin->>Gateway: Inputs Admin Email & Password
    Gateway->>Api: POST /api/v1/auth/login {email, password}
    Api->>DB: Query user & verify Hash::check
    DB-->>Api: User verified (id: 1, role: 'admin')
    Api->>DB: INSERT INTO personal_access_tokens
    Api-->>Gateway: HTTP 200 OK { token: "2|xyz...", user: { role: "admin" } }
    Gateway->>AdminAuth: Store token in localStorage("admin_token")
    AdminAuth->>Gateway: Set isAdmin = true
    Gateway-->>Admin: Render AdminLayout & AdminDashboard (/admin)

    note over Gateway,Api: Subsequent Admin Request Verification

    Gateway->>Api: GET /api/v1/admin/homepage
    Note over Gateway,Api: Header: Authorization: Bearer 2|xyz...
    Api->>DB: Verify token & inspect role
    DB-->>Api: Valid token, role = 'admin'
    Api-->>Gateway: HTTP 200 OK (Allowed)
```

---

## 3. Customer Unauthorized Privilege Escalation Prevention

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Customer / Rogue Actor
    participant Api as Laravel API (:8000)
    participant Middleware as EnsureUserHasRole Middleware
    participant DB as PostgreSQL

    Attacker->>Api: GET /api/v1/admin/analytics/sales-profit
    Note over Attacker,Api: Injects valid Customer Token (Bearer 1|customer_token)
    Api->>DB: Verify token in personal_access_tokens
    DB-->>Api: Token valid (user_id: 42, role: 'customer')
    Api->>Middleware: EnsureUserHasRole('admin')
    Middleware->>Middleware: Evaluate user->role === 'admin'
    Note over Middleware: Evaluates to FALSE
    Middleware-->>Attacker: HTTP 403 Forbidden { success: false, message: "Unauthorized access. Insufficient role permissions." }
```
