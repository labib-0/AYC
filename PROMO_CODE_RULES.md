# AYAAN CLOTHING — Promo Code & Discount Rules

## Overview

AYAAN CLOTHING supports **EXACTLY TWO** promotional discount types across the admin management panel and customer checkout system:

1. **Percentage Discount (`percentage`)**
2. **Flat Discount (`flat`)**

**Crucial Business Rule:** Every promo code **MUST** specify a strictly positive Minimum Order Amount (`min_spend` > 0). Promo codes cannot be created or redeemed without satisfying their minimum order requirement.

---

## 1. Discount Types & Calculations

### Type 1: Percentage Discount (`percentage`)
A percentage discount deducts a relative percentage (`1%` to `100%`) from the eligible merchandise subtotal.

- **Formula:**
  $$\text{discountAmount} = \min\left(\text{eligibleSubtotal}, \text{round}\left(\text{eligibleSubtotal} \times \frac{\text{discountValue}}{100}\right)\right)$$
- **Example:**
  - Promo Code: `AYAAN10`
  - Discount Type: `Percentage`
  - Discount Value: `10%`
  - Minimum Order Amount: `$500.00`
  - Customer Order Subtotal: `$1,000.00`
  - Discount: `$1,000.00 \times 10\% = \$100.00`
  - Payable Merchandise Total: `\$900.00`

### Type 2: Flat Discount (`flat`)
A flat discount deducts a fixed dollar amount ($ USD) from the eligible merchandise subtotal.

- **Formula:**
  $$\text{discountAmount} = \min(\text{discountValue}, \text{eligibleSubtotal})$$
- **Cap Rule:** If the flat discount value exceeds the merchandise subtotal, the discount is capped at the merchandise subtotal so the payable merchandise total never drops below `$0.00`.
- **Example:**
  - Promo Code: `SAVE50`
  - Discount Type: `Flat`
  - Discount Value: `$50.00`
  - Minimum Order Amount: `$500.00`
  - Customer Order Subtotal: `$800.00`
  - Discount: `$50.00`
  - Payable Merchandise Total: `$750.00`

---

## 2. Minimum Order Requirement

The promo code is valid if and only if:
$$\text{eligibleSubtotal} \ge \text{minimumOrderAmount}$$

- **Merchandise Only:** Shipping charges (e.g. Aramex priority air freight) do not count toward satisfying the minimum order threshold.
- **Strict Validation:** If the merchandise subtotal is even `$0.01` below the minimum spend requirement, the promo code is rejected.

| Minimum Order Amount | Cart Subtotal | Result | User Notice |
| :--- | :--- | :--- | :--- |
| **$500.00** | `$499.99` | ❌ Invalid | `Minimum order of $500 is required for this promo code.` |
| **$500.00** | `$500.00` | ✅ Valid | Applied (`-$50.00` / `-$50.00` discount) |
| **$500.00** | `$800.00` | ✅ Valid | Applied |

---

## 3. Validation Rules

### Promo Code Field:
- Required.
- Trimmed and normalized to uppercase.
- No whitespace allowed.
- Maximum length: 30 characters.
- Must be unique among active promo codes.

### Discount Type:
- Required.
- Allowed values: `"percentage"` | `"flat"`.
- Third discount types are strictly disallowed.

### Discount Value:
- Required.
- Must be greater than `0`.
- For **Percentage**: Must be $\le 100$ (e.g., `5%`, `10%`, `100%`). Values $\le 0$ or $> 100$ are rejected.
- For **Flat**: Must be $> 0$ in USD (e.g., `$25`, `$50`, `$100`). Values $\le 0$ are rejected.

### Minimum Order Amount:
- Required for **BOTH** Percentage and Flat discount types.
- Must be strictly greater than `$0.00`.
- Values $\le 0$ or empty are rejected with: `"Minimum order amount is required and must be greater than $0."`

---

## 4. Checkout Integration & Display

