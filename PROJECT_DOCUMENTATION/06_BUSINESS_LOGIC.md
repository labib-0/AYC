# 06 — Business Rules, Calculations & State Machines

## 1. Core Mathematical Calculations & Formulas

### 1.1 Volume Tier Pricing Formula
Wholesale pricing is dynamically resolved based on total quantity per line item or total order quantity:
$$\text{UnitPrice}(Q) = \begin{cases} 
P_{\text{base}} & \text{if } 1 \le Q < Q_2 \\
P_{\text{tier2}} & \text{if } Q_2 \le Q < Q_3 \\
P_{\text{tier3}} & \text{if } Q \ge Q_3
\end{cases}$$
Where:
- $P_{\text{base}}$ = Default wholesale base price configured on `products.wholesale_price`.
- $P_{\text{tier2}}$, $P_{\text{tier3}}$ = Unit prices retrieved from `product_pricing_tiers` ordered by `min_quantity ASC`.
- In absence of explicit `product_pricing_tiers` rows, automatic discount fallbacks are applied:
  - $P_{\text{tier2}} = P_{\text{base}} \times 0.92$ (8% wholesale volume discount)
  - $P_{\text{tier3}} = P_{\text{base}} \times 0.85$ (15% container load volume discount)

### 1.2 Package Assortment & Complete Carton Calculation (`getMaxCompletePackages`)
Implemented in `backend/app/Models/Product.php@getMaxCompletePackages`:
Wholesale buyers order garments in pre-assorted carton packs (e.g., Pack A: 2×S, 4×M, 4×L, 2×XL). The system prevents broken-ratio cartons by calculating the bottleneck across individual variant warehouse balances:

$$\text{AvailableCartons}_{\text{variant}} = \left\lfloor \frac{\text{Inventory}_{\text{variant}}}{\text{AllocationQuantity}_{\text{variant}}} \right\rfloor$$
$$\text{MaxCompletePackages} = \min_{i \in \text{Allocations}} \left( \text{AvailableCartons}_i \right)$$

*If no specific package allocations are defined, the maximum packages fallback to $\lfloor \text{TotalStock} / \max(1, \text{MOQ}) \rfloor$.*

### 1.3 Full-Stock Clearance Liquidation Formula
The **Full Stock** option is **ALWAYS VISIBLE** on the product page and is never conditionally hidden based on inventory.

#### Quantity Determination
The purchasable Full Stock quantity obeys the garment package assortment and available inventory rules:
$$Q_{\text{fullstock}} = \text{MaxCompletePackages} \times \text{MOQ}$$
Where:
- Available Inventory = $\text{OnHandStock} - \text{ReservedStock}$
- $Q_{\text{fullstock}}$ never exceeds the current available inventory of complete packages.

#### Conditional Price Selection
While the Full Stock option is always visible, its applied unit price is strictly conditional:
$$\text{UnitPrice}_{\text{fullstock}} = \begin{cases} 
P_{\text{fullstock}}, & \text{if } \text{AvailableInventory} > \text{MinimumBulkOrderQuantity} \\
P_{\text{moq}}, & \text{if } \text{AvailableInventory} \le \text{MinimumBulkOrderQuantity}
\end{cases}$$

Where:
- $P_{\text{moq}}$ is the normal MOQ / standard applicable wholesale price (the base wholesale tier price that applies to standard purchases).
- $P_{\text{fullstock}}$ is the configured liquidation price, strictly capped to not exceed the lowest applicable volume price: $\min(P_{\text{fullstock\_configured}}, P_{\text{tier3}})$.
- **Dynamic Live Evaluation**: Both frontend and backend (`Product.php`, `OrderCalculationService.php`, `CartController.php`) re-evaluate pricing based on live Available Inventory ($\text{OnHand} - \text{Reserved}$). Client-provided prices are never trusted.

