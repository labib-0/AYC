# AYC POS Terminal — Cashier & Operator Runbook

**Document Version:** 1.0.0  
**Effective Date:** October 10, 2026  
**System:** Ayaan Clothing (AYC) Point-of-Sale Terminal  
**Audience:** Cashiers, Store Operators, Counter Supervisors, and Accounts Administrators  
**Terminal URL:** `https://ayaanclothing.com/ayc/pos` (or local admin `http://localhost:3000/ayc/pos`)

---

## 1. System Overview & Core Principles

The AYC POS Terminal is an alternative administrative interface for creating and managing standard Ayaan Clothing customer orders. **It is not an isolated retail checkout system or separate cash register silo.**

### Key Rules
1. **Mandatory Customer Profile:** Every transaction must be linked to a persistent, identifiable customer record. Anonymous walk-in sales are strictly prohibited.
2. **One Order Pipeline:** Counter orders create standard AYC orders subject to the same server-side pricing, inventory tracking, and commercial document standards as online orders.
3. **Official Commercial Documents Only:** Customers receive authentic commercial sales invoices and export documents. **There are no thermal roll receipts or mini slips.**
4. **Zero Client Tampering:** Product prices, tiered discounts, and order totals are calculated exclusively on the server.
5. **Immediate Escalation Rule:** **Staff must immediately STOP a transaction and escalate to a supervisor if customer association, payment totals, or stock information appears inconsistent or unexpected.**

---

## 2. Administrator Login and POS Permissions

### 2.1. Access Requirements
- Only authorized staff accounts with the `admin` role can log in to the terminal.
- Cashier operators require the following Granular RBAC permissions:
  - `pos.access`: Required to view and operate the POS terminal screen.
  - `pos.sale`: Required to submit and complete orders.
  - `pos.customer_create`: Required to register new retail customers.
  - `pos.discount`: Required to apply manual percentage or fixed discounts.

### 2.2. Login Procedure
1. Navigate to `/ayc/login` in Google Chrome or a modern browser.
2. Enter your authorized admin credentials.
3. Upon login, navigate to **POS Terminal** via the administrative sidebar or open `/ayc/pos`.
4. Verify the top status banner displays **"POS Cashier Terminal ACTIVE"**, your Cashier Badge, and the assigned physical Warehouse location (e.g., `WH-UTTARA-01` or `WH-CTG-01`).

---

## 3. Customer Identification & Assignment

Every sale requires an active customer profile before checkout can be initiated.

### 3.1. Finding & Selecting a Returning Customer
1. Locate the **Customer Selection Card** in the right-hand panel of the POS terminal.
2. In the search box (`#pos-customer-search-input`), enter the customer's:
   - Full Name (e.g., `Kazi Nazrul`), OR
   - Phone Number (e.g., `+880 1711-222333`), OR
   - Email Address (e.g., `nazrul@dhakafashion.com`).
3. Matching profiles appear dynamically in the dropdown list.
4. Click **`Select ->`** to assign the customer.
5. Confirm the customer's avatar, name, phone, company, and past order count display in the **Active Customer Card** (`#pos-selected-customer-card`).

### 3.2. Registering a New Customer
If the customer has not shopped with Ayaan Clothing previously:
1. Click **`+ Quick register`** or **`+ Add New Customer`** (`#btn-pos-quick-add-customer`).
2. Fill in the required details in the modal:
   - **Customer Name:** Real full name (minimum 2 characters).
   - **Phone Number:** Real mobile phone number with country code (e.g., `+8801700112233`).
   - **Email Address:** *Optional.* Leave blank if the customer does not have or provide an email. **Never enter a fake or synthetic email address.**
   - **Company / Shop Name:** *Optional.* Store name if wholesale buyer.
3. Click **`Register & Assign`**.
4. The system automatically creates the persistent profile (or safely matches an existing profile if the phone number is already registered) and attaches it to the current sale.
5. *Note:* Registering a new customer preserves your active cart items.

### 3.3. Changing a Customer
- If the wrong customer was selected, click **`Change Customer`** (`#btn-pos-change-customer`).
- Select or register the correct customer. Active line items remain in your cart.

