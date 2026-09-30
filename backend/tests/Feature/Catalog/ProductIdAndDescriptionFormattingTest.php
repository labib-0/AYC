<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductIdAndDescriptionFormattingTest extends TestCase
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
            'code' => 'WH-FMT-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Formatting Test Brand',
            'slug' => 'formatting-test-brand-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Formatting Category',
            'slug' => 'formatting-category-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_fmt_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_fmt_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function basePayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'product_id' => 'AY-' . strtoupper($uid),
            'name' => 'Test Product ' . $uid,
            'slug' => 'test-product-' . $uid,
            'sku' => 'SKU-FMT-' . strtoupper($uid),
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 24.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'draft',
            'is_preorder' => false,
        ], $overrides);
    }

    // =========================================================================
    // DESCRIPTION LINE-BREAK PRESERVATION TESTS
    // =========================================================================

    public function test_single_newline_remains_single_newline_in_db_and_api(): void
    {
        $description = "Line 1\nLine 2";

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-001',
                'description' => $description,
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.description', $description);

        $product = Product::where('product_id', 'DESC-001')->firstOrFail();
        $this->assertEquals($description, $product->description);

        // Customer API inspection
        $product->update(['status' => 'published']);
        $publicRes = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/products/' . $product->slug);

        $publicRes->assertStatus(200)
            ->assertJsonPath('data.description', $description);
    }

    public function test_two_consecutive_newlines_remain_two_newlines_in_db_and_api(): void
    {
        $description = "Line 1\n\nLine 2";

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-002',
                'description' => $description,
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.description', $description);

        $product = Product::where('product_id', 'DESC-002')->firstOrFail();
        $this->assertEquals($description, $product->description);

        $product->update(['status' => 'published']);
        $publicRes = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/products/' . $product->slug);

        $publicRes->assertStatus(200)
            ->assertJsonPath('data.description', $description);
    }

    public function test_three_consecutive_newlines_remain_three_newlines_in_db_and_api(): void
    {
        $description = "First paragraph.\n\n\nSecond paragraph.";

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-003',
                'description' => $description,
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.description', $description);

        $product = Product::where('product_id', 'DESC-003')->firstOrFail();
        $this->assertEquals($description, $product->description);
    }

    public function test_multiline_bullet_and_spec_descriptions_preserved(): void
    {
        $description = "Product details:\nMaterial: 100% Cotton\nWeight: 180 GSM";

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-004',
                'description' => $description,
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.description', $description);

        $product = Product::where('product_id', 'DESC-004')->firstOrFail();
        $this->assertEquals($description, $product->description);
    }

    public function test_existing_product_description_retains_formatting_after_save_edit(): void
    {
        $description = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";

        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-005',
                'description' => $description,
            ]));
        $createRes->assertStatus(201);
        $productId = $createRes->json('data.id');

        // Edit another field without touching description
        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'wholesale_price' => 35.00,
            ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.description', $description);

        $fresh = Product::find($productId);
        $this->assertEquals($description, $fresh->description);
    }

    public function test_updating_description_with_multiline_paragraphs_preserves_new_formatting(): void
    {
        $initialDesc = "Initial description single line";

        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-006',
                'description' => $initialDesc,
            ]));
        $createRes->assertStatus(201);
        $productId = $createRes->json('data.id');

        $updatedDesc = "First paragraph.\n\n\nSecond paragraph with one newline:\nThird paragraph.";

        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'description' => $updatedDesc,
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.description', $updatedDesc);

        $fresh = Product::find($productId);
        $this->assertEquals($updatedDesc, $fresh->description);
    }

    public function test_windows_crlf_line_breaks_are_preserved_without_collapsing(): void
    {
        $description = "Line 1\r\nLine 2\r\n\r\nLine 3";

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-007',
                'description' => $description,
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.description', $description);

        $product = Product::where('product_id', 'DESC-007')->firstOrFail();
        $this->assertEquals($description, $product->description);
    }

    public function test_multiline_description_never_converts_newlines_to_html_tags(): void
    {
        $description = "Line 1\nLine 2\n\nLine 3";

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'DESC-008',
                'description' => $description,
            ]));

        $response->assertStatus(201);
        $returnedDesc = $response->json('data.description');

        $this->assertStringNotContainsString('<br>', $returnedDesc);
        $this->assertStringNotContainsString('<br/>', $returnedDesc);
        $this->assertStringNotContainsString('<br />', $returnedDesc);
        $this->assertStringNotContainsString('<p>', $returnedDesc);
        $this->assertEquals($description, $returnedDesc);
    }

    // =========================================================================
    // PRODUCT ID NORMALIZATION & VALIDATION TESTS
    // =========================================================================

    public function test_product_id_with_hyphen_saves_correctly(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY-1001',
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.productId', 'AY-1001');

        $this->assertDatabaseHas('products', ['product_id' => 'AY-1001']);
    }

    public function test_product_id_with_slash_saves_correctly(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY/1001',
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.productId', 'AY/1001');

        $this->assertDatabaseHas('products', ['product_id' => 'AY/1001']);
    }

    public function test_product_id_with_hyphen_and_spaces_strips_spaces(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY - 1001',
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.productId', 'AY-1001');

        $this->assertDatabaseHas('products', ['product_id' => 'AY-1001']);
    }

    public function test_product_id_with_slash_and_spaces_strips_spaces(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY / 1001',
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.productId', 'AY/1001');

        $this->assertDatabaseHas('products', ['product_id' => 'AY/1001']);
    }

    public function test_product_id_with_multiple_spaces_slashes_and_hyphens(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => '  STYLE - 2026 / 01  ',
            ]));

        $response->assertStatus(201)
            ->assertJsonPath('data.productId', 'STYLE-2026/01');

        $this->assertDatabaseHas('products', ['product_id' => 'STYLE-2026/01']);
    }

    public function test_product_id_model_mutator_directly_strips_spaces(): void
    {
        $product = new Product();
        $product->product_id = 'ABC / 25 - 001';
        $this->assertEquals('ABC/25-001', $product->product_id);

        $product->product_id = '  AY - 999  ';
        $this->assertEquals('AY-999', $product->product_id);
    }

    public function test_unsupported_special_characters_are_rejected(): void
    {
        $invalidIds = [
            'AY@1001',
            'AY#1001',
            'AY$1001',
            'AY%1001',
            'AY*1001',
            'AY_1001',
            'AY\\1001',
            'AY=1001',
            'AY!1001',
            'AY+1001',
        ];

        foreach ($invalidIds as $invalidId) {
            $response = $this->actingAs($this->admin, 'sanctum')
                ->postJson('/api/v1/products', $this->basePayload([
                    'product_id' => $invalidId,
                ]));

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['product_id']);
        }
    }

    public function test_product_id_uniqueness_checked_after_normalization(): void
    {
        // First product saved as AY/1001
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY/1001',
            ]))->assertStatus(201);

        // Second product attempts to use "AY / 1001" which normalizes to "AY/1001"
        $duplicateResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY / 1001',
            ]));

        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['product_id']);
    }

    public function test_editing_existing_product_id_does_not_falsely_conflict_with_itself(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'AY/2001',
            ]));
        $res->assertStatus(201);
        $productId = $res->json('data.id');

        // Updating with "AY / 2001" (with spaces) should normalize to "AY/2001" and pass without self-conflict
        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'product_id' => 'AY / 2001',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.productId', 'AY/2001');
    }

    public function test_existing_valid_product_ids_remain_unchanged(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $this->basePayload([
                'product_id' => 'STYLE-2026/01',
            ]));
        $res->assertStatus(201)
            ->assertJsonPath('data.productId', 'STYLE-2026/01');

        $productId = $res->json('data.id');

        // Update another attribute
        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'name' => 'Updated Style Name',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.productId', 'STYLE-2026/01');
    }
}
