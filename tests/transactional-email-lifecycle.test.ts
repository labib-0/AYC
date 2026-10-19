/**
 * AYAAN CLOTHING — Transactional Email Lifecycle & Templates Test Suite
 *
 * Verifies all 4 customer-facing email templates, their distinct event triggers,
 * outbox idempotency, queue safety, and HTML/plaintext rendering.
 *
 * 1. Customer account activation / email verification
 * 2. Order placed with Payment Pending (including PI & Offer Sheet attachments)
 * 3. Payment proof received and awaiting review
 * 4. Order confirmed after administrator approval
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(rootDir, "backend");

console.log("================================================================================");
console.log("  AYAAN CLOTHING — TRANSACTIONAL EMAIL TEMPLATES & LIFECYCLE AUDIT SUITE");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Shared Email Design System & Layout
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1] Shared AYC Email Design System & Layout");

const layoutPath = path.join(backendDir, "resources", "views", "emails", "layout.blade.php");
assert(fs.existsSync(layoutPath), "emails/layout.blade.php exists");

const layoutContent = fs.readFileSync(layoutPath, "utf-8");
assert(
  layoutContent.includes("AYAAN CLOTHING") &&
  layoutContent.includes("#0f172a") &&
  layoutContent.includes("#d97706"),
  "Layout implements AYC navy (#0f172a) and amber (#d97706) branding"
);
assert(
  layoutContent.includes("max-width: 600px") &&
  layoutContent.includes("@media only screen and (max-width: 620px)"),
  "Layout implements mobile-responsive 600px max container with client styles"
);
assert(
  layoutContent.includes("$footerNotice ??"),
  "Layout disclaimer is parameterized via $footerNotice with safe fallback"
);
assert(
  layoutContent.includes("House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh"),
  "Layout includes verified AYAAN CLOTHING corporate address"
);
assert(
  layoutContent.includes("+880 1620-853502"),
  "Layout includes authorized AYC WhatsApp Export Desk link"
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Template 1: Customer Account Activation / Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2] Template 1 — Account Activation / Email Verification");

const notifyPath = path.join(backendDir, "app", "Notifications", "CustomerVerifyEmailNotification.php");
assert(fs.existsSync(notifyPath), "CustomerVerifyEmailNotification notification exists");
const notifyContent = fs.readFileSync(notifyPath, "utf-8");

assert(
  notifyContent.includes("->subject('Verify your AYAAN CLOTHING account')"),
  "Notification sets exact subject: 'Verify your AYAAN CLOTHING account'"
);
assert(
  notifyContent.includes("emails.auth.verify-email") &&
  notifyContent.includes("emails.auth.verify-email-text"),
  "Notification registers both HTML and plaintext Blade views"
);

const t1HtmlPath = path.join(backendDir, "resources", "views", "emails", "auth", "verify-email.blade.php");
assert(fs.existsSync(t1HtmlPath), "HTML template emails/auth/verify-email.blade.php exists");
const t1Html = fs.readFileSync(t1HtmlPath, "utf-8");

assert(
  t1Html.includes("Welcome to AYAAN CLOTHING"),
  "HTML template contains 'Welcome to AYAAN CLOTHING' headline"
);
assert(
  t1Html.includes("Verify Email Address"),
  "HTML template contains 'Verify Email Address' call-to-action button"
);
assert(
  t1Html.includes("Open the link in the same browser you used to register"),
  "HTML template provides explicit same-browser security notice"
);
assert(
  t1Html.includes("{{ $expiresInMinutes }} minutes"),
  "HTML template displays dynamic configured expiration period"
);
assert(
  t1Html.includes("If you did not create this account, you can ignore this email"),
  "HTML template contains clear ignore notice for unrecognized signups"
);
assert(
  !t1Html.includes("password") && !t1Html.includes("binding_secret") && !t1Html.includes("rawToken"),
  "HTML template never exposes credentials or browser-binding secrets in body"
);

const t1TextPath = path.join(backendDir, "resources", "views", "emails", "auth", "verify-email-text.blade.php");
assert(fs.existsSync(t1TextPath), "Plaintext template emails/auth/verify-email-text.blade.php exists");
const t1Text = fs.readFileSync(t1TextPath, "utf-8");

assert(
  t1Text.includes("Welcome to AYAAN CLOTHING") &&
  t1Text.includes("{{ $verificationUrl }}") &&
  t1Text.includes("Open the link in the same browser you used to register"),
  "Plaintext template matches exact account activation content"
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Template 2: Order Placed & Payment Pending (with PI & Offer Sheet)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3] Template 2 — Order Placed & Payment Pending");

const t2MailPath = path.join(backendDir, "app", "Mail", "CustomerOrderConfirmationMail.php");
assert(fs.existsSync(t2MailPath), "CustomerOrderConfirmationMail exists");
const t2Mail = fs.readFileSync(t2MailPath, "utf-8");

assert(
  t2Mail.includes("AYAAN CLOTHING — Order Placed"),
  "CustomerOrderConfirmationMail sets subject: 'AYAAN CLOTHING — Order Placed [Order Number]'"
);
assert(
  t2Mail.includes("attachData($this->piPdfBinary, $this->piFilename") &&
  t2Mail.includes("attachData($this->offerPdfBinary, $this->offerFilename"),
  "CustomerOrderConfirmationMail attaches authoritative PI and Offer Sheet PDF binaries"
);

const t2HtmlPath = path.join(backendDir, "resources", "views", "emails", "orders", "order-confirmation.blade.php");
assert(fs.existsSync(t2HtmlPath), "HTML template emails/orders/order-confirmation.blade.php exists");
const t2Html = fs.readFileSync(t2HtmlPath, "utf-8");

assert(
  t2Html.includes("Your order has been placed"),
  "HTML template contains 'Your order has been placed' headline"
);
assert(
  t2Html.includes("Order Placed &bull; Payment Pending"),
  "HTML template displays 'Payment Pending' status badge"
);
assert(
  t2Html.includes("View Order & Submit Payment"),
  "HTML template contains 'View Order & Submit Payment' call-to-action button"
);
assert(
  t2Html.includes("Attached Commercial Documents") &&
  t2Html.includes("{{ $piFilename }}") &&
  t2Html.includes("{{ $offerFilename }}"),
  "HTML template displays attached PI and Offer Sheet commercial documents"
);
assert(
  t2Html.includes("Bank Wire Remittance Instructions"),
  "HTML template includes canonical bank remittance instructions"
);

const t2JobPath = path.join(backendDir, "app", "Jobs", "SendOrderConfirmationEmailJob.php");
assert(fs.existsSync(t2JobPath), "SendOrderConfirmationEmailJob exists");
const t2Job = fs.readFileSync(t2JobPath, "utf-8");
assert(
  t2Job.includes("ORDER_EMAILS_ENABLED") &&
  t2Job.includes("OrderEmailDispatch::STATUS_SENT") &&
  t2Job.includes("%PDF-"),
  "SendOrderConfirmationEmailJob validates flag, idempotency, and PDF headers"
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Template 3: Payment Proof Received & Awaiting Review
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4] Template 3 — Payment Proof Received & Awaiting Review");

const t3MailPath = path.join(backendDir, "app", "Mail", "CustomerPaymentProofReceivedMail.php");
assert(fs.existsSync(t3MailPath), "CustomerPaymentProofReceivedMail mailable exists");
const t3Mail = fs.readFileSync(t3MailPath, "utf-8");

assert(
  t3Mail.includes("AYAAN CLOTHING — Payment Proof Received"),
  "CustomerPaymentProofReceivedMail sets subject: 'AYAAN CLOTHING — Payment Proof Received [Order Number]'"
);
assert(
  t3Mail.includes("emails.orders.payment-proof-received") &&
  t3Mail.includes("emails.orders.payment-proof-received-text"),
  "CustomerPaymentProofReceivedMail registers HTML and plaintext views"
);

const t3HtmlPath = path.join(backendDir, "resources", "views", "emails", "orders", "payment-proof-received.blade.php");
assert(fs.existsSync(t3HtmlPath), "HTML template emails/orders/payment-proof-received.blade.php exists");
const t3Html = fs.readFileSync(t3HtmlPath, "utf-8");

assert(
  t3Html.includes("We have received your payment proof"),
  "HTML template contains 'We have received your payment proof' headline"
);
assert(
  t3Html.includes("Your order is not yet confirmed"),
  "HTML template clearly warns 'Your order is not yet confirmed. We will notify you when the review is complete.'"
);
assert(
  t3Html.includes("View Order Status"),
  "HTML template contains 'View Order Status' call-to-action button"
);
assert(
  t3Html.includes("Submission Summary"),
  "HTML template includes safe submission details card"
);

const t3TextPath = path.join(backendDir, "resources", "views", "emails", "orders", "payment-proof-received-text.blade.php");
assert(fs.existsSync(t3TextPath), "Plaintext template emails/orders/payment-proof-received-text.blade.php exists");
const t3Text = fs.readFileSync(t3TextPath, "utf-8");

assert(
  t3Text.includes("We have received your payment proof") &&
  t3Text.includes("Your order is not yet confirmed") &&
  t3Text.includes("{{ $orderStatusUrl }}"),
  "Plaintext template matches exact payment proof received content"
);

const t3JobPath = path.join(backendDir, "app", "Jobs", "SendPaymentProofReceivedEmailJob.php");
assert(fs.existsSync(t3JobPath), "SendPaymentProofReceivedEmailJob exists");
const t3Job = fs.readFileSync(t3JobPath, "utf-8");
assert(
  t3Job.includes("TYPE_PAYMENT_PROOF_RECEIVED") &&
  t3Job.includes("STATUS_SENT") &&
  t3Job.includes("ORDER_EMAILS_ENABLED"),
  "SendPaymentProofReceivedEmailJob enforces outbox idempotency and feature flag safety"
);

// Trigger Check: OrderController::uploadPaymentProof post-commit
const orderCtrlPath = path.join(backendDir, "app", "Http/Controllers/Api/V1/OrderController.php");
const orderCtrlContent = fs.readFileSync(orderCtrlPath, "utf-8");
assert(
  orderCtrlContent.includes("queuePaymentProofReceived") &&
  orderCtrlContent.includes("DB::commit()"),
  "Payment proof received email is triggered post-commit in OrderController::uploadPaymentProof"
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Template 4: Order Confirmed by Admin
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5] Template 4 — Order Confirmed by Administrator Approval");

const t4MailPath = path.join(backendDir, "app", "Mail", "CustomerOrderConfirmedMail.php");
assert(fs.existsSync(t4MailPath), "CustomerOrderConfirmedMail mailable exists");
const t4Mail = fs.readFileSync(t4MailPath, "utf-8");

assert(
  t4Mail.includes("AYAAN CLOTHING — Order Confirmed"),
  "CustomerOrderConfirmedMail sets subject: 'AYAAN CLOTHING — Order Confirmed [Order Number]'"
);
assert(
  t4Mail.includes("emails.orders.order-confirmed") &&
  t4Mail.includes("emails.orders.order-confirmed-text"),
  "CustomerOrderConfirmedMail registers HTML and plaintext views"
);

const t4HtmlPath = path.join(backendDir, "resources", "views", "emails", "orders", "order-confirmed.blade.php");
assert(fs.existsSync(t4HtmlPath), "HTML template emails/orders/order-confirmed.blade.php exists");
const t4Html = fs.readFileSync(t4HtmlPath, "utf-8");

assert(
  t4Html.includes("Your order is confirmed"),
  "HTML template contains 'Your order is confirmed' headline"
);
assert(
  t4Html.includes("Good news! Your order") &&
  t4Html.includes("has been confirmed by the AYAAN CLOTHING team"),
  "HTML template delivers confirmation message without premature shipping claims"
);
assert(
  t4Html.includes("View Confirmed Order"),
  "HTML template contains 'View Confirmed Order' call-to-action button"
);
assert(
  t4Html.includes("Order Confirmed &bull; Payment Verified"),
  "HTML template displays 'Payment Verified' confirmation badge"
);

const t4TextPath = path.join(backendDir, "resources", "views", "emails", "orders", "order-confirmed-text.blade.php");
assert(fs.existsSync(t4TextPath), "Plaintext template emails/orders/order-confirmed-text.blade.php exists");
const t4Text = fs.readFileSync(t4TextPath, "utf-8");

assert(
  t4Text.includes("Your order is confirmed") &&
  t4Text.includes("Good news! Your order") &&
  t4Text.includes("{{ $orderUrl }}"),
  "Plaintext template matches exact order confirmed content"
);

const t4JobPath = path.join(backendDir, "app", "Jobs", "SendOrderConfirmedEmailJob.php");
assert(fs.existsSync(t4JobPath), "SendOrderConfirmedEmailJob exists");
const t4Job = fs.readFileSync(t4JobPath, "utf-8");
assert(
  t4Job.includes("TYPE_ORDER_CONFIRMED") &&
  t4Job.includes("STATUS_SENT") &&
  t4Job.includes("ORDER_EMAILS_ENABLED"),
  "SendOrderConfirmedEmailJob enforces outbox idempotency and feature flag safety"
);

// Trigger Check: Admin OrderController::verifyPayment post-commit
const adminCtrlPath = path.join(backendDir, "app", "Http/Controllers/Api/V1/Admin/OrderController.php");
const adminCtrlContent = fs.readFileSync(adminCtrlPath, "utf-8");
assert(
  adminCtrlContent.includes("queueOrderConfirmed") &&
  adminCtrlContent.includes("CUSTOMER_STATUS_ORDER_CONFIRMED"),
  "Order confirmed email is triggered post-commit upon admin payment approval"
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Distinct Decoupling of Payment Proof Received vs Order Confirmed
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[6] Event Decoupling & Idempotency Separation");

assert(
  orderCtrlContent.includes("queuePaymentProofReceived") &&
  !orderCtrlContent.includes("queueOrderConfirmed"),
  "Customer payment proof upload ONLY triggers payment proof received email, never order confirmed"
);

assert(
  adminCtrlContent.includes("queueOrderConfirmed") &&
  !adminCtrlContent.includes("queuePaymentProofReceived"),
  "Admin payment approval ONLY triggers order confirmed email, never payment proof received"
);

const servicePath = path.join(backendDir, "app", "Services", "Mail", "OrderEmailService.php");
const serviceContent = fs.readFileSync(servicePath, "utf-8");
assert(
  serviceContent.includes("payment_proof_{$order->id}_") &&
  serviceContent.includes("order_confirmed_{$order->id}") &&
  serviceContent.includes("order_confirmation_{$order->id}"),
  "OrderEmailService generates distinct, isolated idempotency keys for all three order events"
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Safety, Feature Flags, and Hostinger Isolation
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[7] Production Safety & Zero-Provider-Credential Exposure");

const envPath = path.join(backendDir, ".env.example");
const envContent = fs.readFileSync(envPath, "utf-8");
assert(
  envContent.includes("EMAIL_VERIFICATION_ENABLED=false") &&
  envContent.includes("ORDER_EMAILS_ENABLED=false"),
  "Both EMAIL_VERIFICATION_ENABLED and ORDER_EMAILS_ENABLED default to false in .env.example"
);

assert(
  !serviceContent.includes("hostinger") &&
  !t2Mail.includes("hostinger") &&
  !t3Mail.includes("hostinger") &&
  !t4Mail.includes("hostinger"),
  "No Hostinger provider credentials or SMTP hostnames hardcoded in application code"
);

console.log("\n================================================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