### 1.4 Volumetric CBM & Carton Specifications
In garment export shipping, freight costs depend on both physical gross weight and volumetric weight (CBM):
$$\text{CBM}_{\text{carton}} = \frac{L_{\text{cm}} \times W_{\text{cm}} \times H_{\text{cm}}}{1{,}000{,}000}$$
$$\text{TotalCartons} = \left\lceil \frac{Q_{\text{order}}}{\text{PiecesPerCarton}} \right\rceil$$
$$\text{TotalCBM} = \text{TotalCartons} \times \text{CBM}_{\text{carton}}$$
$$\text{TotalGrossWeight} = \text{TotalCartons} \times W_{\text{gross\_per\_carton}}$$

### 1.5 Sales, Profit & COGS Formulation
Enforced in `SalesProfitAnalyticsService.php`:
$$\text{COGS}_{\text{order}} = \sum_{i=1}^{n} (Q_i \times \text{buying\_price\_at\_sale}_i)$$
$$\text{GrossProfit}_{\text{order}} = \text{Subtotal}_{\text{order}} - \text{COGS}_{\text{order}}$$
$$\text{GrossMarginPercentage} = \frac{\text{GrossProfit}}{\text{Subtotal}} \times 100$$
> **Crucial Audit Rule**: `buying_price_at_sale` is permanently snapshotted into `order_items` during the checkout transaction. If an administrator later changes a product's cost price in the inventory management view, historical order profitability remains completely immutable.

### 1.6 Product Initial Stock, Warehouse Allocation & Complete MOQ Availability
Implemented in `ProductController@store`, `Product.php`, and `ProductInventorySection.tsx`:
When an administrator creates a product in the administrative portal:
$$\text{AvailableStock} = \text{OnHandStock} - \text{ReservedStock}$$
$$\text{AvailableCompleteMOQs} = \left\lfloor \frac{\text{AvailableStock}}{\text{MOQ}} \right\rfloor$$

#### Invariants & Single Source of Truth
1. **No Duplicate Stock Architecture**: The system does NOT use arbitrary unlinked stock columns on the `products` table. The real warehouse `inventories` table (keyed by `[product_variant_id, warehouse_id]`) is the sole authoritative source of truth.
2. **Mandatory Positive MOQ**: Product MOQ must be strictly greater than 0 ($\text{MOQ} \ge 1$). Inputs of 0 or negative values are strictly rejected with 422 Unprocessable Content.
3. **Audited Initialization**: Every initial stock allocation writes directly to `inventories` for the chosen active warehouse and immediately records an `admin_inventory_adjustments` audit log entry with `reason: 'Initial stock on product creation'` and the creating administrator's `admin_user_id`.
4. **Automatic Default Variant Generation**: For simple products without explicit variant matrices (colors $\times$ sizes), a standard default variant is automatically generated and linked to the warehouse inventory record.
5. **Dynamic Availability Preview**: As the administrator inputs stock or changes MOQ, complete MOQs available are calculated live:
   - Example 1: Stock = 250 pcs, MOQ = 50 pcs $\to$ 5 complete MOQs available.
   - Example 2: Stock = 220 pcs, MOQ = 50 pcs $\to$ 4 complete MOQs available (+ 20 pcs partial unbundled stock).
   - Example 3: Stock = 0 pcs $\to$ 0 complete MOQs available (Product displays as Out of Stock).
6. **Edit Safeguard**: In product edit mode, physical warehouse stock quantities are read-only and protected by the audit integrity safeguard. Stock modifications must be executed via the audited `/admin/inventory` workflow. Updating MOQ recalculates complete orderable MOQs dynamically.