---

## 4. Product Catalog Selection & Cart Building

### 4.1. Searching & Filtering Products
- **Catalog Search:** Use the search bar (`#pos-product-search-input`) to search by product title or SKU (e.g., `Pima Cotton` or `EXP-PIMA-002`).
- **Category Chips:** Click category pills (e.g., *All Items*, *T-Shirts*, *Jeans*, *Shirts*) to filter items quickly.
- **Physical Warehouse:** Verify the selected warehouse dropdown matches your physical counter location so stock decrements from the correct inventory pool.

### 4.2. Adding Items & Selecting Variants
1. Click on a product card in the catalog.
2. If the product contains variants (Sizes: S, M, L, XL; Colors: White, Black):
   - Choose the required variant from the selection modal.
   - Verify the available stock number displayed.
3. If the product has a **Minimum Order Quantity (MOQ)**:
   - The quantity must meet or exceed the MOQ (e.g., 10 pcs).
   - The quantity must be an exact multiple of the MOQ where applicable.
4. Click **`Add to Sale`**.

### 4.3. Reviewing Cart & Quantities
In the cart panel:
- Adjust quantities using the `+` and `-` buttons or type the exact quantity.
- If requested quantity exceeds available stock, the system will highlight the line and block checkout.
- To remove an item, click the trash can icon.
- Line totals, subtotal, and grand total recalculate automatically.

---

## 5. Discounts & Order Notes

### 5.1. Promo Coupons
- If the customer presents an authorized promotional coupon code, enter it in the **Promo Code** input and click **`Apply`**.
- The coupon's minimum spend and validity are validated server-side.

### 5.2. Manual Cashier Discounts (Authorized Supervisors Only)
- Click **`Add Manual Discount`**.
- Select type: **Percentage (%)** or **Fixed Amount ($)**.
- Enter the value and provide a **mandatory audit reason** (minimum 3 characters, e.g., *"Counter loyalty concession approved by GM"*).
- The discount will be logged in the administrative audit history with your admin ID.

### 5.3. Order Notes
- Add any customer purchase order references or delivery instructions into the **Order Notes** field.

---

## 6. Payment Processing & Checkout

Verify the final **Grand Total** before taking payment.

### 6.1. Cash Payment & Change Return
1. Select **Cash** as the payment method.
2. Enter the cash tendered by the customer in the **Cash Tendered** field (`#pos-cash-tendered-input`), or click the preset banknote quick buttons ($50, $100, $200, $500).
3. The terminal displays the exact **Change Return** in green (`#pos-change-return-display`).
4. **Validation Check:** If cash tendered is less than the total due, checkout is blocked and the shortfall is displayed in red.
5. Collect the physical currency, return the exact change to the customer, and click **`Complete Sale`** (`#btn-complete-pos-sale`).

### 6.2. Non-Cash Payment (Card / Wire / Mobile Banking)
1. Select **Card**, **Bank Transfer**, or **Mobile Banking**.
2. **Paid Amount:**
   - Full Payment: Leave at the total amount.
   - Partial Payment / Deposit: Enter the exact amount received (e.g., $50 deposit on a $100 sale). The terminal will calculate and display the **Balance Due**.
3. **Reference / Transaction ID:** Enter the terminal receipt slip number, card authorization code, or bank wire reference number.
4. **Overpayment Rule:** Non-cash paid amounts cannot exceed the grand total.
5. Click **`Complete Sale`**.

---

## 7. Order Confirmation & In-Terminal Order Hub

Upon successful checkout, the terminal transitions to the **Order Management Hub** (`#pos-order-management-modal`).

### 7.1. Order Review Information
- **Order Number Banner (`#pos-completion-order-number`):** Displays canonical order number (e.g., `AYN-POS-20261010-ABCDEF`). Click the copy icon to copy to clipboard.
- **Customer Details (`#pos-order-customer-info`):** Shows customer name, phone number, and account ID.
- **Status Badges:**
  - Full Payment: Displays **`Order Confirmed`** (customer-facing) and **`PAID`** (financial). Stock is decremented immediately.
  - Deferred / Partial Payment: Displays **`Payment Pending`** and **`PARTIALLY PAID`** / **`PENDING`**. Stock remains reserved or decremented based on payment rules.

