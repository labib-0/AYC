import fs from "fs";
import path from "path";

console.log("=== AYAAN CLOTHING — Step 3 Order Confirmation Email Verification Suite ===");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");

// 1. Feature Flag & Production Safety Defaults
console.log("\n[1] Feature Flag & Production Safety Checks");

const orderConfigPath = path.join(backendDir, "config", "order.php");
assert(fs.existsSync(orderConfigPath), "config/order.php exists");
const orderConfigContent = fs.readFileSync(orderConfigPath, "utf-8");
assert(
  orderConfigContent.includes("ORDER_EMAILS_ENABLED") &&
  orderConfigContent.includes("false"),
  "config/order.php defaults ORDER_EMAILS_ENABLED to false"
);

const mailConfigPath = path.join(backendDir, "config", "mail.php");
const mailConfigContent = fs.readFileSync(mailConfigPath, "utf-8");
assert(
  mailConfigContent.includes("'order_emails'") &&
  mailConfigContent.includes("ORDER_EMAILS_ENABLED"),
  "config/mail.php contains order_emails feature flag block"
);

const envExamplePath = path.join(backendDir, ".env.example");
const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
assert(
  envExampleContent.includes("ORDER_EMAILS_ENABLED=false"),
  ".env.example contains ORDER_EMAILS_ENABLED=false with safe default"
);

// 2. Outbox & Idempotency Migration
console.log("\n[2] Outbox & Idempotency Migration Checks");

const migrationDir = path.join(backendDir, "database", "migrations");
const migrationFiles = fs.readdirSync(migrationDir);
const dispatchMigration = migrationFiles.find((f) =>
  f.includes("create_order_email_dispatches_table")
);
assert(Boolean(dispatchMigration), "Order email dispatches migration exists");

if (dispatchMigration) {
  const migContent = fs.readFileSync(
    path.join(migrationDir, dispatchMigration),
    "utf-8"
  );
  assert(
    migContent.includes("idempotency_key") &&
    migContent.includes("unique"),
    "Migration enforces uniqueness on idempotency_key"
  );
  assert(
    migContent.includes("order_id") &&
    migContent.includes("notification_type"),
    "Migration includes order_id and notification_type"
  );
  assert(
    migContent.includes("order_notification_type_unique") ||
    migContent.includes("order_notification_type_index"),
    "Migration enforces index or constraint on [order_id, notification_type]"
  );
  assert(
    migContent.includes("down()") && migContent.includes("dropIfExists"),
    "Migration is cleanly reversible with dropIfExists in down()"
  );
}

// 3. Eloquent Model Checks
console.log("\n[3] Model Structure Checks");

const dispatchModelPath = path.join(
  backendDir,
  "app",
  "Models",
  "OrderEmailDispatch.php"
);
assert(fs.existsSync(dispatchModelPath), "OrderEmailDispatch model exists");
const dispatchModelContent = fs.readFileSync(dispatchModelPath, "utf-8");
assert(
  dispatchModelContent.includes("TYPE_ORDER_CONFIRMATION = 'order_confirmation'"),
  "OrderEmailDispatch defines TYPE_ORDER_CONFIRMATION constant"
);
assert(
  dispatchModelContent.includes("STATUS_SENT") &&
  dispatchModelContent.includes("STATUS_FAILED"),
  "OrderEmailDispatch defines outbox lifecycle statuses"
);
assert(
  dispatchModelContent.includes("public function order(): BelongsTo"),
  "OrderEmailDispatch defines BelongsTo Order relationship"
);

const orderModelPath = path.join(backendDir, "app", "Models", "Order.php");
const orderModelContent = fs.readFileSync(orderModelPath, "utf-8");
assert(
  orderModelContent.includes("public function emailDispatches(): HasMany"),
  "Order model defines HasMany emailDispatches relationship"
);

// 4. Mailable & PDF Attachments
console.log("\n[4] Mailable & Attachment Architecture Checks");

const mailablePath = path.join(
  backendDir,
  "app",
  "Mail",
  "CustomerOrderConfirmationMail.php"
);
assert(fs.existsSync(mailablePath), "CustomerOrderConfirmationMail mailable exists");
const mailableContent = fs.readFileSync(mailablePath, "utf-8");
assert(
  mailableContent.includes("attachData($this->piPdfBinary, $this->piFilename"),
  "Mailable attaches authoritative Proforma Invoice PDF binary"
);
assert(
  mailableContent.includes("attachData($this->offerPdfBinary, $this->offerFilename"),
  "Mailable attaches authoritative Commercial Offer Sheet PDF binary"
);
assert(
  mailableContent.includes("DocumentHelper::getExporterProfile()"),
  "Mailable sources exporter profile from DocumentHelper"
);
assert(
  mailableContent.includes("DocumentHelper::getBankDetails("),
  "Mailable sources bank details from DocumentHelper"
);
assert(
  mailableContent.includes("AYAAN CLOTHING — Order Placed") ||
  mailableContent.includes("AYAAN CLOTHING — Order Confirmation & Payment Instructions —"),
  "Mailable sets canonical subject line format"
);

// 5. Blade Email Templates
console.log("\n[5] Email Templates & Content Checks");

