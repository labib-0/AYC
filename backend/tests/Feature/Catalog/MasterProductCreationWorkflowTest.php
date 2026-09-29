<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * MASTER STEP — Comprehensive Code-Level Product Creation Workflow Tests
 * Tests A through J
 */
class MasterProductCreationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;
    protected Brand $brand;
    protected Category $category;
    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Main Test Warehouse',
            'code' => 'WH-MASTER-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Ayaan Master Brand',
            'slug' => 'ayaan-master-brand-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Master Category',
            'slug' => 'master-category-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_master_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_master_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function basePayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'product_id' => 'AYC-' . strtoupper($uid),
            'name' => 'Master Product ' . $uid,
            'slug' => 'master-product-' . $uid,
            'sku' => 'SKU-MST-' . strtoupper($uid),
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 24.00,
            'bulk_threshold' => 100,
            'bulk_price' => 26.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'draft',
            'is_preorder' => false,
        ], $overrides);
    }

    // =========================================================================
    // TEST A — SAVE PRODUCT AS DRAFT
    // =========================================================================
    public function test_a_save_product_as_draft_with_all_rules(): Product
    {
        $payload = $this->basePayload([
            'product_id' => 'TEST-AYC-001',
            'name' => 'Automated Product Test',
            'slug' => 'automated-product-test',
            'sku' => 'AUT-PRD-001',
            'unit' => 'PCS',
            'moq' => 50,
            'cost_price' => 12.50, // Purchase Price
            'wholesale_price' => 25.00,
            'full_stock_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 22.00,
            'status' => 'draft',
            'is_preorder' => false,
            // Colors: NONE, Sizes: NONE, Package Breakdown: NONE
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.productId', 'TEST-AYC-001');

        $productId = $response->json('data.id');
        $product = Product::find($productId);
        $this->assertNotNull($product);

        // Assertions from Test A requirements:
        $this->assertEquals('draft', $product->status);
        $this->assertEquals('TEST-AYC-001', $product->product_id);
        $this->assertEquals(50, $product->moq);
        $this->assertEquals(12.50, (float) $product->cost_price);
        $this->assertNotNull($product->purchase_price_updated_at);
        $this->assertFalse((bool) $product->is_preorder);

        // Ensure missing package breakdown, colors, and sizes did not block draft save
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'product_id' => 'TEST-AYC-001',
            'status' => 'draft',
        ]);

        // Customer API verification: No leaking internal Purchase Price or Product ID
        $publicRes = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$product->id}");
        $publicRes->assertStatus(200);
        $publicData = $publicRes->json('data');
        $this->assertArrayNotHasKey('cost_price', $publicData);
        $this->assertArrayNotHasKey('costPrice', $publicData);
        $this->assertArrayNotHasKey('purchasePrice', $publicData);
        $this->assertArrayNotHasKey('product_id', $publicData);
        $this->assertArrayNotHasKey('productId', $publicData);

        return $product;
    }

    // =========================================================================
    // TEST B — DUPLICATE PRODUCT ID
    // =========================================================================
    public function test_b_duplicate_product_id_rejected(): void
    {
        // First create TEST-AYC-001
        $this->test_a_save_product_as_draft_with_all_rules();

        // Attempt duplicate create with TEST-AYC-001
        $duplicatePayload = $this->basePayload([
            'product_id' => 'TEST-AYC-001',
            'name' => 'Duplicate ID Attempt',
            'slug' => 'duplicate-id-attempt',
            'sku' => 'DUP-ID-001',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $duplicatePayload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id'])
            ->assertJsonFragment([
                'product_id' => ['Product ID TEST-AYC-001 is already in use.'],
            ]);

        $this->assertDatabaseCount('products', 1);
    }

    // =========================================================================
    // TEST C — PACKAGE BREAKDOWN OPTIONAL
    // =========================================================================
    public function test_c_package_breakdown_optional_for_draft_and_updatable(): void
    {
        // 1. Create draft without package breakdown
        $payload = $this->basePayload([
            'product_id' => 'TEST-AYC-002',
            'name' => 'Draft Without Breakdown',
            'slug' => 'draft-without-breakdown',
            'sku' => 'DWB-001',
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $createRes->assertStatus(201);
        $id = $createRes->json('data.id');

        // 2. Update the draft and add package breakdown
        $updatePayload = [
            'package_allocations' => [
                ['color' => 'Navy', 'size' => 'M', 'quantity' => 20],
                ['color' => 'Navy', 'size' => 'L', 'quantity' => 30],
            ],
        ];

        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$id}", $updatePayload);

        $updateRes->assertStatus(200);

        $this->assertDatabaseHas('product_package_allocations', [
            'product_id' => $id,
            'color' => 'Navy',
            'size' => 'M',
            'quantity' => 20,
        ]);
        $this->assertDatabaseHas('product_package_allocations', [
            'product_id' => $id,
            'color' => 'Navy',
            'size' => 'L',
            'quantity' => 30,
        ]);
    }

    // =========================================================================
    // TEST D — PUBLISH VALIDATION
    // =========================================================================
    public function test_d_publish_validation_enforces_readiness(): void
    {
        $product = $this->test_a_save_product_as_draft_with_all_rules();

        // 1. Attempt publish while required publish fields are invalid (e.g. bulk threshold <= MOQ)
        $invalidPublish = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'status' => 'published',
                'bulk_threshold' => 30, // Invalid: less than MOQ of 50
            ]);
        $invalidPublish->assertStatus(422);

        // 2. Publish with preorder enabled but missing required estimated_delivery_date
        $invalidPreorderPublish = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'status' => 'published',
                'is_preorder' => true,
                'estimated_delivery_date' => null,
            ]);
        $invalidPreorderPublish->assertStatus(422)
            ->assertJsonValidationErrors(['estimated_delivery_date']);

        // 3. Complete valid publish requirements
        $validPublish = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'status' => 'published',
                'is_preorder' => false,
                'bulk_threshold' => 100,
                'bulk_price' => 22.00,
            ]);

        $validPublish->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        $product->refresh();
        $this->assertEquals('published', $product->status);
    }

    // =========================================================================
    // TEST E — PRODUCT QUANTITY / PCS
    // =========================================================================
    public function test_e_product_quantity_and_stock_in_pcs(): void
    {
        $payload = $this->basePayload([
            'product_id' => 'TEST-AYC-PCS',
            'name' => 'PCS Quantity Test Shirt',
            'slug' => 'pcs-quantity-test-shirt',
            'sku' => 'PCS-SHIRT-001',
            'moq' => 50,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'initial_stock' => 500,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $productId = $response->json('data.id');

        $product = Product::find($productId);
        $this->assertEquals(50, $product->moq, 'MOQ must be 50 PCS');

        // Check inventory record directly
        $inv = \App\Models\Inventory::where('product_id', $productId)->orWhereHas('variant', function ($q) use ($productId) {
            $q->where('product_id', $productId);
        })->first();

        $this->assertNotNull($inv);
        $this->assertEquals(500, $inv->quantity, 'Initial stock must be 500 PCS');
    }

    // =========================================================================
    // TEST F — PACKAGING CALCULATION
    // =========================================================================
    public function test_f_packaging_calculation_per_carton_and_total(): void
    {
        // Single Carton: Gross Weight Per Carton = 15 KG, Carton Count = 1 -> Total = 15 KG
        // 2 Cartons: Carton Count = 2 -> Total = 30 KG
        // 5 Cartons: Carton Count = 5 -> Total = 75 KG
        $payload = $this->basePayload([
            'product_id' => 'TEST-AYC-PKG',
            'name' => 'Packaging Calculation Hoodie',
            'slug' => 'packaging-calculation-hoodie',
            'sku' => 'PKG-CALC-001',
            'wholesale_price' => 45.00,
            'full_stock_price' => 38.00,
            'bulk_threshold' => 100,
            'bulk_price' => 40.00,
            'status' => 'published',
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'dimension_unit' => 'cm',
                    'gross_weight' => 15.0, // Per carton
                    'net_weight' => 14.0,
                    'weight_unit' => 'kg',
                ],
                [
                    'package_quantity' => 100,
                    'carton_count' => 2,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'dimension_unit' => 'cm',
                    'gross_weight' => 15.0, // Per carton
                    'net_weight' => 14.0,
                    'weight_unit' => 'kg',
                ],
                [
                    'package_quantity' => 250,
                    'carton_count' => 5,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'dimension_unit' => 'cm',
                    'gross_weight' => 15.0, // Per carton
                    'net_weight' => 14.0,
                    'weight_unit' => 'kg',
                ],
            ],
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201);
        $profiles = $response->json('data.shipping_package_profiles');
        $this->assertCount(3, $profiles);

        // Profile 1 (1 Carton)
        $this->assertEquals(15.0, $profiles[0]['gross_weight']);
        $this->assertEquals(15.0, $profiles[0]['total_gross_weight']);
        $this->assertArrayNotHasKey('single_carton_cbm', $profiles[0]);
        $this->assertEquals(0.072, $profiles[0]['total_cbm']);

        // Profile 2 (2 Cartons)
        $this->assertEquals(15.0, $profiles[1]['gross_weight']); // Gross Weight Per Carton is NOT mutated
        $this->assertEquals(30.0, $profiles[1]['total_gross_weight']);
        $this->assertArrayNotHasKey('single_carton_cbm', $profiles[1]);
        $this->assertEquals(0.144, $profiles[1]['total_cbm']);

        // Profile 3 (5 Cartons)
        $this->assertEquals(15.0, $profiles[2]['gross_weight']);
        $this->assertEquals(75.0, $profiles[2]['total_gross_weight']);
        $this->assertArrayNotHasKey('single_carton_cbm', $profiles[2]);
        $this->assertEquals(0.36, $profiles[2]['total_cbm']);
    }

    // =========================================================================
    // TEST G — PREORDER
    // =========================================================================
    public function test_g_preorder_workflow(): void
    {
        $futureDate = Carbon::now()->addDays(30)->toDateString();

        // 1. Create valid published preorder product
        $validPreorder = $this->basePayload([
            'product_id' => 'TEST-AYC-PRE-1',
            'name' => 'Valid Preorder Trench Coat',
            'slug' => 'valid-preorder-trench-coat',
            'sku' => 'PRE-COAT-001',
            'status' => 'published',
            'is_preorder' => true,
            'estimated_delivery_date' => $futureDate,
        ]);
        $resValid = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $validPreorder);
        $resValid->assertStatus(201)
            ->assertJsonPath('data.is_preorder', true)
            ->assertJsonPath('data.estimated_delivery_date', $futureDate);

        // 2. Create preorder published product WITHOUT estimated_delivery_date -> fails
        $invalidPreorder = $this->basePayload([
            'product_id' => 'TEST-AYC-PRE-2',
            'name' => 'Invalid Preorder Trench Coat',
            'slug' => 'invalid-preorder-trench-coat',
            'sku' => 'PRE-COAT-002',
            'status' => 'published',
            'is_preorder' => true,
            // estimated_delivery_date omitted
        ]);
        $resInvalid = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $invalidPreorder);
        $resInvalid->assertStatus(422)
            ->assertJsonValidationErrors(['estimated_delivery_date']);

        // 3. Create normal published product without estimated_delivery_date -> succeeds
        $normalProduct = $this->basePayload([
            'product_id' => 'TEST-AYC-NORM-1',
            'name' => 'Normal In-Stock Trench Coat',
            'slug' => 'normal-in-stock-trench-coat',
            'sku' => 'NORM-COAT-001',
            'status' => 'published',
            'is_preorder' => false,
        ]);
        $resNorm = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $normalProduct);
        $resNorm->assertStatus(201)
            ->assertJsonPath('data.is_preorder', false);
    }

    // =========================================================================
    // TEST H — PURCHASE PRICE
    // =========================================================================
    public function test_h_purchase_price_storage_privacy_and_update_tracking(): void
    {
        // 1. Create with Purchase Price (cost_price)
        $payload = $this->basePayload([
            'product_id' => 'TEST-AYC-PURCH',
            'name' => 'Purchase Price Tracked Polo',
            'slug' => 'purchase-price-tracked-polo',
            'sku' => 'PUR-POLO-001',
            'cost_price' => 14.00,
            'status' => 'published',
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $createRes->assertStatus(201);
        $productId = $createRes->json('data.id');

        // Verify stored in DB
        $product = Product::find($productId);
        $this->assertEquals(14.00, (float) $product->cost_price);
        $firstStamp = $product->purchase_price_updated_at;
        $this->assertNotNull($firstStamp);

        // Verify Admin API can access cost_price
        $adminRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$productId}");
        $adminRes->assertStatus(200);
        $this->assertEquals(14.00, (float) $adminRes->json('data.cost_price'));
        $this->assertTrue($adminRes->json('data.purchasePriceUpdated'));

        // Verify customer/public API does NOT expose purchase price
        $custRes = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$productId}");
        $custRes->assertStatus(200);
        $custData = $custRes->json('data');
        $this->assertArrayNotHasKey('cost_price', $custData);
        $this->assertArrayNotHasKey('costPrice', $custData);
        $this->assertArrayNotHasKey('purchasePrice', $custData);

        // 2. Update Purchase Price
        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$productId}", [
            'cost_price' => 16.50,
        ]);
        $updateRes->assertStatus(200);

        $product->refresh();
        $this->assertEquals(16.50, (float) $product->cost_price);
        $this->assertNotNull($product->purchase_price_updated_at);
    }

    // =========================================================================
    // TEST I — PRODUCT ID
    // =========================================================================
    public function test_i_product_id_search_privacy_and_stability(): void
    {
        $payload = $this->basePayload([
            'product_id' => 'AYC-SEARCH-7788',
            'name' => 'Searchable Internal ID Item',
            'slug' => 'searchable-internal-id-item',
            'sku' => 'SRCH-7788',
            'status' => 'published',
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $createRes->assertStatus(201);
        $productId = $createRes->json('data.id');

        // 1. Stored in DB
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'product_id' => 'AYC-SEARCH-7788',
        ]);

        // 2. Admin can search by exact Product ID
        $exactSearch = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?search=AYC-SEARCH-7788');
        $exactSearch->assertStatus(200)
            ->assertJsonPath('data.0.id', $productId)
            ->assertJsonPath('data.0.productId', 'AYC-SEARCH-7788');

        // 3. Admin can search by partial Product ID
        $partialSearch = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?search=7788');
        $partialSearch->assertStatus(200)
            ->assertJsonPath('data.0.id', $productId);

        // 4. Customer search does NOT expose or find by Product ID
        $custSearch = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/products?search=AYC-SEARCH-7788');
        $custSearch->assertStatus(200);
        $this->assertCount(0, $custSearch->json('data'));

        // 5. Customer detail does NOT expose Product ID
        $custDetail = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$productId}");
        $custDetail->assertStatus(200);
        $this->assertArrayNotHasKey('product_id', $custDetail->json('data'));
        $this->assertArrayNotHasKey('productId', $custDetail->json('data'));

        // 6. Product ID remains stable after edit
        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$productId}", [
            'name' => 'Renamed Searchable Item',
        ]);
        $updateRes->assertStatus(200);

        $product = Product::find($productId);
        $this->assertEquals('AYC-SEARCH-7788', $product->product_id);
    }

    // =========================================================================
    // TEST J — REMOVED FIELDS AND RETAINED ATTRIBUTES
    // =========================================================================
    public function test_j_removed_fields_and_retained_specifications(): void
    {
        $payload = $this->basePayload([
            'product_id' => 'TEST-AYC-SPECS',
            'name' => 'Specification Verified T-Shirt',
            'slug' => 'specification-verified-tshirt',
            'sku' => 'SPEC-TSH-001',
            'status' => 'published',
            'design_type' => 'ORIGINAL',
            'material' => '100% Organic Ring-Spun Cotton',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);
        $productId = $response->json('data.id');

        $product = Product::find($productId);
        $this->assertEquals('ORIGINAL', $product->design_type);
        $this->assertEquals('100% Organic Ring-Spun Cotton', $product->material);

        // Check public API response
        $publicRes = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$productId}");
        $publicRes->assertStatus(200);
        $publicData = $publicRes->json('data');

        // Retained specifications
        $this->assertEquals('ORIGINAL', $publicData['design_type'] ?? $publicData['designType']);
        $this->assertEquals('100% Organic Ring-Spun Cotton', $publicData['material']);

        // Removed fields are absent
        $this->assertArrayNotHasKey('fabric_weight', $publicData);
        $this->assertArrayNotHasKey('fabricWeight', $publicData);
        $this->assertArrayNotHasKey('season', $publicData);
        $this->assertArrayNotHasKey('collection_season', $publicData);
        $this->assertArrayNotHasKey('collectionSeason', $publicData);
    }
}
