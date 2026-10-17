<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DuplicateProductNameAndIdentifierUniquenessTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;
    protected Brand $brand;
    protected Category $category;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Test Central Warehouse',
            'code' => 'WH-TEST-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Originals',
            'slug' => 'ayaan-originals-' . uniqid(),
        ]);

        $this->category = Category::create([
            'name' => 'T-Shirts',
            'slug' => 't-shirts-' . uniqid(),
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_uniqueness_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
    }

    /**
     * Test 1: Multiple products can have exactly the same product name with auto-incremented slugs.
     */
    public function test_multiple_products_can_have_identical_names(): void
    {
        $payload1 = [
            'product_id' => 'AYC-DUP-001',
            'name' => "Men's Classic T-Shirt",
            'sku' => 'TSH-MEN-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'audience' => 'MEN',
            'status' => 'draft',
            'wholesale_price' => 15.00,
            'full_stock_price' => 12.00,
            'moq' => 10,
        ];

        $resp1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload1);
        $resp1->assertStatus(201);
        $prod1Id = $resp1->json('data.id');
        $this->assertEquals("mens-classic-t-shirt", $resp1->json('data.slug'));

        $payload2 = [
            'product_id' => 'AYC-DUP-002',
            'name' => "Men's Classic T-Shirt",
            'sku' => 'TSH-MEN-002',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'audience' => 'MEN',
            'status' => 'draft',
            'wholesale_price' => 16.00,
            'full_stock_price' => 13.00,
            'moq' => 10,
        ];

        $resp2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload2);
        $resp2->assertStatus(201);
        $prod2Id = $resp2->json('data.id');
        // Automatically generated distinct slug with two-digit minimum suffix
        $this->assertEquals("mens-classic-t-shirt-01", $resp2->json('data.slug'));

        $payload3 = [
            'product_id' => 'AYC-DUP-003',
            'name' => "Men's Classic T-Shirt",
            'sku' => 'TSH-MEN-003',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'audience' => 'MEN',
            'status' => 'draft',
            'wholesale_price' => 17.00,
            'full_stock_price' => 14.00,
            'moq' => 10,
        ];

        $resp3 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload3);
        $resp3->assertStatus(201);
        $this->assertEquals("mens-classic-t-shirt-02", $resp3->json('data.slug'));

        // Verify independent database records
        $this->assertDatabaseHas('products', ['id' => $prod1Id, 'name' => "Men's Classic T-Shirt", 'product_id' => 'AYC-DUP-001', 'sku' => 'TSH-MEN-001']);
        $this->assertDatabaseHas('products', ['id' => $prod2Id, 'name' => "Men's Classic T-Shirt", 'product_id' => 'AYC-DUP-002', 'sku' => 'TSH-MEN-002']);
    }

    /**
     * Test 2: Duplicate Product ID is rejected with 422 validation error.
     */
    public function test_duplicate_product_id_is_rejected(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-PID-UNIQUE',
            'name' => 'Original Product',
            'sku' => 'ORIG-SKU-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->assertStatus(201);

        $resp = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-PID-UNIQUE',
            'name' => 'Different Product Same ID',
            'sku' => 'ORIG-SKU-002',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);

        $resp->assertStatus(422);
        $resp->assertJsonValidationErrors(['product_id']);
    }

    /**
     * Test 3: Duplicate non-empty SKU auto-resolves with two-digit minimum sequential suffix.
     */
    public function test_duplicate_sku_auto_resolves_with_two_digit_suffix(): void
    {
        $r1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SKU-001',
            'name' => 'First Product',
            'sku' => 'SHARED-SKU-TEST',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $r1->assertStatus(201);
        $this->assertEquals('SHARED-SKU-TEST', $r1->json('data.sku'));

        $r2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SKU-002',
            'name' => 'Second Product',
            'sku' => 'SHARED-SKU-TEST',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $r2->assertStatus(201);
        $this->assertEquals('SHARED-SKU-TEST-01', $r2->json('data.sku'));

        $r3 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SKU-003',
            'name' => 'Third Product',
            'sku' => 'SHARED-SKU-TEST',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $r3->assertStatus(201);
        $this->assertEquals('SHARED-SKU-TEST-02', $r3->json('data.sku'));
    }

    /**
     * Test 4: Unchanged Product ID, SKU, and slug pass validation when editing own product.
     */
    public function test_editing_own_product_allows_unchanged_identifiers(): void
    {
        $create = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SELF-001',
            'name' => 'Self Test Product',
            'sku' => 'SELF-SKU-001',
            'slug' => 'self-test-product',
            'slug_manually_edited' => true,
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $create->assertStatus(201);
        $id = $create->json('data.id');

        $update = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$id}", [
            'product_id' => 'AYC-SELF-001',
            'sku' => 'SELF-SKU-001',
            'slug' => 'self-test-product',
            'name' => 'Self Test Product Renamed',
            'description' => 'Updated description without changing identifiers',
        ]);
        $update->assertStatus(200);
        $this->assertEquals('Self Test Product Renamed', $update->json('data.name'));
        $this->assertEquals('AYC-SELF-001', $update->json('data.product_id'));
        $this->assertEquals('SELF-SKU-001', $update->json('data.sku'));
        $this->assertEquals('self-test-product', $update->json('data.slug'));
    }

    /**
     * Test 5: Explicitly entered duplicate slug auto-resolves with two-digit minimum suffix.
     */
    public function test_explicitly_entered_duplicate_slug_auto_resolves_with_two_digit_suffix(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SLUG-001',
            'name' => 'Explicit Slug Prod 1',
            'slug' => 'custom-unique-slug',
            'slug_manually_edited' => true,
            'sku' => 'SLUG-TEST-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->assertStatus(201);

        $resp = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SLUG-002',
            'name' => 'Explicit Slug Prod 2',
            'slug' => 'custom-unique-slug',
            'slug_manually_edited' => true,
            'sku' => 'SLUG-TEST-002',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);

        $resp->assertStatus(201);
        $this->assertEquals('custom-unique-slug-01', $resp->json('data.slug'));
    }

    /**
     * Test 6: Check uniqueness endpoint contract for slug and SKU.
     */
    public function test_check_uniqueness_endpoint_reports_availability_and_two_digit_suggestions(): void
    {
        // Create initial product
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-CHK-001',
            'name' => "Girls' Baby Dress",
            'slug' => 'girls-baby-dress',
            'sku' => 'CA-DRE-GIR-3918',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->assertStatus(201);

        // Check taken slug & SKU
        $chkResp = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products/check-uniqueness?slug=girls-baby-dress&sku=CA-DRE-GIR-3918');
        $chkResp->assertStatus(200);
        $chkResp->assertJson([
            'success' => true,
            'data' => [
                'slug' => [
                    'requested' => 'girls-baby-dress',
                    'is_available' => false,
                    'suggested' => 'girls-baby-dress-01',
                    'adjusted' => true,
                ],
                'sku' => [
                    'requested' => 'CA-DRE-GIR-3918',
                    'is_available' => false,
                    'suggested' => 'CA-DRE-GIR-3918-01',
                    'adjusted' => true,
                ],
            ],
        ]);

        // Check available slug & SKU
        $availResp = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products/check-uniqueness?slug=completely-unique-slug&sku=TOTALLY-UNIQUE-SKU');
        $availResp->assertStatus(200);
        $availResp->assertJson([
            'success' => true,
            'data' => [
                'slug' => [
                    'requested' => 'completely-unique-slug',
                    'is_available' => true,
                    'suggested' => 'completely-unique-slug',
                    'adjusted' => false,
                ],
                'sku' => [
                    'requested' => 'TOTALLY-UNIQUE-SKU',
                    'is_available' => true,
                    'suggested' => 'TOTALLY-UNIQUE-SKU',
                    'adjusted' => false,
                ],
            ],
        ]);
    }

    /**
     * Test 7: Independent resolution of slug and SKU collisions.
     */
    public function test_independent_resolution_of_slug_and_sku(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-IND-001',
            'name' => 'Base Product',
            'slug' => 'base-product-slug',
            'sku' => 'BASE-SKU-999',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->assertStatus(201);

        // Case A: Duplicate SKU, Unique Slug
        $respA = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-IND-002',
            'name' => 'Unique Slug Product',
            'slug' => 'unique-slug-here',
            'sku' => 'BASE-SKU-999',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $respA->assertStatus(201);
        $this->assertEquals('unique-slug-here', $respA->json('data.slug'));
        $this->assertEquals('BASE-SKU-999-01', $respA->json('data.sku'));

        // Case B: Duplicate Slug, Unique SKU
        $respB = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-IND-003',
            'name' => 'Duplicate Slug Product',
            'slug' => 'base-product-slug',
            'sku' => 'UNIQUE-SKU-HERE',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ]);
        $respB->assertStatus(201);
        $this->assertEquals('base-product-slug-01', $respB->json('data.slug'));
        $this->assertEquals('UNIQUE-SKU-HERE', $respB->json('data.sku'));
    }

    /**
     * Test 8: Two-digit minimum suffix increments from -09 through -10 and beyond.
     */
    public function test_two_digit_minimum_suffix_increments_through_10_and_beyond(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-SUF-009',
            'name' => 'Suffix Test Nine',
            'slug' => 'suffix-test-09',
            'sku' => 'SUF-TEST-09',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->assertStatus(201);

        $chk = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products/check-uniqueness?slug=suffix-test-09&sku=SUF-TEST-09');
        $chk->assertStatus(200);
        $this->assertEquals('suffix-test-10', $chk->json('data.slug.suggested'));
        $this->assertEquals('SUF-TEST-10', $chk->json('data.sku.suggested'));
    }

    /**
     * Test 9: Editing one duplicate-name product does not alter other products sharing the name.
     */
    public function test_editing_one_product_does_not_affect_sibling_with_same_name(): void
    {
        $p1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-ISO-001',
            'name' => 'Shared Name Shirt',
            'sku' => 'ISO-SKU-001',
            'wholesale_price' => 15.00,
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->json('data.id');

        $p2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-ISO-002',
            'name' => 'Shared Name Shirt',
            'sku' => 'ISO-SKU-002',
            'wholesale_price' => 25.00,
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->json('data.id');

        // Update P1 wholesale_price
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$p1}", [
            'wholesale_price' => 18.50,
        ])->assertStatus(200);

        // Verify P2 remains unchanged
        $freshP2 = Product::find($p2);
        $this->assertEquals(25.00, (float) $freshP2->wholesale_price);
        $this->assertEquals('Shared Name Shirt', $freshP2->name);
        $this->assertEquals('AYC-ISO-002', $freshP2->product_id);
    }

    /**
     * Test 10: Duplicate endpoint does not exist.
     */
    public function test_duplicate_endpoint_is_unavailable(): void
    {
        $p = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'product_id' => 'AYC-RETIRED-001',
            'name' => 'Retired Duplicate Test',
            'sku' => 'RET-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'status' => 'draft',
        ])->json('data.id');

        $resp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/products/{$p}/duplicate");
        $this->assertTrue(in_array($resp->status(), [404, 405]), 'Duplicate endpoint must return 404 or 405');
    }
}