### Applying a Code
When a customer enters a promo code at checkout:
1. The code is looked up in the canonical store records (`mockStore.getCoupons()`).
2. Status is verified (must be `is_active: true`, within start/expiration window, and under usage limits).
3. Eligibility is verified (`subtotal >= coupon.min_spend`).
4. Discount is calculated and applied to the merchandise subtotal.

### Order Summary Display

#### Percentage Promo Applied:
```
PROMO CODE
AYAAN10 ✓

Order Summary:
Subtotal                    $1,000.00
Discount (10%)               -$100.00
Shipping                      $120.00
Grand Total                 $1,020.00
```

#### Flat Promo Applied:
```
PROMO CODE
SAVE50 ✓

Order Summary:
Subtotal                    $1,000.00
Discount ($50)                -$50.00
Shipping                      $120.00
Grand Total                 $1,070.00
```

### Cart Changes & Automatic Revalidation
If a promo code has been applied and the customer subsequently modifies cart quantities or removes items such that:
$$\text{newSubtotal} < \text{minimumOrderAmount}$$
The promo code is **immediately invalidated and removed**, displaying the exact feedback:
> `"Minimum order of $500 is required for this promo code."`

No stale or invalid discounts remain applied.

---

## 5. Shipping Isolation

Promotional discounts apply **strictly to eligible merchandise**. 
- Shipping costs (such as Aramex Priority Air or Discuss Directly freight) are **never discounted** by promo codes.
- Shipping options (`ARAMEX` and `DISCUSS DIRECTLY`) remain intact and unaltered.

---

## 6. Edge Cases & Examples

| Scenario | Subtotal | Promo Type | Value | Min Order | Discount | Payable Total | Status / Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Below Min (Percentage)** | `$499.00` | Percentage | `10%` | `$500.00` | `$0.00` | `$499.00` | ❌ Invalid: Below minimum order |
| **B. Exact Min (Percentage)** | `$500.00` | Percentage | `10%` | `$500.00` | `$50.00` | `$450.00` | ✅ Valid: Exact threshold match |
| **C. Standard (Percentage)** | `$1,000.00`| Percentage | `10%` | `$500.00` | `$100.00`| `$900.00` | ✅ Valid |
| **D. Below Min (Flat)** | `$499.00` | Flat | `$50` | `$500.00` | `$0.00` | `$499.00` | ❌ Invalid: Below minimum order |
| **E. Exact Min (Flat)** | `$500.00` | Flat | `$50` | `$500.00` | `$50.00` | `$450.00` | ✅ Valid: Exact threshold match |
| **F. 100% Free Merchandise** | `$500.00` | Percentage | `100%`| `$500.00` | `$500.00`| `$0.00` | ✅ Valid: 100% discount |
| **G. Flat > Subtotal** | `$600.00` | Flat | `$1,000` | `$500.00` | `$600.00`| `$0.00` | ✅ Valid: Capped at subtotal, payable never negative |
| **H. Cart Drop** | `$600 → $450`| Flat | `$50` | `$500.00` | `$0.00` | `$450.00` | ⚠️ Invalidated on cart change |

---

## 7. Architecture & Code References

- **Canonical Types & Admin Service:** [`src/services/admin/promotion.service.ts`](file:///Users/luhasan/Documents/ayaan/src/services/admin/promotion.service.ts)
- **Central Validation & Discount Calculation:** [`src/lib/coupon.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/coupon.ts)
- **Mock Store & Data Persistence:** [`src/lib/mock-data/mock-store.ts`](file:///Users/luhasan/Documents/ayaan/src/lib/mock-data/mock-store.ts)
- **Admin Modal UI:** [`src/components/admin/promotions/coupons/CouponModal.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/promotions/coupons/CouponModal.tsx)
- **Checkout Modal Integration:** [`src/components/cart/CheckoutModal.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/cart/CheckoutModal.tsx)
