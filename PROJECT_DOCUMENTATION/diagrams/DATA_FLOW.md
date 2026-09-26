# Data Flow Diagrams

This document maps data flows from client input through validation, transformation, domain services, database mutation, and side effects.

---

## 1. Wholesale Checkout & Order Booking Data Flow

```mermaid
flowchart TD
    ClientInput["Client Checkout Payload\n{address_id, payment_method, notes}"] --> FormReq["OrderRequest Validation\n(Ensures address exists, valid payment method)"]
    FormReq --> CalcService["OrderCalculationService\n- Matches line item quantity to tier\n- Calculates volume discounts\n- Computes shipping weight & tax"]
    
    CalcService --> StockCheck{"Stock Check with lockForUpdate()"}
    StockCheck -->|Insufficient Stock| ThrowStockErr["Throw 422: Stock exhausted"]
    StockCheck -->|Stock Available| BeginTx["DB::transaction() Begin"]
    
    BeginTx --> InsertOrder["INSERT INTO orders\n(order_number: 'ORD-2026-XXXX', status: 'pending_payment')"]
    InsertOrder --> InsertItems["INSERT INTO order_items\n(Captures buying_price_at_sale from product cost)"]
    InsertItems --> LockInventory["UPDATE inventories\navailable_quantity -= Q\nreserved_quantity += Q"]
    LockInventory --> InsertEvent["INSERT INTO order_status_events\n(event: 'order_created', user_id)"]
    InsertEvent --> CommitTx["DB::transaction() Commit"]
    
    CommitTx --> InvalidateCache["Redis Cache Invalidation\n(Flush tags: 'inventory', 'products')"]
    InvalidateCache --> TransformResource["Transform to OrderResource\n(Injects Pubali Bank SWIFT wire details)"]
    TransformResource --> ClientResponse["HTTP 201 Created Response to Client"]
```

---

## 2. RFQ to Proforma Invoice Document Generation Data Flow

```mermaid
flowchart TD
    InquiryInput["Buyer RFQ Submission\n{target_qty, target_price, techpack_file}"] --> InsertQuote["INSERT INTO quotes (status: 'submitted')"]
    InsertQuote --> NegotiationThread["Admin & Buyer exchange messages via rfq_messages"]
    
    NegotiationThread --> AdminAgreement["Admin creates Commercial Quotation\n{quote_items, valid_until, terms: 'FOB Chittagong'}"]
    AdminAgreement --> InsertQuotation["INSERT INTO quotations & quotation_items"]
    
    InsertQuotation --> DocGenerator["CommercialInvoiceService / DocumentHelper\n- Pulls exporter config (backend/config/business.php)\n- Pulls buyer billing address\n- Calculates CBM & gross weight"]
    
    DocGenerator --> PDFCompile["Compile Proforma Invoice PDF\n(Injects Pubali Bank SWIFT PUBABDDH210)"]
    PDFCompile --> SaveStorage["Save to storage/app/public/documents/PI-XXXX.pdf"]
    SaveStorage --> NotifyBuyer["Buyer notified on /dashboard/quotes/[id]"]
    
    NotifyBuyer --> BuyerAccept["Buyer clicks 'Accept Quotation'"]
    BuyerAccept --> ConvertOrder["POST /quotations/{id}/respond (accept)\n-> Automatically creates active record in orders table"]
```
