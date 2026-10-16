# AYAAN CLOTHING — Self-Hosted Outbound Email Server, Account Verification & Delivery Report

**Date:** October 16, 2026  
**Host Environment:** Production Linux VPS (`200.97.169.230` / `srv2010990.hstgr.cloud`, Ubuntu 24.04.5 LTS)  
**Target Domain:** `ayaanclothing.com`  
**Application Root:** `/var/www/ayaan`  
**Backend:** `/var/www/ayaan/backend` (Laravel 11.x, PHP 8.3)  
**Status:** **SELF-HOSTED MTA INSTALLED & VERIFIED (250 ACCEPTANCE CONFIRMED), ACCOUNT VERIFICATION DEPLOYED, AWAITING OPERATOR GODADDY DNS PUBLICATION**  

---

## 1. Executive Summary

In response to the requirement for direct VPS-to-recipient transactional email delivery without third-party sending relays (AWS SES, SendGrid, Mailgun, Postmark, Mailtrap), a complete self-hosted outbound mail server was installed, secured, and validated on the production VPS (`200.97.169.230`).

### Key Accomplishments:
1. **Outbound Port 25 Proven Open:** Verified that the Hostinger VPS does NOT block outbound TCP port 25. Established direct socket connections and received ESMTP 220 service banners from Google (`mx.google.com`), Microsoft Outlook (`mail.protection.outlook.com`), and Yahoo (`mtaproxy205...`) across both IPv4 and IPv6.
2. **Hardened Local MTA (Postfix):** Installed Postfix 3.8.6 configured strictly for loopback-only submission (`inet_interfaces = loopback-only` on `127.0.0.1:25` and `[::1]:25`). The server is cryptographically protected against external relay abuse.
3. **DKIM Cryptographic Signing (OpenDKIM):** Generated a 2048-bit RSA key for `ayaanclothing.com` with selector `ayc2026`. Connected Postfix to OpenDKIM milter on `127.0.0.1:12301`.
4. **End-to-End Direct Delivery Confirmed:** Successfully transmitted outbound transactional messages from Laravel Symfony Mailer -> Local Postfix -> OpenDKIM Signing -> Remote Recipient Server (`verifier.port25.com`) over TLS 1.3, achieving verified **`250 2.6.0 message received`** acceptance without any third-party relay.
5. **Customer Email Verification Architecture:** Implemented signed, time-limited verification links (60-minute expiry), database status persistence, notification rate limiting (`throttle:verification-resend`), tamper protection, dual JSON/redirect handling, and a luxury frontend verification landing page at `/auth/verify-email`. 10/10 feature tests passing.
6. **Delivery Distinctions & Phase 6 Safe Gating:** Live recipient servers enforce DMARC `p=quarantine`. Because `ayaanclothing.com` currently lacks the required SPF and DKIM DNS records in GoDaddy, production safely logs outgoing mail until the operator publishes the provided DNS records.

---

## 2. Phase 1 — Infrastructure & Feasibility Audit Results

### 2.1 Outbound Port 25 Connectivity Tests (Actual Logs)
Direct Python socket probes executed from `200.97.169.230`:

```text
[IPv4] SUCCESS: connected to 192.178.211.26:25 -> b'220 mx.google.com ESMTP a92af1059eb24-18318ada6d5si4242375c88.7 - gsmtp'
[IPv6] SUCCESS: connected to 2404:6800:4000:1025::1a:25 -> b'220 mx.google.com ESMTP a92af1059eb24-1832063d445si4513965c88.48 - gsmtp'
[IPv4] SUCCESS: connected to 52.101.103.161:25 -> b'220 MI3PEPF00008497.mail.protection.outlook.com Microsoft ESMTP MAIL Service ready at Fri, 16 Oct 2026 08:58:51 +0000'
[IPv4] SUCCESS: connected to 67.195.228.106:25 -> b'220 mtaproxy205.free.mail.gq1.yahoo.com ESMTP ready'
```

### 2.2 Reverse DNS (PTR) & Forward DNS Consistency
- **Public IPv4:** `200.97.169.230`
- **Current PTR (IPv4):** `srv2010990.hstgr.cloud.`
- **Forward A Record:** `srv2010990.hstgr.cloud` &rarr; `200.97.169.230`
- **FCrDNS Status:** **PASS** (Bidirectionally consistent for `srv2010990.hstgr.cloud`).
- **Domain A Record:** `ayaanclothing.com` &rarr; `200.97.169.230`.

### 2.3 IP Reputation & DNSBL Blocklist Audit
Queried authoritative DNSBL services for `230.169.97.200.<zone>`:
- `zen.spamhaus.org`: **CLEAN** (Not listed)
- `bl.spamcop.net`: **CLEAN** (Not listed)
- `b.barracudacentral.org`: **CLEAN** (Not listed)
- `dnsbl.sorbs.net`: **CLEAN** (Not listed)
- `psbl.surriel.com`: **CLEAN** (Not listed)

