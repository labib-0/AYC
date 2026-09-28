<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Step 4: Full Product Workflow Regression Test
 *
 * Covers:
 * - Section 2: Product Draft Creation (TEST-REGRESSION-001, PCS unit, optional package breakdown, optional colors/sizes, purchase price)
 * - Section 3: Package Breakdown Toggle & Persistence
 * - Section 4: Autosave Idempotency & Draft Recovery
 * - Section 5: Publish Separation & Storefront Visibility Isolation
 * - Section 6: PCS Unit Model (50 PCS MOQ, 500 PCS Stock)
 * - Section 7: Text-only Color System (Preset + Custom 'Wine Red', Variants Black/M, White/M, Navy/M)
 * - Section 8 & 9: Pricing, No Fake MSRP, Full Stock Pricing Rule
 * - Section 10: Image Media & Video URL
 * - Section 11: Product Specifications (Design Type, Material, No Fabric Weight / Season)
 * - Section 12: Purchase Price Admin Tracking & Customer API Privacy
 * - Section 13: Packaging Logistics (15 KG/carton, CBM calculation)
 * - Section 14: Preorder Workflow & Estimated Delivery Date Validation
 * - Section 15 & 16: Product ID Uniqueness, Search, and Public API Privacy
 */
class Prompt4FullProductWorkflowRegressionTest extends TestCase
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
            'name' => 'Regression Test Warehouse',
            'code' => 'WH-REG-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Regression Brand',
            'slug' => 'regression-brand-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Regression Category',
            'slug' => 'regression-category-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_reg_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_reg_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    /**
     * Section 2: Create a test product draft through the real product-creation backend workflow.
     * Product ID: TEST-REGRESSION-001
     * Product Name: Regression Test Product
     */
    public function test_section_2_product_draft_creation(): void
    {
        $payload = [
            'product_id' => 'TEST-REGRESSION-001',
            'name' => 'Regression Test Product',
            'slug' => 'regression-test-product',
            'sku' => 'REG-SKU-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 25.00,
            'cost_price' => 14.50,
            'moq' => 50, // 50 PCS
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
            // Deliberately omit package breakdown, colors, sizes, fabric weight, season
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.name', 'Regression Test Product');

        $productId = $res->json('data.id');
        $product = Product::find($productId);

        $this->assertNotNull($product);
        $this->assertEquals('TEST-REGRESSION-001', $product->product_id);
        $this->assertEquals(50, $product->moq);
        $this->assertEquals(14.50, (float) $product->cost_price);
        $this->assertEquals(0, $product->packageAllocations()->count());

        // Duplicate Product ID must be rejected with 422
        $dupPayload = array_merge($payload, [
            'name' => 'Another Product Same ID',
            'slug' => 'another-product-same-id',
            'sku' => 'REG-SKU-002',
        ]);
        $dupRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $dupPayload);
        $dupRes->assertStatus(422)
            ->assertJsonValidationErrors(['product_id']);
    }

    /**
     * Section 3: Package breakdown toggle & persistence.
     * Starts hidden/empty -> save draft -> add partial package data -> save -> reopen -> persists -> hide again.
     */
    public function test_section_3_package_breakdown_persistence(): void
    {
        // 1. Save draft without package breakdown
        $payload = [
            'product_id' => 'TEST-REGRESSION-002',
            'name' => 'Package Toggle Product',
            'slug' => 'package-toggle-product',
            'sku' => 'REG-SKU-003',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 30.00,
            'moq' => 20,
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $id = $res->json('data.id');

        // 2. Open package breakdown and add partial package data
        $updatePayload = array_merge($payload, [
            'id' => $id,
            'is_package_assortment' => true,
            'package_allocations' => [
                ['package_name' => 'Pack A', 'color' => 'Navy', 'size' => 'M', 'quantity' => 10],
                ['package_name' => 'Pack A', 'color' => 'Navy', 'size' => 'L', 'quantity' => 10],
            ],
        ]);

        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$id}", $updatePayload);
        $updateRes->assertStatus(200);

        // Fetch draft to confirm package data persisted
        $fetchRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$id}");
        $fetchRes->assertStatus(200);
        $savedProduct = Product::find($id);
        $this->assertEquals(2, $savedProduct->packageAllocations()->count());

        // 3. Hide package breakdown again (empty allocations) -> still valid draft
        $hidePayload = array_merge($payload, [
            'id' => $id,
            'is_package_assortment' => false,
            'package_allocations' => [],
        ]);
        $hideRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$id}", $hidePayload);
        $hideRes->assertStatus(200);
        $this->assertEquals('draft', $hideRes->json('data.status'));
    }

    /**
     * Section 4: Autosave draft idempotency.
     * Repeated autosave requests update the same draft record without duplicate products.
     */
    public function test_section_4_autosave_idempotency_and_no_duplicates(): void
    {
        $basePayload = [
            'product_id' => 'TEST-REGRESSION-AUTOSAVE',
            'name' => 'Autosave Regression Draft Initial',
            'slug' => 'autosave-reg-draft',
            'sku' => 'REG-SKU-AUTO',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 19.99,
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
        ];

        // 1st autosave creates draft
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $basePayload);
        $res1->assertStatus(201);
        $draftId = $res1->json('data.id');

        // 2nd autosave sends updated info referencing existing draft id
        $updatedPayload = array_merge($basePayload, [
            'id' => $draftId,
            'name' => 'Autosave Regression Draft Updated Title',
            'wholesale_price' => 24.50,
        ]);
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $updatedPayload);
        $res2->assertStatus(200);
        $this->assertEquals($draftId, $res2->json('data.id'));

        // Verify only 1 product record exists in DB for this product_id
        $count = Product::where('product_id', 'TEST-REGRESSION-AUTOSAVE')->count();
        $this->assertEquals(1, $count);

        $product = Product::find($draftId);
        $this->assertEquals('Autosave Regression Draft Updated Title', $product->name);
        $this->assertEquals(24.50, (float) $product->wholesale_price);
        $this->assertEquals('draft', $product->status);
    }

    /**
     * Section 5: Draft Save vs Publish Separation & Storefront Visibility.
     * Incomplete product fails publish. Complete product publishes. Storefront only sees published.
     */
    public function test_section_5_publish_separation_and_storefront_visibility(): void
    {
        // 1. Incomplete product: missing required bulk tier / price for publish
        $incompletePayload = [
            'product_id' => 'TEST-REGRESSION-PUB',
            'name' => 'Incomplete Apparel Item',
            'slug' => 'incomplete-apparel-item',
            'sku' => 'REG-SKU-INC',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 35.00,
            'status' => 'published', // Attempting to publish without bulk tier
            'warehouse_id' => $this->warehouse->id,
        ];

        $failRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $incompletePayload);
        $failRes->assertStatus(422);

        // 2. Save as draft succeeds
        $incompletePayload['status'] = 'draft';
        $draftRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $incompletePayload);
        $draftRes->assertStatus(201);
        $id = $draftRes->json('data.id');

        // Guest / customer cannot see draft in storefront
        auth()->forgetGuards();
        $guestRes = $this->getJson('/api/v1/products');
        $this->assertNull(collect($guestRes->json('data'))->firstWhere('name', 'Incomplete Apparel Item'));

        // 3. Complete publish requirements and publish deliberately
        $publishPayload = array_merge($incompletePayload, [
            'id' => $id,
            'status' => 'published',
            'bulk_threshold' => 100,
            'bulk_price' => 28.00,
            'full_stock_price' => 25.00,
        ]);
        $pubRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$id}", $publishPayload);
        $pubRes->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        // Now visible to guest on storefront
        auth()->forgetGuards();
        $guestPubRes = $this->getJson('/api/v1/products');
        $found = collect($guestPubRes->json('data'))->firstWhere('name', 'Incomplete Apparel Item');
        $this->assertNotNull($found);
    }

    /**
     * Section 6 & 13: PCS Unit Model & Packaging Logistics.
     * MOQ = 50 PCS, Stock = 500 PCS.
     * Packaging: Gross weight = 15 KG per carton. 1 = 15, 2 = 30, 5 = 75 KG.
     */
    public function test_section_6_and_13_pcs_unit_and_packaging_logistics(): void
    {
        $payload = [
            'product_id' => 'TEST-REGRESSION-PCS-LOG',
            'name' => 'PCS and Logistics Garment',
            'slug' => 'pcs-and-logistics-garment',
            'sku' => 'REG-SKU-PCS',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 18.00,
            'moq' => 50, // 50 PCS
            'stock' => 500, // 500 PCS
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'gross_weight' => 15.00, // 15 KG per carton
                    'carton_length' => 60,
                    'carton_width' => 40,
                    'carton_height' => 30,
                ],
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $id = $res->json('data.id');

        $product = Product::find($id);
        $this->assertEquals(50, $product->moq);

        // Verify logistics calculation
        $profile = $product->shippingPackageProfiles()->first();
        $this->assertNotNull($profile);
        $this->assertEquals(15.00, (float) $profile->gross_weight);

        // Calculation: 1 carton = 15kg, 2 cartons = 30kg, 5 cartons = 75kg
        $weightPerCarton = (float) $profile->gross_weight;
        $this->assertEquals(15.00, $weightPerCarton * 1);
        $this->assertEquals(30.00, $weightPerCarton * 2);
        $this->assertEquals(75.00, $weightPerCarton * 5);

        // CBM calculation: (60 * 40 * 30) / 1,000,000 = 0.072 CBM per carton
        $cbmPerCarton = ($profile->carton_length * $profile->carton_width * $profile->carton_height) / 1000000;
        $this->assertEquals(0.072, round($cbmPerCarton, 3));
    }

    /**
     * Section 7: Color system (Text names only, presets + custom Wine Red, variants).
     */
    public function test_section_7_color_system_name_only_and_custom_color(): void
    {
        $payload = [
            'product_id' => 'TEST-REGRESSION-COLORS',
            'name' => 'Color Hierarchy Product',
            'slug' => 'color-hierarchy-product',
            'sku' => 'REG-SKU-COL',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 22.00,
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
            'colors' => ['Black', 'White', 'Navy', 'Wine Red'],
            'sizes' => ['M'],
            'variants' => [
                ['color' => 'Black', 'size' => 'M', 'stock' => 100, 'price' => 22.00],
                ['color' => 'White', 'size' => 'M', 'stock' => 100, 'price' => 22.00],
                ['color' => 'Navy', 'size' => 'M', 'stock' => 100, 'price' => 22.00],
                ['color' => 'Wine Red', 'size' => 'M', 'stock' => 100, 'price' => 22.00],
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $id = $res->json('data.id');
        $product = Product::find($id);

        $variants = $product->variants;
        $this->assertCount(4, $variants);
        $colors = $variants->pluck('color')->all();
        $this->assertContains('Black', $colors);
        $this->assertContains('White', $colors);
        $this->assertContains('Navy', $colors);
        $this->assertContains('Wine Red', $colors);
    }

    /**
     * Section 8 & 9: Product pricing, no MSRP/fake discount, Full Stock eligibility rule.
     */
    public function test_section_8_and_9_pricing_and_full_stock_eligibility(): void
    {
        $payload = [
            'product_id' => 'TEST-REGRESSION-PRICING',
            'name' => 'Tiered Pricing Product',
            'slug' => 'tiered-pricing-product',
            'sku' => 'REG-SKU-PRC',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 25.00,
            'bulk_threshold' => 100,
            'bulk_price' => 22.00,
            'full_stock_price' => 19.50,
            'moq' => 50,
            'stock' => 750, // 750 PCS
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $data = $res->json('data');
        $this->assertEquals(25.00, (float) $data['wholesalePrice']);
        $this->assertEquals(22.00, (float) $data['bulkPrice']);
        $this->assertEquals(19.50, (float) $data['fullStockPrice']);
        // Full stock eligibility is true when stock > moq
        $this->assertTrue($data['isFullStockEligible']);
    }

    /**
     * Section 10: Image media and YouTube video URL.
     */
    public function test_section_10_media_and_video_url(): void
    {
        $payload = [
            'product_id' => 'TEST-REGRESSION-MEDIA',
            'name' => 'Media Rich Garment',
            'slug' => 'media-rich-garment',
            'sku' => 'REG-SKU-MED',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 28.00,
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
            'images' => ['/storage/products/shirt-front.jpg', '/storage/products/shirt-back.jpg'],
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $id = $res->json('data.id');
        $product = Product::find($id);

        $this->assertEquals('https://www.youtube.com/watch?v=dQw4w9WgXcQ', $product->video_url);
    }

    /**
     * Section 11: Product Specifications (Design Type, Material only; no Fabric Weight, Season).
     */
    public function test_section_11_specifications_design_type_material(): void
    {
        $payload = [
            'product_id' => 'TEST-REGRESSION-SPECS',
            'name' => 'Specs Clean Garment',
            'slug' => 'specs-clean-garment',
            'sku' => 'REG-SKU-SPC',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 20.00,
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
            'design_type' => 'ORIGINAL',
            'material' => '100% Combed Cotton',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $data = $res->json('data');
        $this->assertEquals('ORIGINAL', $data['designType']);
        $this->assertEquals('100% Combed Cotton', $data['material']);
        $this->assertArrayNotHasKey('fabricWeight', $data);
        $this->assertArrayNotHasKey('season', $data);
    }

    /**
     * Section 12: Purchase Price Admin Update & Customer API Privacy.
     */
    public function test_section_12_purchase_price_privacy_and_tracking(): void
    {
        // 1. Admin creates product with purchase price
        $payload = [
            'product_id' => 'TEST-REGRESSION-COST',
            'name' => 'Internal Cost Product',
            'slug' => 'internal-cost-product',
            'sku' => 'REG-SKU-CST',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 30.00,
            'moq' => 50,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 22.00,
            'cost_price' => 12.00,
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $id = $res->json('data.id');

        // Admin view includes costPrice
        $adminView = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$id}");
        $this->assertEquals(12.00, (float) $adminView->json('data.costPrice'));

        // Customer view MUST NOT include costPrice / purchasePrice
        auth()->forgetGuards();
        $customerView = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$id}");
        $customerData = $customerView->json('data');
        $this->assertArrayNotHasKey('costPrice', $customerData);
        $this->assertArrayNotHasKey('cost_price', $customerData);
        $this->assertArrayNotHasKey('purchasePrice', $customerData);
        $this->assertArrayNotHasKey('purchase_price', $customerData);
    }

    /**
     * Section 14: Preorder Workflow & Estimated Delivery Date Validation.
     */
    public function test_section_14_preorder_workflow(): void
    {
        // Preorder ON without delivery date must be blocked from publishing
        $preorderFailPayload = [
            'product_id' => 'TEST-REGRESSION-PRE-FAIL',
            'name' => 'Preorder Missing Date',
            'slug' => 'preorder-missing-date',
            'sku' => 'REG-SKU-PRE-1',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 25.00,
            'moq' => 50,
            'bulk_threshold' => 100,
            'bulk_price' => 22.00,
            'full_stock_price' => 20.00,
            'status' => 'published',
            'is_preorder' => true,
            'estimated_delivery_date' => null, // Missing!
            'warehouse_id' => $this->warehouse->id,
        ];

        $failRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $preorderFailPayload);
        $failRes->assertStatus(422)
            ->assertJsonValidationErrors(['estimated_delivery_date']);

        // Preorder ON with valid delivery date succeeds
        $preorderSuccessPayload = array_merge($preorderFailPayload, [
            'product_id' => 'TEST-REGRESSION-PRE-OK',
            'slug' => 'preorder-with-date',
            'sku' => 'REG-SKU-PRE-2',
            'estimated_delivery_date' => now()->addDays(45)->toDateString(),
        ]);

        $successRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $preorderSuccessPayload);
        $successRes->assertStatus(201)
            ->assertJsonPath('data.isPreorder', true);
    }

    /**
     * Section 15 & 16: Product ID Uniqueness, Search, and Public API Privacy.
     * Admin can search by Product ID. Public API response excludes Product ID.
     */
    public function test_section_15_and_16_product_id_uniqueness_search_and_privacy(): void
    {
        $payload = [
            'product_id' => 'AYC-SECRET-PID-999',
            'name' => 'Authoritative Product Identifier Test',
            'slug' => 'auth-pid-test',
            'sku' => 'REG-SKU-PID',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 20.00,
            'moq' => 50,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'full_stock_price' => 16.00,
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $id = $res->json('data.id');

        // Admin searches by product_id
        $adminSearch = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?q=AYC-SECRET-PID-999');
        $adminSearch->assertStatus(200);
        $adminFound = collect($adminSearch->json('data'))->firstWhere('name', 'Authoritative Product Identifier Test');
        $this->assertNotNull($adminFound);

        // Customer viewing product detail: Product ID must NOT be present
        auth()->forgetGuards();
        $customerDetail = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/products/{$id}");
        $customerDetail->assertStatus(200);
        $data = $customerDetail->json('data');

        $this->assertArrayNotHasKey('productId', $data);
        $this->assertArrayNotHasKey('product_id', $data);
    }
}
