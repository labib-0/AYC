# 24 — External Third-Party Integrations

This document catalogues all external services, logistics APIs, banking systems, and third-party integrations connected to the Ayaan Clothing platform.

---

## 1. Integration Inventory Matrix

| Service | Category | Integration Method | Implementation Status | Failure Mode |
|---|---|---|:---:|---|
| **Aramex International** | Express Air Logistics | REST API (JSON / XML) | **IMPLEMENTED** | Falls back to internal rate estimation tables |
| **Akij Sea Shipping** | Bulk Maritime Freight | Service Adapter / Manual | **IMPLEMENTED** | Logistics dispatcher manual booking |
| **Pubali Bank Limited** | Commercial Wire Banking| SWIFT MT103 / Invoice | **IMPLEMENTED** | Buyer uploads slip; manual admin verification |
| **SMTP Mail Server** | Transactional Email | SMTP (TLS / Port 2525/587) | **IMPLEMENTED** | Logged to `laravel.log` if unconfigured |
| **YouTube Embeds** | Garment Video Showcase | No-Cookie IFrame Embed | **IMPLEMENTED** | Hidden if URL empty or invalid |
| **Stripe Payments** | Card Processing (Future)| Client SDK / Webhook | **PLANNED / REFERENCED**| Wire transfer is primary production method |

---

## 2. Detailed Service Specifications

### 2.1 Aramex International Logistics API
- **Purpose**: Generates international air freight rate quotes and books Air Waybills (AWB) for export orders originating from Hazrat Shahjalal International Airport (DAC), Dhaka.
- **Implementation**: `backend/app/Services/Shipping/AramexShippingService.php`.
- **Key Methods**:
  - `calculateRate(ShippingQuoteRequest $request)`: Computes charges based on destination country, physical weight, and volumetric CBM.
  - `createShipment(Order $order)`: Issues shipment creation call, returns tracking ID, and saves PDF waybill.
  - `trackShipment(string $trackingNumber)`: Retrieves real-time milestone events.
- **Environment Variables**:
  - `ARAMEX_ACCOUNT_NUMBER`: Masked in production.
  - `ARAMEX_USER_NAME`: Masked.
  - `ARAMEX_PASSWORD`: Secret.
  - `ARAMEX_ACCOUNT_PIN`: Secret.
  - `ARAMEX_ACCOUNT_ENTITY`: Typically `DAC` (Dhaka).
  - `ARAMEX_ACCOUNT_COUNTRY`: `BD` (Bangladesh).
- **Failure Resilience**: If Aramex API returns an error or connection timeout occurs, `ShippingManagerService` catches the exception and falls back to pre-calculated regional export tables based on destination country zones.

---

### 2.2 Pubali Bank Limited (Commercial Wire Banking)
- **Purpose**: Authoritative beneficiary bank for all international wholesale wire transfers, Letters of Credit (LC), and Telegraphic Transfers (TT).
- **Implementation**: `backend/config/business.php`.
- **Wire Specification Injected into Documents**:
  - **Beneficiary**: `M/S AYAAN CLOTHING`
  - **Account Number**: `1788-901-044316`
  - **SWIFT Code**: `PUBABDDH210`
  - **Branch**: `Nawabpur Road Branch, Dhaka-1100, Bangladesh`
- **Workflow**: Automated invoice and proforma PDF generators pull these values directly from config, guaranteeing zero typographical errors on commercial letters of credit.

---

### 2.3 Akij Sea Shipping (Bulk Maritime Export)
- **Purpose**: Handles containerized sea freight dispatch (20ft / 40ft FCL / LCL) through Chattogram Sea Port (CGP), Bangladesh.
- **Implementation**: `backend/app/Services/Shipping/AkijSeaShippingService.php`.
- **Usage**: Invoked for heavy wholesale consignments (> 500 kg or full container loads).

---

### 2.4 Transactional Email Gateway
- **Purpose**: Dispatches order confirmations, proforma invoice attachments, RFQ quote notifications, and password reset links.
- **Engine**: Laravel Mail component configured via `backend/config/mail.php`.
- **Supported Providers**: Mailtrap (Development/Staging), Amazon SES / SendGrid (Production).
- **Environment Variables**: `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`.