### 7.2. Accessing Standard Commercial Documents
In the **Commercial Documents Hub**, click any of the official export-grade documents:
- **`Sales Invoice`** (`/ayc/documents/INVOICE/order_{id}`): Official A4 VAT/Tax sales invoice.
- **`Order Sheet`** (`/ayc/documents/ORDER_SHEET/order_{id}`): Detailed warehouse pick/pack sheet.
- **`Proforma Invoice (PI)`** (`/ayc/documents/PROFORMA_INVOICE/order_{id}`): Advance commercial invoice.
- **`Commercial Invoice (CI)`** (`/ayc/documents/COMMERCIAL_INVOICE/order_{id}`): Formal export commercial invoice (available upon payment approval).
- **`Packing List`** (`/ayc/documents/PACKING_LIST/order_{id}`): Full carton/package specification.

*Printing Note:* Press `Ctrl+P` (Windows) or `Cmd+P` (Mac) in your browser to print standard A4 documents to your office or counter laser printer.

### 7.3. Next Actions
- **`View Full Order Details`** (`#btn-pos-view-full-order`): Opens the full administration screen (`/ayc/orders/{id}`) for shipments, tracking numbers, or notes.
- **`Start New Sale`** (`#btn-pos-new-sale`): Clears the terminal and readies the screen for the next customer.

---

## 8. Managing Deferred & Partial Payments

For orders created with pending or partial payment:
1. When the customer submits remaining wire proof or bank transfer:
2. Open `/ayc/orders/{id}` or use the in-terminal **`Approve Payment`** action.
3. Review payment proof and reference number.
4. Click **`Approve Payment`**.
5. The order transitions to `processing` / `ORDER CONFIRMED`, and physical stock is decremented from the assigned warehouse exactly once.
6. Repeated approval clicks are safely ignored by the idempotency safeguard.

---

## 9. Shipment & Fulfillment Handover

1. Once payment is confirmed (`ORDER CONFIRMED`), warehouse staff pack the items.
2. In the order screen, click **`Fulfill Order`** or **`Mark as Shipped`**.
3. Enter tracking number (e.g., Aramex airway bill) or select counter collection.
4. Order transitions to **`ON SHIPMENT`**.

---

## 10. Troubleshooting & Error Recovery

### 10.1. Checkout Aborted / Failed Network
- If an order fails to submit (e.g., connection timeout):
- Check network connectivity.
- Verify whether the order appears in **Orders List** (`/ayc/orders`) before re-submitting to prevent accidental double-entry.
- The terminal automatically transmits an `idempotency_key` with each submission; re-clicking submit on the same cart will safely return the original order without duplicate deductions.

### 10.2. Out of Stock Alert
- If an item indicates insufficient stock during checkout, another terminal or online buyer may have secured the last units.
- Refresh the product catalog, check alternate warehouse stock, or adjust the requested quantity.

### 10.3. Ambiguous Customer Phone Match
- If entering a phone number produces an error stating *"Multiple existing customers match this phone number"*:
- Use the Customer Search bar to view matching accounts by name or email.
- Select the exact registered profile.

---

## 11. Escalation Procedures

**Staff must STOP the transaction and notify the shift supervisor immediately if:**
1. A customer profile cannot be matched or registration fails.
2. The cash change return calculated differs from physical money counted.
3. Product prices or tiered wholesale discounts do not match the company's approved rate sheet.
4. Stock records in the POS do not match physical warehouse inventory.
5. An unauthorized attempt is made to bypass customer association or discount approvals.

**Supervisor Escalation Contacts:**
- **Store Supervisor / Shift Lead:** Internal Counter Extension #101
- **Accounts & Audit Team:** `accounts@ayaanclothing.com`
- **IT & Technical Support:** `support@ayaanclothing.com`
