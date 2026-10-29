# AYC — Three-Day Change Audit: Environment Baseline
**Audit Date:** 2026-10-28  
**Audit Phase:** Baseline Environment Inspection (Prompt 1 of 5)  
**Project:** `/Users/labibhasan/Documents/AYC`  

---

## 1. Test Environment Specification

### Local Workstation (macOS)
- **Host OS:** macOS (Darwin 24.3.0, arm64)
- **Node.js Version:** `v20.18.0`
- **NPM Version:** `10.8.2`
- **Next.js Engine:** Next.js 16.3.2 Turbopack
- **TypeScript Compiler:** `npx tsc --noEmit` (passes with 0 errors across entire workspace)
- **Browser Automation Binary:** Google Chrome `156.0.8078.73`  
  Path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Puppeteer Library:** `puppeteer-core` (uses real system Chrome in headless or windowed mode)
- **Local Dev Server Commands:**
  - Customer Storefront: `npm run dev:customer` (`http://localhost:3000`)
  - Admin Proxy: `npm run dev:admin` (`http://localhost:3001`)
  - Dual Dev Server: `npm run dev:both`
- **Local PHP / Composer State:**
  - `php`: Not installed in local macOS shell PATH
  - `composer`: Not installed in local macOS shell PATH
  - `phpunit`: Not executable locally without PHP runtime

### Remote Production Server (`srv2010990`)
- **IP Address:** `200.97.169.230`
- **SSH Connectivity:** Authorized read-only diagnostic access via `root@200.97.169.230`
- **PHP Version:** `PHP 8.4.26 (cli)` with Zend OPcache
- **Composer Version:** `Composer 2.7.1`
- **Backend Framework:** `Laravel Framework 13.34.0`
- **Database Engine:** MySQL / MariaDB (Live connection: OK)
- **Cache & Queue Driver:** Redis (Live connection: OK)
- **Process Manager:** PM2 v7.0.4
  - `ayaan-customer`: `npm exec next start -p 3000 -H 127.0.0.1` (ONLINE, memory ~180MB)
  - `ayaan-admin`: `node scripts/admin-proxy.js` (ONLINE, memory ~42MB)
- **Active Release Directory:** `/var/www/ayaan/.next_releases/release_20261027_232307_37ee17d`
- **Symlink:** `/var/www/ayaan/.next` -> `release_20261027_232307_37ee17d`
- **Git HEAD on Server:** `0609a71`
- **Live Health Endpoint:** `https://ayaanclothing.com/api/health` -> HTTP 200 OK (`{"database":"ok","redis":"ok"}`)

---

## 2. Test Execution Tiers & Tooling Separation

To ensure reliable, truthful regression verification across all 46 issues without environmental collisions, the audit relies on four distinct test execution tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TIER 1: BROWSER AUTOMATION                           │
│  Tool: Puppeteer-Core + Google Chrome 156.0                            │
│  Scope: Real DOM, responsive layout (320px/375px/768px/1440px),       │
│         touch targets, modal dismissal, scrolling, and screenshots      │
│  Target: https://ayaanclothing.com OR local dev server (port 3000)     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│               TIER 2: STOREFRONT & ADMIN COMPONENT SUITES              │
│  Tool: Node.js (npx tsx) + Authoritative Contract Fixtures             │
│  Scope: Component AST/DOM invariants, CSS classes, click propagation,  │
│         accessibility attributes, state transitions                    │
│  Location: tests/*.test.ts                                             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│              TIER 3: COMMERCIAL DOCUMENTS & PDF GENERATION             │
│  Tool: Node.js PDF vector engine & Laravel backend inspection          │
│  Scope: Vector A4 geometry, zero-shipping rules, wholesale pricing,    │
│         fingerprint cache invalidation, filename formatting            │
│  Location: tests/product-offer-sheet-lifecycle.test.ts                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│              TIER 4: PRODUCTION READ-ONLY VERIFICATION GATES           │
│  Tool: HTTP/HTTPS cURL, SSL checks, PM2 inspection via SSH             │
│  Scope: Live routes HTTP 200/307, static JS chunk integrity (32/32),   │
│         OAuth throttle headers, database/redis health                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Environment Blockers & Pre-Flight Mitigation

| Item | Status | Impact | Pre-Flight Mitigation / Policy |
| :--- | :---: | :--- | :--- |
| **Local PHP Absence** | Blocked locally | Cannot execute `./vendor/bin/phpunit` directly on macOS. | Unit and contract assertions run via `npx tsx`; backend inspections executed on production via non-destructive SSH or HTTP API. |
| **Local Dev Server Idle** | Offline | Browser automation targeting `localhost:3000` fails with `ERR_CONNECTION_REFUSED`. | Scripts should either target `https://ayaanclothing.com` (for deployed features) or launch the local dev server before running local tests. |
| **Unstaged Language Removal** | Working tree only | If committed prematurely, would alter release diff; if reset, user work is lost. | **Strictly preserve unstaged files.** Do not run `git reset` or `git checkout -- .`. |
| **Production Write Prohibition** | Policy restriction | No test mutations, orders, or database deletes may run on live production. | All tests against live production must be 100% read-only GET requests or use isolated mock fixtures. |
| **Credentials & PII Protection** | Zero-trust rule | Accidental exposure of tokens, passwords, or customer PII in logs or artifacts. | All test runners must use masked tokens and synthetic fixture data. |

