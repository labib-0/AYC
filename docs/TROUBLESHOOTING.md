# AYAAN CLOTHING (AYC) — Troubleshooting & Maintenance Guide

**Document Purpose**: Diagnostic matrix, root-cause analyses, and resolution runbooks for common operational, architectural, and development issues.  
**Audience**: DevOps Engineers, Support Developers, On-Call Operators, AI Coding Assistants.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_052638_a8d2fef` on Hostinger VPS `srv2010990`.

---

## 1. Quick Diagnostic Symptom Matrix

| Symptom / Error | Root Cause | Immediate Diagnostic Step | Remediation Runbook |
| :--- | :--- | :--- | :--- |
| **`EMAIL_VERIFICATION_REQUIRED` (HTTP 403)** | Customer account email is unverified | Check `users.email_verified_at` | [Runbook 1](#issue-1-customer-blocked-at-checkout) |
| **ChunkLoadError / 404 on `_next/static`** | Obsolete client cache after deployment | Inspect Nginx chunk mirror | [Runbook 2](#issue-2-nextjs-chunkloaderror-404-on-static-assets) |
| **HTTP 502 Bad Gateway** | PHP-FPM socket down or PM2 daemon crashed | Check socket & PM2 status | [Runbook 3](#issue-3-502-bad-gateway-on-api-or-storefront) |
| **Offer Sheet Download Failed** | Missing artifact or Dompdf memory limit | Run CLI pre-generation | [Runbook 4](#issue-4-product-offer-sheet-download-failure) |
| **Transactional Emails Not Sending** | Supervisor worker stopped or SMTP error | Check `worker.log` & Supervisor | [Runbook 5](#issue-5-transactional-emails-not-arriving) |
| **Google Sign-In Callback Error** | `redirect_uri_mismatch` or state error | Check Google Cloud Console URI | [Runbook 6](#issue-6-google-oauth-callback-failure) |
| **Database Connection Refused** | PostgreSQL service stopped or maxed out | `pg_isready` & status check | [Runbook 7](#issue-7-postgresql-connection-refused) |
| **Disk Space Exhaustion** | Unpruned release directories or log buildup | `df -h` & check storage | [Runbook 8](#issue-8-disk-space-exhaustion) |

---

## 2. Issue Resolution Runbooks

### Issue 1: Customer Blocked at Checkout (`EMAIL_VERIFICATION_REQUIRED`)
* **Symptom**: When attempting to checkout, customer sees *"Email verification is required before placing an order."*
* **Root Cause**: The customer account has `email_verified_at = null`. Under AYC security policy, no customer can place orders without verifying their email address through AYC's challenge link.
* **Resolution**:
  1. Guide customer to check their inbox or click **"Resend Verification Link"** in the checkout modal.
  2. For urgent enterprise accounts, an administrator can manually verify via artisan tinker:
     ```bash
     cd /var/www/ayaan/backend
     php artisan tinker --execute="App\Models\User::where('email', 'buyer@example.com')->update(['email_verified_at' => now()]);"
     ```

### Issue 2: Next.js ChunkLoadError (404 on Static Assets)
* **Symptom**: Browser console logs `ChunkLoadError: Loading chunk xxx failed` after a new release.
* **Root Cause**: Client had an active tab open referencing hashed script chunks from the previous release.
* **Resolution**:
  - The production deployment pipeline (`deploy-production.sh`) automatically copies previous chunks into the new release.
  - If a manual build bypassed this script, run `deploy-production.sh` to properly re-activate with chunk continuity.

### Issue 3: 502 Bad Gateway on API or Storefront
* **Symptom**: Nginx returns HTTP 502 Bad Gateway.
* **Root Cause**: PHP-FPM socket died or PM2 daemons crashed.
* **Diagnostic & Fix**:
  ```bash
  # Check PHP-FPM
  systemctl status php8.4-fpm
  systemctl restart php8.4-fpm

  # Check PM2
  su - ayaan -c "pm2 status"
  su - ayaan -c "pm2 restart all"
  ```

### Issue 4: Product Offer Sheet Download Failure
* **Symptom**: Downloading an Offer Sheet fails or times out.
* **Root Cause**: Missing pre-generated artifact and Dompdf memory exhaustion during on-demand fallback.
* **Resolution**:
  - Pre-generate the artifact via CLI:
    ```bash
    cd /var/www/ayaan/backend
    php artisan ayaan:pregenerate-offer-sheets --product={SKU_OR_ID} --force
    ```
  - If oversized, optimize media: `php artisan ayaan:optimize-media`.

### Issue 5: Transactional Emails Not Arriving
* **Symptom**: Buyers report not receiving verification links or order confirmation attachments.
* **Diagnostic & Fix**:
  ```bash
  # 1. Verify queue worker is running
  supervisorctl status ayaan-worker

  # 2. Check failed jobs log
  cd /var/www/ayaan/backend
  php artisan queue:failed

  # 3. Test SMTP delivery directly
  php artisan ayaan:test-verification-email test@example.com
  ```

### Issue 6: Google OAuth Callback Failure
* **Symptom**: User encounters `redirect_uri_mismatch` or `Invalid callback state`.
* **Root Cause**: Callback URL mismatch between Google Cloud Console and `GOOGLE_REDIRECT_URI`.
* **Resolution**: Ensure Google Cloud Console has exact authorized URI: `https://ayaanclothing.com/api/v1/auth/google/callback`.

### Issue 7: PostgreSQL Connection Refused
* **Symptom**: Backend logs `Connection refused` or `SQLSTATE[08006]`.
* **Diagnostic & Fix**:
  ```bash
  pg_isready -h 127.0.0.1 -p 5432
  systemctl status postgresql
  systemctl restart postgresql
  ```

### Issue 8: Disk Space Exhaustion
* **Symptom**: Server reports `No space left on device`.
* **Resolution**:
  ```bash
  # Check disk usage
  df -h

  # Clean up temporary generation files
  cd /var/www/ayaan/backend && php artisan ayaan:cleanup-temporary-files

  # Prune old Next.js releases (retain last 3)
  cd /var/www/ayaan/.next_releases && ls -dt release_* | tail -n +4 | xargs -r rm -rf
  ```

---

## 3. Essential Architectural Invariants for Future Maintainers & AI Agents

1. **Reuse Canonical Services**: Do **NOT** create duplicate PDF generators, email-specific document builders, or client-side `jsPDF` loops. Always consume `ProductOfferSheetService` and `ProformaInvoiceService`.
2. **Never Bypass Email Verification**: Never remove or bypass `EnsureEmailIsVerified` middleware on the checkout pipeline.
3. **Preserve Atomic Deployments**: Never compile Next.js directly into `.next` on the production server. Always use `/var/www/ayaan/scripts/deploy-production.sh`.
4. **Never Commit Secrets**: Never commit `.env` files, Google OAuth secrets, or SMTP passwords to version control.
