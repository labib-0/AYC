import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("AYC Offer Sheet Complete Lifecycle Architecture Verification", () => {
  const rootDir = process.cwd();

  it("Product model includes booted hooks and afterCommit Offer Sheet scheduling", () => {
    const productModelPath = path.join(rootDir, "backend/app/Models/Product.php");
    const content = fs.readFileSync(productModelPath, "utf-8");

    // Must have static booted hook
    assert.ok(content.includes("static::saved("), "Product booted hook registers static::saved");
    assert.ok(content.includes("static::scheduleOfferSheetRegeneration("), "Product registers Offer Sheet regeneration schedule");

    // Must implement scheduleOfferSheetRegeneration with DB::afterCommit
    assert.ok(content.includes("public static function scheduleOfferSheetRegeneration(int $productId): void"), "Product has scheduleOfferSheetRegeneration");
    assert.ok(content.includes("DB::afterCommit("), "scheduleOfferSheetRegeneration wraps in DB::afterCommit");
    assert.ok(content.includes("GenerateProductOfferSheetJob::dispatch("), "Dispatches GenerateProductOfferSheetJob");

    // Must deduplicate scheduling per-request to prevent stampedes
    assert.ok(content.includes("static::$offerSheetScheduledIds"), "Deduplicates scheduled IDs at static request level");
  });

  it("ProductPricingTier model schedules Offer Sheet regeneration on save and delete", () => {
    const tierModelPath = path.join(rootDir, "backend/app/Models/ProductPricingTier.php");
    const content = fs.readFileSync(tierModelPath, "utf-8");

    assert.ok(content.includes("protected static function booted(): void"), "Pricing tier defines booted()");
    assert.ok(content.includes("static::saved("), "Pricing tier has saved hook");
    assert.ok(content.includes("static::deleted("), "Pricing tier has deleted hook");
    assert.ok(content.includes("Product::scheduleOfferSheetRegeneration("), "Calls Product::scheduleOfferSheetRegeneration");
  });

  it("ProductImage model schedules Offer Sheet regeneration on save and delete", () => {
    const imageModelPath = path.join(rootDir, "backend/app/Models/ProductImage.php");
    const content = fs.readFileSync(imageModelPath, "utf-8");

    assert.ok(content.includes("protected static function booted(): void"), "ProductImage defines booted()");
    assert.ok(content.includes("static::saved("), "ProductImage has saved hook");
    assert.ok(content.includes("static::deleted("), "ProductImage has deleted hook");
    assert.ok(content.includes("Product::scheduleOfferSheetRegeneration("), "Calls Product::scheduleOfferSheetRegeneration");
  });

  it("ProductOfferSheetService re-fetches product and fingerprint inside concurrency lock", () => {
    const servicePath = path.join(rootDir, "backend/app/Services/Documents/ProductOfferSheetService.php");
    const content = fs.readFileSync(servicePath, "utf-8");

    // Concurrency lock pattern
    assert.ok(content.includes("Cache::lock("), "Uses Cache::lock for concurrency safety");
    assert.ok(content.includes("$product->refresh()"), "Refreshes product model inside concurrency lock");
    assert.ok(content.includes("$product->load(['images', 'brand', 'pricingTiers', 'shippingPackageProfiles'])"), "Reloads relations inside lock");
    assert.ok(content.includes("$fingerprint = $this->computeFingerprint($product)"), "Recomputes fingerprint so latest state always wins");

    // checkReadiness method
    assert.ok(content.includes("public function checkReadiness("), "Defines checkReadiness");
    assert.ok(content.includes("'ready_count'"), "Returns ready_count");
    assert.ok(content.includes("'pending_products'"), "Returns pending_products");

    // mergeProductsOfferSheets naming with count
    assert.ok(content.includes("AYC_Combined_Offer_Sheets_{$count}_Products"), "Includes product count in merged filename");
  });

  it("ProductController implements offerSheet status_only and bulkOfferSheet endpoints", () => {
    const controllerPath = path.join(rootDir, "backend/app/Http/Controllers/Api/V1/ProductController.php");
    const content = fs.readFileSync(controllerPath, "utf-8");

    // Single product status_only check
    assert.ok(content.includes("public function offerSheet(Request $request, string $slugOrId)"), "Defines offerSheet endpoint");
    assert.ok(content.includes("$request->boolean('status_only')"), "Supports status_only query parameter");
    assert.ok(content.includes("'is_processing'"), "Returns is_processing boolean");
    assert.ok(content.includes("'has_artifact'"), "Returns has_artifact boolean");
    assert.ok(content.includes("'is_stale'"), "Returns is_stale boolean");

    // Bulk Offer Sheet endpoint
    assert.ok(content.includes("public function bulkOfferSheet(Request $request)"), "Defines bulkOfferSheet endpoint");
    assert.ok(content.includes("'product_ids' => ['required_without:skus', 'array', 'min:1', 'max:100']"), "Validates product_ids array");
    assert.ok(content.includes("check_only"), "Supports check_only readiness polling");
    assert.ok(content.includes("GenerateProductOfferSheetJob::dispatch("), "Dispatches generation jobs for pending products");
    assert.ok(content.includes("$service->mergeProductsOfferSheets($orderedProducts)"), "Merges products in user-specified order");
  });

  it("PregenerateProductOfferSheetsCommand supports reconcile options, aliases, and memory recycling", () => {
    const cmdPath = path.join(rootDir, "backend/app/Console/Commands/PregenerateProductOfferSheetsCommand.php");
    const content = fs.readFileSync(cmdPath, "utf-8");

    assert.ok(content.includes("products:reconcile-offer-sheets"), "Defines products:reconcile-offer-sheets alias");
    assert.ok(content.includes("{--queue"), "Defines --queue option");
    assert.ok(content.includes("{--dry-run"), "Defines --dry-run option");
    assert.ok(content.includes("{--chunk="), "Defines --chunk= option");
    assert.ok(content.includes("gc_collect_cycles()"), "Executes gc_collect_cycles() after chunks");
  });

  it("Admin UI ProductBulkActions provides Download Combined Offer Sheet button", () => {
    const bulkActionsPath = path.join(rootDir, "src/components/admin/products/ProductBulkActions.tsx");
    const content = fs.readFileSync(bulkActionsPath, "utf-8");

    assert.ok(content.includes("onBulkOfferSheet?: () => void;"), "Accepts onBulkOfferSheet prop");
    assert.ok(content.includes("offerSheetLoading?: boolean;"), "Accepts offerSheetLoading prop");
    assert.ok(content.includes("Download Combined Offer Sheet"), "Renders Download Combined Offer Sheet button");
    assert.ok(content.includes("btn-bulk-offer-sheet"), "Includes btn-bulk-offer-sheet id");
  });

  it("Admin Products page maintains ordered selection and integrates bulk Offer Sheet generation", () => {
    const pagePath = path.join(rootDir, "src/app/ayc/products/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.ok(content.includes("const [bulkOfferSheetLoading, setBulkOfferSheetLoading] = useState(false);"), "Tracks bulkOfferSheetLoading");
    assert.ok(content.includes("const handleBulkOfferSheet = async () => {"), "Defines handleBulkOfferSheet");
    assert.ok(content.includes("/products/bulk-offer-sheet"), "Calls /products/bulk-offer-sheet");
    assert.ok(content.includes("check_only: true"), "Uses check_only polling before download");
    assert.ok(content.includes("onBulkOfferSheet={handleBulkOfferSheet}"), "Passes onBulkOfferSheet to ProductBulkActions");
    assert.ok(content.includes("offerSheetLoading={bulkOfferSheetLoading}"), "Passes offerSheetLoading to ProductBulkActions");
  });

  it("ProductOfferSheetModal checks status first, displays progress, and offers retry on error", () => {
    const modalPath = path.join(rootDir, "src/components/admin/products/ProductOfferSheetModal.tsx");
    const content = fs.readFileSync(modalPath, "utf-8");

    assert.ok(content.includes("status_only=1"), "Checks status_only=1 first");
    assert.ok(content.includes("is_processing"), "Handles is_processing state");
    assert.ok(content.includes("Retry Generation"), "Provides Retry Generation button");
    assert.ok(content.includes("Fast Persisted View"), "Displays fast persisted view indicator on cache hit");
  });
});