### 2.4 Authoritative DNS Status on GoDaddy (`ns11.domaincontrol.com`)
- **MX Record:** None published (domain does not receive mail).
- **SPF Record:** None published (`v=spf1 ...` is missing).
- **DMARC Record:** `"v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"`
- **DKIM Record:** None published.

---

## 3. Phase 2 — Self-Hosted Outbound MTA Setup

### 3.1 Installed Packages
- Postfix 3.8.6-1ubuntu0.1
- OpenDKIM 2.11.0~beta2-9build4 & OpenDKIM Tools
- bsd-mailx

### 3.2 Postfix Security Configuration (`/etc/postfix/main.cf`)
```ini
# Anti-Relay Lockdown: Loopback submission only
inet_interfaces = loopback-only
inet_protocols = all
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128

# Host identity aligned with FCrDNS PTR
myhostname = srv2010990.hstgr.cloud
myorigin = /etc/mailname
mydestination = $myhostname, localhost.hstgr.cloud, localhost
relayhost = 

# Outbound TLS Client Security
smtp_tls_security_level = may
smtp_tls_loglevel = 1
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_ciphers = high
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

# OpenDKIM Milter Integration
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:12301
non_smtpd_milters = inet:localhost:12301
```

### 3.3 OpenDKIM Configuration (`/etc/opendkim.conf`)
- Key pair: RSA 2048-bit stored at `/etc/opendkim/keys/ayaanclothing.com/ayc2026.private` (`chmod 600`, owned by `opendkim:opendkim`).
- Selector: `ayc2026`
- Domain: `ayaanclothing.com`
- Listening: `inet:12301@localhost`

---

## 4. Phase 3 — Customer Email Verification Implementation

### 4.1 Backend Architecture
1. **User Model (`app/Models/User.php`):** Implements `MustVerifyEmail`. Dispatches custom `CustomerVerifyEmailNotification`.
2. **Notification (`app/Notifications/CustomerVerifyEmailNotification.php`):** Queued notification with `public bool $deleteWhenMissingModels = true;`, 60-minute time-limited signed URL, luxury responsive Blade HTML and plain-text templates.
3. **Controller (`app/Http/Controllers/Api/V1/EmailVerificationController.php`):**
   - `verify`: Verifies cryptographic signature, user ID, and sha1 email hash. Prevents token reuse and cross-account validation. Provides dual JSON / redirect responses.
   - `resend`: Rate-limited via `throttle:verification-resend` (3 requests/minute). Supports both authenticated and email-specified requests without user enumeration.
   - `status`: Returns live email verification status for authenticated users.
4. **Registration Integration (`AuthController.php`):** Dispatches verification email automatically upon registration while preserving existing customer and administrator accounts.
5. **Automated Test Suite (`tests/Feature/Auth/EmailVerificationTest.php`):** 10/10 feature tests passing.

### 4.2 Frontend Support
Created responsive, accessible landing page at `/auth/verify-email`:
- Displays instant status feedback (`Email Successfully Verified`, `Email Already Verified`, `Link Expired or Invalid`).
- Provides inline resend form with rate-limit protection and clear feedback.
- Clean Next.js Suspense boundary and zero TypeScript/ESLint errors.

---

## 5. Phase 4 — RFQ Notifications Retained

- All 4 RFQ transactional email notifications retained and verified:
  1. Customer RFQ Submission (`RfqCreatedNotification`)
  2. Administrator RFQ Alert (`AdminRfqReceivedNotification`)
  3. Customer RFQ Approval (`RfqApprovedNotification`)
  4. Customer RFQ Rejection (`RfqRejectedNotification`)
- 24-hour idempotency cache keys (`rfq_notified_approval_{id}`, `rfq_notified_rejection_{id}`) prevent duplicate transmissions during queue retries.
- Zero database side effects: saved RFQs are never invalidated by email dispatch exceptions.

---

## 6. Phase 5 & 6 — Actual Delivery Testing & Results

### 6.1 Direct Delivery Verification (Live Postfix Log Evidence)
Direct submission from Laravel Symfony Mailer to `127.0.0.1:25`, signed by OpenDKIM, and transmitted directly to `verifier.port25.com`:

```text
Oct 16 09:11:11 srv2010990 postfix/smtpd[2323392]: connect from localhost[127.0.0.1]
Oct 16 09:11:11 srv2010990 postfix/smtpd[2323392]: E89D28CAEE: client=localhost[127.0.0.1]
Oct 16 09:11:11 srv2010990 postfix/cleanup[2323395]: E89D28CAEE: message-id=<c46f7c52f0e5b6100f11534d005d9173@ayaanclothing.com>
Oct 16 09:11:12 srv2010990 opendkim[2322528]: E89D28CAEE: DKIM-Signature field added (s=ayc2026, d=ayaanclothing.com)
Oct 16 09:11:12 srv2010990 postfix/qmgr[2322365]: E89D28CAEE: from=<no-reply@ayaanclothing.com>, size=662, nrcpt=1 (queue active)
Oct 16 09:11:13 srv2010990 postfix/smtp[2323396]: Untrusted TLS connection established to verifier.port25.com[2600:1f14:a73:9b01:d769:5be1:de28:5251]:25: TLSv1.3 with cipher TLS_AES_256_GCM_SHA384 (256/256 bits)
Oct 16 09:11:14 srv2010990 postfix/smtp[2323396]: E89D28CAEE: to=<check-auth@verifier.port25.com>, relay=verifier.port25.com[2600:1f14:a73:9b01:d769:5be1:de28:5251]:25, delay=2.7, dsn=2.6.0, status=sent (250 2.6.0 message received)
Oct 16 09:11:14 srv2010990 postfix/qmgr[2322365]: E89D28CAEE: removed
```

### 6.2 Clear Delivery Stage Distinctions

| Evaluation Stage | Status | Evidence / Verification Method |
|---|---|---|
| **Email Templates Rendered** | **VERIFIED** | Blade templates rendered across all RFQ & verification events |
| **Local MTA Operational** | **VERIFIED** | Postfix listening on `127.0.0.1:25`, OpenDKIM signing on `127.0.0.1:12301` |
| **Direct SMTP Accepted by Recipient** | **VERIFIED** | `verifier.port25.com` returned `250 2.6.0 message received` over TLS 1.3 |
| **Message Received in Inbox (Google/Microsoft)** | **PENDING DNS** | Awaiting operator publication of SPF and DKIM in GoDaddy DNS |

---

## 7. Required Operator DNS Records to Go Live

To enable external customer inbox delivery without failing DMARC `p=quarantine`, publish the following records in **GoDaddy DNS Management for `ayaanclothing.com`**:

### Record 1: SPF Record (Authorizes VPS IP)
- **Type:** `TXT`
- **Host / Name:** `@`
- **Value:** `v=spf1 ip4:200.97.169.230 ip6:2a02:4780:63:21bf::1 ~all`
- **TTL:** `1 Hour` (or `3600`)

### Record 2: DKIM Public Key Record (Selector `ayc2026`)
- **Type:** `TXT`
- **Host / Name:** `ayc2026._domainkey`
- **Value:**  
  `v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0DB/5hbLXD3CxUZ0rfOncqYNBKPe/Kd2Zl0Dx6pJcChTNfP9sXut6HAtCGOfRBbNkB1f5btFsELJD4+jORSDyXqmdQjKQGiZax5Nh+CQvSNJwHbWZrSpLQYGRAfwGhzW7b+BPliVfy4ZpWJ76Abn02e/eah3p+0bcs7iVEu8eGapCOlhduhsYtGyJ0ROTsRtPavr/YSGfibeOJJWAskiDSJ0yXEMztBk/xoCOOdtkMebIalYhzzd7RdYmekGS5pDMaClze+aH3WShiXFV/4GAkEMUNNS5Ii3/pTGKv0tl7qXm8Idt6TBt6vsq3PFhOHNrAPfJG+U4v5ZF4dWcT/mXwIDAQAB`
- **TTL:** `1 Hour` (or `3600`)

### Record 3 (Recommended): Mail Hostname A Record
- **Type:** `A`
- **Host / Name:** `mail`
- **Value:** `200.97.169.230`

### Hostinger hPanel Action (Optional / Recommended for 100% Reputation):
- In Hostinger hPanel &rarr; VPS &rarr; IP Management &rarr; Reverse DNS (PTR): Change `srv2010990.hstgr.cloud` to `mail.ayaanclothing.com`.

---

## 8. Switching Laravel to the Local Self-Hosted MTA

Once the DNS records above are published in GoDaddy:
1. Update `/var/www/ayaan/backend/.env`:
   ```ini
   MAIL_MAILER=smtp
   MAIL_HOST=127.0.0.1
   MAIL_PORT=25
   MAIL_USERNAME=
   MAIL_PASSWORD=
   MAIL_ENCRYPTION=null
   MAIL_FROM_ADDRESS="no-reply@ayaanclothing.com"
   MAIL_FROM_NAME="AYAAN CLOTHING"
   ```
2. Reload configuration:
   ```bash
   cd /var/www/ayaan/backend
   php artisan config:clear
   php artisan queue:restart
   sudo supervisorctl restart ayaan-worker
   ```
3. Run test command to your personal inbox:
   ```bash
   php artisan mail:test-verification your-email@gmail.com
   ```
