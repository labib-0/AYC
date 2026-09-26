# Major User Flow Diagrams

This document illustrates the major interaction flows between Users, Frontend components, Backend controllers, and the PostgreSQL database.

---

## 1. Wholesale Checkout & Payment Proof Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Wholesale Buyer
    participant Frontend as Next.js Storefront (:3000)
    participant Api as Laravel API (:8000)
    participant DB as PostgreSQL
    actor Admin as Merchandising Admin (:3001)

    Buyer->>Frontend: Adds 100 units to Cart (Tier 3 wholesale rate applied)
    Buyer->>Frontend: Submits Checkout with "Bank Wire Transfer"
    Frontend->>Api: POST /api/v1/orders
    Api->>DB: INSERT order (status: 'pending_payment')
    Api->>DB: Lock & reserve inventory in inventories table
    Api-->>Frontend: HTTP 201 Created (ORD-2026-XXXX)
    Frontend-->>Buyer: Shows Pubali Bank wire details (SWIFT PUBABDDH210)

    note over Buyer,Frontend: Buyer executes wire at bank & receives deposit receipt

    Buyer->>Frontend: Uploads receipt image on /dashboard/orders/[id]
    Frontend->>Api: POST /api/v1/orders/[id]/payment-proof
    Api->>DB: INSERT payment record (status: 'pending_review')
    Api->>DB: UPDATE order status -> 'payment_verification_pending'
    Api-->>Frontend: HTTP 200 OK (Receipt uploaded)

    note over Admin,Api: Admin reviews order in /admin/orders

    Admin->>Api: GET /api/v1/admin/orders/[id]
    Api-->>Admin: Returns order details & receipt image URL
    Admin->>Admin: Inspects deposit slip & matches bank transaction
    Admin->>Api: POST /api/v1/admin/orders/[id]/payment-proof/review (approve)
    Api->>DB: UPDATE payment status -> 'completed'
    Api->>DB: UPDATE order status -> 'confirmed'
    Api->>DB: Commit physical stock decrement in inventories
    Api->>DB: INSERT order_status_events ('payment_verified')
    Api-->>Admin: HTTP 200 OK (Order confirmed)
    Admin-->>Buyer: Order confirmed; factory begins carton packing
```

---

## 2. RFQ Negotiation & Commercial Quotation Acceptance Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Garment Importer
    participant Frontend as Customer Portal (:3000)
    participant Api as Laravel REST API
    participant DB as PostgreSQL
    actor Admin as Export Merchandiser (:3001)

    Buyer->>Frontend: Fills RFQ form (10,000 Custom Polos, Target $6.50/pc)
    Frontend->>Api: POST /api/v1/rfq
    Api->>DB: INSERT quotes / rfqs (status: 'submitted')
    Api-->>Frontend: HTTP 201 Created (RFQ-2026-XXXX)

    Admin->>Api: GET /api/v1/admin/rfqs
    Admin->>Api: POST /api/v1/admin/rfqs/[id]/messages ("Fabric availability confirmed")
    Api->>DB: INSERT rfq_messages
    
    note over Admin,Api: Admin prepares binding Commercial Quotation

    Admin->>Api: POST /api/v1/admin/quotations (Items, terms: FOB Chittagong, validity: 30 days)
    Api->>DB: INSERT quotations & quotation_items
    Api->>DB: UPDATE rfq status -> 'quoted'
    Api-->>Admin: Quotation generated & PDF compiled

    Buyer->>Frontend: Opens /dashboard/quotes/[id] & reviews terms
    Buyer->>Frontend: Downloads official Proforma Invoice PDF
    Buyer->>Frontend: Clicks "Accept Quotation"
    Frontend->>Api: POST /api/v1/quotations/[id]/respond (accept)
    Api->>DB: UPDATE quotation status -> 'accepted'
    Api->>DB: INSERT wholesale order in orders table linked to quotation_id
    Api-->>Frontend: HTTP 200 OK (Order created)
    Frontend-->>Buyer: Redirected to confirmed order summary
```

---

## 3. Dynamic Merchandising Synchronization Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Merchandising Director
    participant AdminApp as Admin Panel (:3001)
    participant Api as Laravel REST API
    participant Cache as Redis Tagged Cache
    participant DB as PostgreSQL
    participant Storefront as Customer Storefront (:3000)

    Admin->>AdminApp: Opens /admin/homepage
    Admin->>AdminApp: Adds Brand "Nike" to Shop By Brand, sets sort order = 1
    Admin->>AdminApp: Selects "T-Shirts" for Hot Sale category rail
    AdminApp->>Api: POST /api/v1/admin/homepage/featured-brands
    Api->>DB: Sync homepage_featured_brands & set brands.is_featured_on_landing = true
    Api->>Cache: Invalidate keys tagged 'homepage', 'brands'
    Api-->>AdminApp: HTTP 200 OK
    AdminApp->>AdminApp: Broadcast 'ayaan:homepage-updated' event

    Storefront->>Storefront: Broadcast listener intercepts event
    Storefront->>Api: GET /api/v1/homepage
    Api->>DB: Query active landing brands ordered by landing_sort_order ASC
    DB-->>Api: [Nike]
    Api-->>Storefront: HTTP 200 OK (Updated homepage config)
    Storefront->>Storefront: Instantly renders Nike in Shop By Brand grid
```