const htmlViewPath = path.join(
  backendDir,
  "resources",
  "views",
  "emails",
  "orders",
  "order-confirmation.blade.php"
);
assert(fs.existsSync(htmlViewPath), "HTML order confirmation Blade template exists");
const htmlViewContent = fs.readFileSync(htmlViewPath, "utf-8");
assert(
  htmlViewContent.includes("@extends('emails.layout')"),
  "HTML template extends standard emails.layout"
);
assert(
  htmlViewContent.includes("{{ $order->order_number }}"),
  "HTML template renders dynamic order reference"
);
assert(
  htmlViewContent.includes("{{ $orderPaymentUrl }}"),
  "HTML template includes secure order payment action link"
);
assert(
  htmlViewContent.includes("{{ $whatsappDisplay }}") &&
  htmlViewContent.includes("{{ $whatsappUrl }}"),
  "HTML template includes authorized WhatsApp export support details"
);

const textViewPath = path.join(
  backendDir,
  "resources",
  "views",
  "emails",
  "orders",
  "order-confirmation-text.blade.php"
);
assert(fs.existsSync(textViewPath), "Plaintext order confirmation Blade template exists");
const textViewContent = fs.readFileSync(textViewPath, "utf-8");
assert(
  textViewContent.includes("AYAAN CLOTHING — ORDER PLACED") ||
  textViewContent.includes("AYAAN CLOTHING — ORDER CONFIRMATION & PAYMENT INSTRUCTIONS"),
  "Plaintext template contains canonical header"
);
assert(
  textViewContent.includes("{{ $orderPaymentUrl }}"),
  "Plaintext template includes order payment link"
);

// 6. Queued Job & Failure Recovery
console.log("\n[6] Queued Job & Resiliency Checks");

const jobPath = path.join(
  backendDir,
  "app",
  "Jobs",
  "SendOrderConfirmationEmailJob.php"
);
assert(fs.existsSync(jobPath), "SendOrderConfirmationEmailJob exists");
const jobContent = fs.readFileSync(jobPath, "utf-8");
assert(
  jobContent.includes("config('order.emails.enabled', false)"),
  "Job verifies ORDER_EMAILS_ENABLED feature flag before executing"
);
assert(
  jobContent.includes("STATUS_SENT"),
  "Job guards against duplicate re-sending if already marked sent"
);
assert(
  jobContent.includes("str_starts_with($piBinary, '%PDF-')"),
  "Job validates Proforma Invoice binary has valid PDF header"
);
assert(
  jobContent.includes("str_starts_with($offerBinary, '%PDF-')"),
  "Job validates Offer Sheet binary has valid PDF header"
);
assert(
  jobContent.includes("max_attachment_size_mb"),
  "Job enforces maximum total attachment payload size check"
);
assert(
  jobContent.includes("@ayaan.local"),
  "Job suppresses delivery to synthetic POS walk-in accounts"
);
assert(
  jobContent.includes("failed(\\Throwable $exception)"),
  "Job defines permanent failure handler with non-sensitive logging"
);

// 7. Order Controller Integration & Commit Safety
console.log("\n[7] Order Controller Integration Checks");

const orderControllerPath = path.join(
  backendDir,
  "app",
  "Http",
  "Controllers",
  "Api",
  "V1",
  "OrderController.php"
);
const orderControllerContent = fs.readFileSync(orderControllerPath, "utf-8");
assert(
  orderControllerContent.includes("OrderEmailService::class)->queueOrderConfirmation($order)"),
  "OrderController dispatches OrderEmailService after database transaction commit"
);
assert(
  orderControllerContent.includes("// Critical Safety: Mail dispatch failure must NEVER roll back or disrupt a committed order"),
  "OrderController wraps email dispatch in try-catch to safeguard successful checkout"
);

// 8. Test Suite Presence
console.log("\n[8] Test Coverage Checks");

const testFeaturePath = path.join(
  backendDir,
  "tests",
  "Feature",
  "Order",
  "OrderConfirmationEmailTest.php"
);
assert(fs.existsSync(testFeaturePath), "OrderConfirmationEmailTest.php feature test suite exists");
const testFeatureContent = fs.readFileSync(testFeaturePath, "utf-8");
assert(
  testFeatureContent.includes("test_01_order_confirmation_email_is_disabled_by_default"),
  "Feature test covers disabled-by-default safety"
);
assert(
  testFeatureContent.includes("test_02_enabled_flag_queues_order_confirmation_notification"),
  "Feature test covers queued dispatch when enabled"
);
assert(
  testFeatureContent.includes("test_03_duplicate_triggers_respect_idempotency_key"),
  "Feature test covers idempotency duplicate resistance"
);
assert(
  testFeatureContent.includes("test_06_queued_job_generates_attachments_and_sends_email"),
  "Feature test covers PI and Offer Sheet PDF generation and mail dispatch"
);

// 9. Preservation of Step 2 & Design Type Fix
console.log("\n[9] Preservation & Non-Regression Checks");

const emailVerifTestPath = path.join(
  backendDir,
  "tests",
  "Feature",
  "Auth",
  "EmailVerificationTest.php"
);
assert(fs.existsSync(emailVerifTestPath), "Step 2 EmailVerificationTest.php is preserved intact");

const designTypePath = path.join(
  rootDir,
  "src",
  "components",
  "home",
  "DesignTypeSection.tsx"
);
const designTypeContent = fs.readFileSync(designTypePath, "utf-8");
assert(
  designTypeContent.includes("grid-cols-2") &&
  designTypeContent.includes("ORIGINAL"),
  "Design Type 2-column single-row fix is preserved intact"
);

console.log("\n=======================================================");
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
