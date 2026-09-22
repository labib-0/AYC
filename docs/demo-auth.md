# Phase 28: Demo Role-Based Authentication & Commercial Order Deep Linking

> [!WARNING]
> **DEMO ONLY — NOT PRODUCTION SECURITY**
>
> The credentials and mock authentication flows described below are strictly designed for **frontend-only evaluation, staging demonstrations, and client QA testing**. They execute entirely client-side using browser storage and local mock datasets. They do NOT represent production-grade authentication or server-side authorization.

---

## 1. Default Demo Credentials

These accounts are seeded into the local mock user store (`ayaan_mock_users_v2`) in frontend-first mode:

| Role | Email | Password | Intended Destination Context |
|---|---|---|---|
| **ADMIN** | `admin@ayaan-demo.local` | `Admin@12345` | Admin Order Detail (`/admin/orders/[id]` or `/admin`) |
| **CUSTOMER** | `customer@ayaan-demo.local` | `Customer@12345` | Customer Order Detail (`/dashboard/orders/[id]` or `/dashboard`) |

*Existing development credentials also remain active:*
- **Admin**: `admin@ayaanclothing.com` / `admin123`
- **Customer (Commercial / Corporate)**: `buyer@ayaanclothing.com` / `password`
- **Customer (Standard)**: `testuser@example.com` / `testpass`

---

## 2. Universal Commercial Order Deep Link

The application generates a universal, role-aware deep link appended to the WhatsApp confirmation message:

```text
https://<domain>/order-access/<orderReference>
```

Example:
```text
https://ayaan-clothing.vercel.app/order-access/AYN-20260922-697987
```

### URL Privacy Guarantees
- The URL carries **only** the public order reference identifier (e.g. `AYN-20260922-697987`).
- It does **not** include customer names, emails, phone numbers, complete shipping addresses, merchandise pricing, or authentication tokens.

---

## 3. Role-Based Routing & Authorization Flow

```text
               User opens WhatsApp Deep Link
               /order-access/[reference]
                           │
                           ▼
                 Order Exists in Records?
                ├── NO  ──► Render "Commercial Order Not Found"
                └── YES ──► Check Active Session
                                │
                                ├── Not Authenticated ──► Prompt Sign-In / Login
                                │                        (Preserves return URL)
                                │
                                └── Authenticated User
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
             Role is ADMIN                     Role is CUSTOMER
                    │                                       │
                    ▼                                       ▼
        Route to Admin Order Detail                 Does User Own Order?
        /admin/orders/[id]                     (user_id / email matches)
                                                            │
                                                ├── YES ──► Route to Customer Detail
                                                │           /dashboard/orders/[id]
                                                │
                                                └── NO  ──► Render "Order Not Available"
                                                            (No order data leaked)
```

---

## 4. Test Orders for Evaluation

1. **Demo Commercial Order (Phase 28 Baseline)**:
   - **Order Reference**: `AYN-20260922-697987`
   - **Owner**: `customer@ayaan-demo.local` (`id: 999`)
   - **Total**: `$64,543.10 USD`
   - **Consignee**: `Ayaan Commercial Demo Corp`
   - **Destination**: `New York, US`
   - **Expected behavior**:
     - `admin@ayaan-demo.local` can access and review via `/admin/orders/ord_demo_28`.
     - `customer@ayaan-demo.local` can access and review via `/profile/orders/ord_demo_28`.
     - Other customers are denied with "Order Not Available" and zero data leakage.

2. **Marcus Vance Export Order**:
   - **Order Reference**: `AYN-20260824-001045`
   - **Owner**: `buyer@ayaanclothing.com` (`id: 102`)
   - **Expected behavior**:
     - `admin@ayaan-demo.local` can access via Admin.
     - `customer@ayaan-demo.local` is denied (ownership mismatch).