### 1.7 Product Deletion & Slug/SKU Recycling
When a product is deleted from the wholesale catalog:
1. **Slug & SKU Release**: To ensure administrators can recreate or reuse URLs and identifiers (e.g., recreating `test-resilience-shirt`), the deleted record's `slug` and `sku` are automatically suffixed (e.g., `{$slug}-deleted-{$id}-{$timestamp}`).
2. **Model Lifecycle Hook**: Handled at the Eloquent lifecycle layer (`Product::booted() static::deleting`) and in `ProductController@destroy`, ensuring that both soft deletes and direct model deletions release the identifier.
3. **Uniqueness Scope**: Validation rules check `Rule::unique('products', 'slug')->whereNull('deleted_at')` and `Rule::unique('products', 'sku')->whereNull('deleted_at')`. Deleted items never prevent new or existing products from claiming the slug.
4. **Order Item Snapshot Integrity**: Because historical quotes and orders preserve historical slugs, SKUs, and names via immutable snapshot columns (`order_items.product_slug`, `order_items.sku`), deleting a product does not alter or corrupt historical export documentation.

---

## 2. Order Lifecycle State Machine

The order lifecycle tracks wholesale export commitments through banking verification and international freight dispatch.

```mermaid
stateDiagram-v2
    [*] --> pending: Buyer places order (Selects Wire / LC)
    
    pending --> confirmed: Admin verifies bank wire slip
    pending --> cancelled: Cancelled by buyer or admin
    
    confirmed --> processing: Sent to factory warehouse for packing & cartonization
    processing --> shipped: Dispatched to port (Aramex AWB / Chattogram Sea Port)
    
    shipped --> delivered: Cleared destination customs & delivered to buyer
    
    confirmed --> refunded: Order cancelled post-verification
    processing --> refunded: Production cancellation
    
    delivered --> [*]
    cancelled --> [*]
    refunded --> [*]
```

### Transition Invariants
1. **`pending` → `confirmed`**: Requires an authenticated administrator user ID. Automatically logs an activity event in `order_status_events` and decrements `inventories.reserved_quantity` while committing the physical stock reduction.
2. **`confirmed` → `processing`**: Order items locked; package allocations finalized.
3. **`processing` → `shipped`**: Requires tracking number or carrier code (e.g., Aramex tracking ID).

---

## 3. B2B RFQ & Commercial Quotation State Machine

For high-volume, custom OEM manufacturing orders, transactions follow the RFQ negotiation cycle with exact uppercase database enums:

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Buyer submits inquiry (target qty, tech pack)
    SUBMITTED --> UNDER_REVIEW: Merchandiser reviews fabric & capacity
    
    UNDER_REVIEW --> NEED_INFORMATION: Admin requests tech pack clarifications
    NEED_INFORMATION --> UNDER_REVIEW: Buyer replies in message thread
    
    UNDER_REVIEW --> QUOTATION_PREPARED: Admin drafts Proforma Quotation
    QUOTATION_PREPARED --> SENT_TO_BUYER: Formal quote sent to customer
    
    SENT_TO_BUYER --> NEGOTIATION: Buyer submits counter-offer in thread
    NEGOTIATION --> SENT_TO_BUYER: Admin submits revised proforma quote
    
    SENT_TO_BUYER --> ACCEPTED: Buyer accepts commercial terms & pricing
    SENT_TO_BUYER --> REJECTED: Buyer declines quotation
    SENT_TO_BUYER --> EXPIRED: Validity date lapses (valid_until timestamp)
    
    ACCEPTED --> CONVERTED_TO_ORDER: Converted into active wholesale order
    
    REJECTED --> [*]
    EXPIRED --> [*]
    CONVERTED_TO_ORDER --> [*]
```

### Exact Status Enums in PostgreSQL:
- **`quotes.status`**: `SUBMITTED`, `UNDER_REVIEW`, `NEED_INFORMATION`, `QUOTATION_PREPARED`, `SENT_TO_BUYER`, `NEGOTIATION`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED_TO_ORDER`, `CANCELLED`
- **`quotations.status`**: `DRAFT`, `READY`, `SENT`, `VIEWED`, `NEGOTIATION`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED_TO_ORDER`, `CANCELLED`
