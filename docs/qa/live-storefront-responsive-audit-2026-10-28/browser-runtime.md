# AYC Live Storefront Audit — Browser Runtime & Network Diagnostics

**Audit Date:** 2026-10-28  
**Target Host:** `https://ayaanclothing.com`  
**Active Production Release:** `release_20261028_053947_47692ee`  
**Browser Engine:** Google Chrome 156.0.7107.0 (Official Build via Puppeteer CDP)

---

## 1. Browser Console Diagnostics Summary

During the comprehensive audit covering 13 responsive viewports, 34 routes, and interactive customer journeys, the browser console was monitored in real time:

| Error Category | Error Message / Pattern | Frequency | Root Cause | Impact |
| :--- | :--- | :---: | :--- | :--- |
| **Asset 404 (Brand Logos)** | `Failed to load resource: the server responded with a status of 404 (Not Found)` | 234 | Missing local SVGs (`aarab.svg`, `pepco-women.svg`, `grupo-inditex.svg`) in `public/brands/` | Harmless; product cards catch image load errors and gracefully fall back to brand text badge. |
| **Uncaught JS Exceptions** | Any unhandled `TypeError`, `ReferenceError`, or script syntax error | **0** | None | Full JavaScript runtime stability across all pages. |
| **React Hydration Errors** | `Hydration failed because the initial UI does not match` | **0** | Clean SSR/CSR parity; zero dynamic locale or timezone mismatch. | Clean initial render and seamless hydration. |
| **React Key Warnings** | `Each child in a list should have a unique "key" prop` | **0** | Clean collection mapping across product cards and navigation menus. | Zero list reconciliation churn. |

---

## 2. Network Request Analysis & Third-Party Telemetry

A total of 719 network abort events were recorded during automated testing:

* **Third-Party Telemetry Aborts (100% of abort events):**
  - All aborted requests belonged exclusively to Google Remarketing (`https://www.google.com/rmkt/collect/...`) and Google Conversion Tracking (`https://www.google.com.bd/pagead/1p-conversion/...`).
  - **Reason for Abort:** The headless Chrome CDP session intentionally blocks third-party cookie syncing and background advertising pings (`net::ERR_ABORTED`).
  - **Standard Compliance:** As required by Section 15 of the audit specification, third-party advertising scripts blocked by the test environment are classified as external test-runner boundaries and are not production defects.
* **First-Party Production API Requests:**
  - `GET /api/v1/health` $\implies$ **`200 OK`** (`database: ok`, `redis: ok`).
  - `POST /api/v1/auth/login` $\implies$ **`200 OK`** (Clean 422 JSON validation responses for invalid credentials).
  - `GET /_next/static/chunks/*` $\implies$ **`100% 200 OK`** (Zero chunk 404 or missing asset errors).

---

## 3. Cross-Browser & Multi-Engine Execution Status

| Engine | Version / Binary | Testing Mode | Execution Status | Verified Capabilities |
| :--- | :--- | :--- | :---: | :--- |
| **Chromium** | Google Chrome 156.0.7107.0 | Automated Headless + CDP | **`100% EXECUTED`** | 13 viewports, 34 routes, responsive layout arithmetic, touch dispatch, and interactive controls. |
| **WebKit** | Apple Safari 26.6.2 (macOS) | Native Browser Inspection | **`VERIFIED (Manual/OS)`** | Core visual rendering, header layout, typography, flexbox gap, and 4:5 image gallery parity verified. Automated `safaridriver` was not run due to OS authorization constraints. |
| **Gecko** | Mozilla Firefox | N/A | **`NOT INSTALLED`** | Firefox binary is not installed on the developer workstation environment. |

---

## 4. Touch & Viewport Emulation Fidelity

* **Mobile Profiles (320px, 360px, 390px, 430px, 600px, 768px, 844px):**
  - Executed with `isMobile: true`, `hasTouch: true`, and device pixel ratios of 2.0x and 3.0x.
  - Touch scrolling, momentum carousel swipe, and tap targets ($44\text{px}+$ touch targets) evaluated without desktop cursor artifacts.

