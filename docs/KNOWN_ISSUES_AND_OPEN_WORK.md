# Known Issues & Open Work — AYAAN CLOTHING (AYC)

## 1. Active Issues Under Investigation

The following technical items represent current active backlog items backed by verified diagnostic evidence:

---

### Issue AYC-NET-01: Regional IPv4 TCP Return-Path Failure to South Asian Networks

* **Status**: **Under Investigation Upstream** (Escalated to Hostinger Network Engineering)
* **Impact**: Buyers and administrators connecting from specific South Asian IPv4 networks (specifically verified on Axiata Bangladesh / Robi, AS24432, test IP: `36.255.81.149`) experience connection timeouts (`HTTP 000`) over IPv4.
* **Verified Evidence**:
  1. Synchronized packet captures on VPS `eth0:443` show inbound TCP SYN packets arriving cleanly (`TTL=49`).
  2. The VPS kernel and Nginx immediately reply by transmitting TCP SYN-ACK packets out `eth0` toward default gateway `200.97.169.254` in under 0.25 ms.
  3. The client never receives the SYN-ACK and repeatedly retransmits SYN at 1s, 2s intervals.
  4. Zero final ACKs return to the VPS.
  5. The packet drop is independent of TCP options (tested with `net.ipv4.tcp_ecn=0`; failure persisted).
* **Working Control Comparisons**:
  * **IPv6 is 100% Operational**: The exact same client connecting over IPv6 (`2404:1c40:39f:3793:ec02:7fef:934e:fe81` to `2a02:4780:63:21bf::1`) completes the TCP handshake in 136 ms and achieves full TLS 1.3 connectivity.
  * **Global IPv4 is Operational**: Google Cloud crawler infrastructure (`192.178.16.130`) completes the TCP handshake and retrieves pages over IPv4 without packet loss.
* **Leading Hypothesis**: Asymmetric return-path routing or transit packet filtering between Hostinger Mumbai (AS47583) and Bharti Airtel (AS9498) / Axiata Bangladesh (AS24432).
* **Owner / Next Action**: Hostinger Network Engineering investigating BGP reverse-path routing policies and transit ACLs.
* **Resolution Criteria**: The affected South Asian client network can establish a TCP connection over IPv4 and receive HTTP 200 reliably.

---

## 2. Closed Historical Issues (Verified Resolved)

The following historical issues have been conclusively resolved in current releases and are documented here to prevent regressions:

### Closed Issue 01: Next.js Runtime Chunk Desynchronization Outages
* **Resolution Date**: October 2026
* **Root Cause**: Running `npm run build` directly into the live `.next/` directory overwrote chunk hashes while active users were navigating, throwing `ChunkLoadError: Loading chunk failed`.
* **Permanent Fix**: Automated atomic release directory structure (`.next_releases/release_YYYYMMDD_HHMMSS_sha`) in `scripts/deploy-production.sh`. Copies previous release chunks into new static builds and activates releases atomically via `mv -Tf`. Verified with `scripts/run-release-gate.mjs`.

### Closed Issue 02: Unsupported GSM Claims in Product Metadata
* **Resolution Date**: 17 October 2026 (Commit `18c11ba`)
* **Root Cause**: Automated SEO metadata generators appended generic boilerplate *"Premium 200+ GSM"* claims to products without supporting fabric weight data.
* **Permanent Fix**: Replaced with factual specification interpolation. Products without verified GSM omit the attribute cleanly, highlighting verified fabric blend and weave instead.

### Closed Issue 03: Customer Reorder Stale Pricing & Phantom Inventory
* **Resolution Date**: 16 October 2026 (Commit `3fd8150`)
* **Root Cause**: A customer dashboard "Reorder" button allowed repeating historical purchases, risking selling exhausted stock lots at obsolete pricing tiers.
* **Permanent Fix**: Feature permanently removed. Wholesale buyers configure repeat purchases through the active catalog where current stock availability and active pricing tiers are validated.

### Closed Issue 04: Commercial Document Header Layout Overlap
* **Resolution Date**: 16 October 2026 (Commit `85b8bed`)
* **Root Cause**: Exporter identity blocks and invoice title badges collided when rendered on narrow PDF viewports.
* **Permanent Fix**: Converted header layout to an isolated two-column CSS grid with explicit min-height constraints in `DocumentHeader.tsx`. Verified across all document types.

### Closed Issue 05: Payment Receipt Replacement Vulnerability
* **Resolution Date**: 16 October 2026 (Commit `3fd8150`)
* **Root Cause**: Unauthenticated or post-payment receipt overwrites risked compromising financial audit records.
* **Permanent Fix**: Enforced strict state locking. Once an order is marked `paid`, receipt replacement returns `HTTP 403 Forbidden`. Enforced 10 MB limit and automated WebP transcoding.

### Closed Issue 06: Product Name Uniqueness Collisions
* **Resolution Date**: October 2026
* **Root Cause**: An artificial unique constraint on product display names prevented merchants from listing repeat production runs of standard garment styles.
* **Permanent Fix**: Removed uniqueness requirement from `products.name`. Uniqueness is strictly enforced on `products.sku`, `products.product_id`, and `products.slug`.
