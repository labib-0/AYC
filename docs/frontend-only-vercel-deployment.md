# AYAAN CLOTHING — Frontend-Only Vercel Deployment Guide

> [!IMPORTANT]
> **Demo-Ready Frontend Architecture**
>
> This deployment runs in **frontend-first / mock mode**, completely decoupled from any external backend. It does **NOT** require a running Laravel server, PostgreSQL database, or Redis instance. All commercial products, categories, brands, orders, RFQs, quotations, inventory, promotions, and customer/admin authentication execute client-side via `mockStore` with browser `localStorage` persistence.

---

## 1. Environment Configuration

### Required Vercel Environment Variable
In your Vercel Project Settings (**Settings → Environment Variables**), set:

| Variable Name | Value | Environments | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_FRONTEND_ONLY` | `true` | Production, Preview, Development | Activates mockStore & bypasses backend calls |

### Optional Configuration (Defaults Provided)
| Variable Name | Default Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `8801826304930` | Official WhatsApp business contact |
| `NEXT_PUBLIC_CUSTOMER_APP_URL` | *(Auto-detected via `window.location.origin`)* | Used for generating absolute WhatsApp deep links |
| `NEXT_PUBLIC_ADMIN_APP_URL` | *(Empty / same origin)* | Set only if Admin is deployed to a separate domain |

> [!NOTE]
> Do **NOT** set or require `NEXT_PUBLIC_API_URL`, database passwords, or secret payment keys in Vercel for this frontend-only deployment.

---

## 2. Local Startup Commands

Run either of the following commands from the repository root:

```bash
# Option A: Start both Storefront (Port 3000) and dedicated Admin Proxy (Port 3001)
npm run dev:frontend-only

# Option B: Standard Next.js dev server
npm run dev
```

### Development URLs
- **Customer Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3001](http://localhost:3001) *(or via direct path [http://localhost:3000/admin](http://localhost:3000/admin))*

---

## 3. Production Build Command

Vercel will run the standard build script defined in `package.json`:

```bash
npm run build
```

Or for a completely clean local verification:
```bash
npm run build:clean
```

---

## 4. Default Demo Credentials

The local mock store comes pre-seeded with dedicated demo accounts:

| Account | Email | Password | Role | Context |
|---|---|---|---|---|
| **Admin Demo** | `admin@ayaan-demo.local` | `Admin@12345` | `admin` | Full Admin order, inventory, catalog, & RFQ management |
| **Customer Demo** | `customer@ayaan-demo.local` | `Customer@12345` | `customer` | Consignee order tracking, PI downloads, & dashboard |
| **B2B Buyer Demo** | `buyer@ayaanclothing.com` | `password` | `b2b_buyer` | B2B wholesale portal (`/dashboard`) |

---

## 5. Mock Data Reset Method

If mock data is modified during demonstration and needs to be returned to the pristine baseline:

1. **Via UI**: In development / frontend-only mode, click the floating **Frontend Mode** badge in the bottom-left corner of the screen and select **Reset All Demo Data**.
2. **Via Browser DevTools Console**:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
   *The application automatically self-heals and re-seeds baseline products, taxonomy, demo accounts, and orders on reload.*

---

## 6. Important Git Branching Recommendation

To maintain a clean separation between the stable client demonstration and future backend implementation:

```text
main (or frontend-demo)
  └── Frozen stable state for Vercel demo deployment (NEXT_PUBLIC_FRONTEND_ONLY=true)

backend-development
  └── Branch for future Laravel / PostgreSQL / Redis implementation
```

**Recommended Manual Git Steps:**
1. Create a dedicated branch from this verified state:
   ```bash
   git checkout -b frontend-demo
   git push -u origin frontend-demo
   ```
2. Connect your Vercel project to the `frontend-demo` branch.
3. Configure `NEXT_PUBLIC_FRONTEND_ONLY=true` in Vercel project settings.

---

## 7. Known Limitations & Architectural Notes

1. **Client-Side Persistence**: Mock data mutations (new orders, status changes, inventory adjustments) persist per browser in `localStorage`. They do not sync across different browsers, private windows, or devices.
2. **Document PDFs**: Proforma Invoices and Product Offer Sheets are generated client-side using `jspdf` and `jspdf-autotable`. No backend PDF microservice is required.
3. **Deep Links**: Commercial WhatsApp deep links resolve through `/order-access/[reference]`, which dynamically verifies the browser's active session and customer ownership before redirecting.
