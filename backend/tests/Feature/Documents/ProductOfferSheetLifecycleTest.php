<?php

namespace Tests\Feature\Documents;

use App\Jobs\GenerateProductOfferSheetJob;
use App\Models\Product;
use App\Models\ProductOfferSheet;
use App\Models\User;
use App\Services\Documents\ProductOfferSheetService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductOfferSheetLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private ProductOfferSheetService $offerSheetService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->admin = User::factory()->create([
            'name' => 'Commercial Director',
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'International Buyer',
            'email' => 'buyer@globalapparel.test',
            'role' => 'customer',
        ]);

        $this->offerSheetService = app(ProductOfferSheetService::class);
        Storage::fake('local');
    }

    /**
     * Requirement 1 & 2:
     * Creating a product (including draft) records a pending artifact and triggers generation.
     */
    public function test_1_2_product_creation_records_pending_and_triggers_generation_for_draft_and_published(): void
    {
        Queue::fake([GenerateProductOfferSheetJob::class]);

        $payload = [
            'product_id' => 'AYC-SHI-1001',
            'name' => "Men's Oxford Button-Down Shirt",
            'sku' => 'SHI-OXF-MEN-1001',
            'wholesale_price' => 7.50,
            'cost_price' => 4.20,
            'moq' => 50,
            'status' => 'draft',
            'material' => '100% Combed Cotton Oxford',
            'fabric' => '100% Combed Cotton Oxford',
            'design_type' => 'Original Design',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $productId = $response->json('data.id');
        $this->assertNotNull($productId);

        // Verify GenerateProductOfferSheetJob was dispatched even for draft product
        Queue::assertPushed(GenerateProductOfferSheetJob::class, function ($job) use ($productId) {
            return $job->productId === $productId;
        });

        // Verify ProductOfferSheet database record exists in pending status
        $this->assertDatabaseHas('product_offer_sheets', [
            'product_id' => $productId,
            'status' => ProductOfferSheet::STATUS_PENDING,
            'filename' => 'Offer-Sheet-SHI-OXF-MEN-1001.pdf',
        ]);
    }

    /**
     * Requirement 3:
     * Editing a rendered product field schedules a new version with a new fingerprint.
     */
    public function test_3_editing_rendered_product_field_schedules_new_version(): void
    {
        Queue::fake([GenerateProductOfferSheetJob::class]);

        $product = Product::factory()->create([
            'name' => "Classic Cargo Shorts",
            'sku' => 'SHO-CAR-MEN-1002',
            'wholesale_price' => 5.25,
            'moq' => 100,
            'status' => 'published',
        ]);

        $initialFingerprint = $this->offerSheetService->computeFingerprint($product);

        // Simulate existing ready record
        ProductOfferSheet::create([
            'product_id' => $product->id,
            'sku' => $product->sku,
            'status' => ProductOfferSheet::STATUS_READY,
            'fingerprint' => $initialFingerprint,
            'file_path' => "product_offer_sheets/{$product->id}/OFFER_SHEET_{$initialFingerprint}.pdf",
            'filename' => "Offer-Sheet-SHO-CAR-MEN-1002.pdf",
            'filesize_bytes' => 124500,
            'checksum_sha256' => hash('sha256', 'mock_pdf_content'),
            'generated_at' => now(),
        ]);

        // Edit price and MOQ
        $updateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'wholesale_price' => 5.85,
                'moq' => 120,
            ]);

        $updateResponse->assertStatus(200);

        // Verify fresh fingerprint was generated and job was dispatched with force=true
        Queue::assertPushed(GenerateProductOfferSheetJob::class, function ($job) use ($product) {
            return $job->productId === $product->id && $job->force === true;
        });

        $updatedProduct = Product::find($product->id);
        $newFingerprint = $this->offerSheetService->computeFingerprint($updatedProduct);
        $this->assertNotEquals($initialFingerprint, $newFingerprint);

        // Verify DB record status updated to processing with new fingerprint
        $sheet = ProductOfferSheet::where('product_id', $product->id)->first();
        $this->assertEquals(ProductOfferSheet::STATUS_PROCESSING, $sheet->status);
        $this->assertEquals($newFingerprint, $sheet->fingerprint);
    }

    /**
     * Requirement 4:
     * The resulting PDF is valid, persisted on disk, and associated with the correct product and fingerprint.
     */
    public function test_4_resulting_pdf_is_valid_persisted_and_associated_with_correct_product_and_fingerprint(): void
    {
        $product = Product::factory()->create([
            'name' => "Premium Heavyweight Hoodie",
            'sku' => 'HOD-HVY-MEN-1004',
            'wholesale_price' => 14.50,
            'moq' => 60,
            'status' => 'published',
        ]);

        $result = $this->offerSheetService->getOrGenerate($product, true);

        // Verify valid PDF structure
        $this->assertNotEmpty($result['content']);
        $this->assertTrue($this->offerSheetService->isPdfValid($result['content']));
        $this->assertStringStartsWith('%PDF-', $result['content']);
        $this->assertStringContainsString('%%EOF', $result['content']);

        // Verify persisted on local disk
        $sheet = ProductOfferSheet::where('product_id', $product->id)->first();
        $this->assertNotNull($sheet);
        $this->assertEquals(ProductOfferSheet::STATUS_READY, $sheet->status);
        $this->assertTrue(Storage::disk('local')->exists($sheet->file_path));

        // Verify associated with product, fingerprint, and checksum
        $expectedFingerprint = $this->offerSheetService->computeFingerprint($product);
        $this->assertEquals($expectedFingerprint, $sheet->fingerprint);
        $this->assertEquals(hash('sha256', $result['content']), $sheet->checksum_sha256);
        $this->assertEquals(strlen($result['content']), $sheet->filesize_bytes);
    }

    /**
     * Requirement 5:
     * A current artifact is reused (cache hit), while a stale artifact triggers regeneration.
     */
    public function test_5_current_artifact_is_reused_while_stale_artifact_triggers_regeneration(): void
    {
        $product = Product::factory()->create([
            'name' => "Stretch Denim Jeans",
            'sku' => 'PAN-JEA-MEN-1005',
            'wholesale_price' => 8.50,
            'moq' => 80,
            'status' => 'published',
        ]);

        // First run: Cache MISS (generated)
        $first = $this->offerSheetService->getOrGenerate($product, false);
        $this->assertFalse($first['is_hit']);

        // Second run: Cache HIT (reused from disk without re-rendering)
        $second = $this->offerSheetService->getOrGenerate($product, false);
        $this->assertTrue($second['is_hit']);
        $this->assertEquals($first['hash'], $second['hash']);

        // Mutate rendered property to make artifact stale
        $product->update(['wholesale_price' => 9.25]);

        // Third run: Detects stale fingerprint, generates fresh artifact
        $third = $this->offerSheetService->getOrGenerate($product->fresh(), false);
        $this->assertFalse($third['is_hit']);
        $this->assertNotEquals($first['hash'], $third['hash']);
    }

    /**
     * Requirement 6:
     * The Offer Sheet endpoint streams the PDF with correct content type and filename.
     */
    public function test_6_offer_sheet_endpoint_streams_pdf_with_correct_content_type_and_filename(): void
    {
        $product = Product::factory()->create([
            'name' => "Pique Polo Shirt",
            'sku' => 'POL-PIQ-MEN-1006',
            'wholesale_price' => 4.20,
            'moq' => 50,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->get("/api/v1/products/{$product->id}/offer-sheet?format=pdf");

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Offer-Sheet-POL-PIQ-MEN-1006.pdf', (string) $response->headers->get('Content-Disposition'));
        $this->assertNotEmpty($response->headers->get('X-PDF-Hash'));

        $content = $response->getContent();
        $this->assertStringStartsWith('%PDF-', $content);
        $this->assertStringContainsString('%%EOF', $content);
    }

    /**
     * Requirement 7:
     * Authorization prevents unauthorized document access.
     */
    public function test_7_authorization_prevents_unauthorized_document_access(): void
    {
        $draftProduct = Product::factory()->create([
            'name' => "Unpublished Sample Hooded Sweatshirt",
            'sku' => 'SWT-HOD-MEN-1007',
            'wholesale_price' => 9.00,
            'status' => 'draft',
        ]);

        // 1. Unauthenticated -> 404
        $guestRes = $this->getJson("/api/v1/products/{$draftProduct->id}/offer-sheet");
        $guestRes->assertStatus(404);

        // 2. Customer -> 404
        $customerRes = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/products/{$draftProduct->id}/offer-sheet");
        $customerRes->assertStatus(404);

        // 3. Admin -> 200 (allowed to view/prepare Offer Sheet for draft product)
        $adminRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/products/{$draftProduct->id}/offer-sheet?status_only=1");
        $adminRes->assertStatus(200);
    }

    /**
     * Requirement 8:
     * Failed generation does not remove the last valid artifact or corrupt product data.
     */
    public function test_8_failed_generation_does_not_remove_last_valid_artifact_or_corrupt_product(): void
    {
        $product = Product::factory()->create([
            'name' => "Rugged Workwear Jacket",
            'sku' => 'JAC-RUG-MEN-1008',
            'wholesale_price' => 18.50,
            'moq' => 40,
            'status' => 'published',
        ]);

        // First, generate a valid initial artifact
        $initialResult = $this->offerSheetService->getOrGenerate($product, true);
        $this->assertTrue($this->offerSheetService->isPdfValid($initialResult['content']));

        $sheet = ProductOfferSheet::where('product_id', $product->id)->first();
        $validFilePath = $sheet->file_path;
        $this->assertTrue(Storage::disk('local')->exists($validFilePath));

        // Invoke markFailed reflection to simulate unexpected rendering failure on subsequent job
        $method = new \ReflectionMethod(ProductOfferSheetService::class, 'markFailed');
        $method->setAccessible(true);
        $method->invoke($this->offerSheetService, $product, 'corrupt_fingerprint', $sheet->filename, 'Simulated rendering failure');

        // Verify that local disk STILL holds the last valid artifact!
        $this->assertTrue(Storage::disk('local')->exists($validFilePath));
        $this->assertTrue($this->offerSheetService->isPdfValid(Storage::disk('local')->get($validFilePath)));

        // Verify product data in database is completely intact and uncorrupted
        $freshProduct = Product::find($product->id);
        $this->assertEquals("Rugged Workwear Jacket", $freshProduct->name);
        $this->assertEquals(18.50, (float) $freshProduct->wholesale_price);
        $this->assertEquals(40, (int) $freshProduct->moq);
    }

    /**
     * Requirement 9:
     * Repeated or concurrent generation requests do not allow an older version to overwrite a newer one.
     */
    public function test_9_repeated_or_concurrent_generation_prevents_older_version_overwriting_newer(): void
    {
        $product = Product::factory()->create([
            'name' => "Merino Wool Thermal Top",
            'sku' => 'THM-MER-MEN-1009',
            'wholesale_price' => 12.00,
            'status' => 'published',
        ]);

        // Version 1 generated
        $v1Result = $this->offerSheetService->getOrGenerate($product, true);
        $v1Fingerprint = $this->offerSheetService->computeFingerprint($product);

        // Product updated to Version 2
        $product->update(['wholesale_price' => 14.50]);
        $v2Fingerprint = $this->offerSheetService->computeFingerprint($product->fresh());
        $this->assertNotEquals($v1Fingerprint, $v2Fingerprint);

        // Version 2 generated
        $v2Result = $this->offerSheetService->getOrGenerate($product->fresh(), true);
        $sheet = ProductOfferSheet::where('product_id', $product->id)->first();
        $this->assertEquals($v2Fingerprint, $sheet->fingerprint);

        // If a delayed cached call for Version 2 executes, it returns Version 2 and does not revert to Version 1
        $cachedCall = $this->offerSheetService->getOrGenerate($product->fresh(), false);
        $this->assertEquals($v2Fingerprint, $sheet->fresh()->fingerprint);
        $this->assertEquals($v2Result['hash'], $cachedCall['hash']);
    }
}
