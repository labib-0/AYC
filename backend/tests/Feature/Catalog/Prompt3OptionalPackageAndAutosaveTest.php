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
 * Step 3: Optional Package Breakdown + Product Draft Autosave Tests
 */
class Prompt3OptionalPackageAndAutosaveTest extends TestCase
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
            'name' => 'Autosave Test Warehouse',
            'code' => 'WH-AUTO-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->brand = Brand::factory()->create([
            'name' => 'Autosave Brand',
            'slug' => 'autosave-brand-' . uniqid(),
            'is_active' => true,
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Autosave Category',
            'slug' => 'autosave-category-' . uniqid(),
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin_autosave_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'email' => 'customer_autosave_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function baseDraftPayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'product_id' => 'AYC-DRAFT-' . strtoupper($uid),
            'name' => 'Draft Product ' . $uid,
            'slug' => 'draft-product-' . $uid,
            'sku' => 'DRF-SKU-' . strtoupper($uid),
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 20.00,
            'moq' => 10,
            'status' => 'draft',
            'warehouse_id' => $this->warehouse->id,
        ], $overrides);
    }

    /** 1. Create draft without package breakdown */
    public function test_1_create_draft_without_package_breakdown(): Product
    {
        $payload = $this->baseDraftPayload();
        unset($payload['package_allocations']);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft');

        $productId = $res->json('data.id');
        $product = Product::find($productId);
        $this->assertNotNull($product);
        $this->assertEquals('draft', $product->status);
        $this->assertEquals(0, $product->packageAllocations()->count());

        return $product;
    }

    /** 2. Save draft with incomplete colors/sizes where allowed */
    public function test_2_save_draft_with_incomplete_colors_sizes(): void
    {
        $payload = $this->baseDraftPayload([
            'colors' => [],
            'sizes' => [],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft');

        $product = Product::find($res->json('data.id'));
        $this->assertNotNull($product);
        $this->assertEquals('draft', $product->status);
    }

    /** 3. Save draft without package breakdown, ratio matrix, or package total */
    public function test_3_save_draft_without_package_breakdown(): void
    {
        $payload = $this->baseDraftPayload([
            'package_allocations' => [],
            'wholesale_price' => 15.50,
            'full_stock_price' => 12.00,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft');
    }

    /** 4. Update draft with package breakdown */
    public function test_4_update_draft_with_package_breakdown(): void
    {
        $product = $this->test_1_create_draft_without_package_breakdown();
        $this->assertEquals(0, $product->packageAllocations()->count());

        $updatePayload = [
            'status' => 'draft',
            'package_allocations' => [
                ['package_name' => 'Universal Pack', 'color' => 'Black', 'size' => 'M', 'quantity' => 10],
                ['package_name' => 'Universal Pack', 'color' => 'White', 'size' => 'L', 'quantity' => 10],
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", $updatePayload);
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft');

        $product->refresh();
        $this->assertEquals('draft', $product->status);
        $this->assertEquals(2, $product->packageAllocations()->count());
    }

    /** 5. Autosave same draft repeatedly without duplicate products */
    public function test_5_autosave_same_draft_repeatedly_without_duplicate_products(): void
    {
        $payload = $this->baseDraftPayload([
            'product_id' => 'AYC-AUTOSAVE-001',
            'name' => 'Initial Autosave Name',
        ]);

        // First autosave creates product
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res1->assertStatus(201);
        $draftId = $res1->json('data.id');

        $this->assertEquals(1, Product::where('product_id', 'AYC-AUTOSAVE-001')->count());

        // Repeated autosaves with same ID update existing record without creating duplicate
        $payloadWithId = array_merge($payload, [
            'id' => $draftId,
            'name' => 'Updated Autosave Name Keystroke 1',
        ]);
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payloadWithId);
        $res2->assertStatus(200);

        $payloadWithId['name'] = 'Updated Autosave Name Keystroke 2';
        $res3 = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$draftId}", $payloadWithId);
        $res3->assertStatus(200);

        // Verify still exactly 1 product record exists in DB
        $this->assertEquals(1, Product::where('product_id', 'AYC-AUTOSAVE-001')->count());
        $draft = Product::find($draftId);
        $this->assertEquals('Updated Autosave Name Keystroke 2', $draft->name);
        $this->assertEquals('draft', $draft->status);
    }

    /** 6. Autosave always preserves draft status */
    public function test_6_autosave_always_preserves_draft_status(): void
    {
        $payload = $this->baseDraftPayload(['status' => 'draft']);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $draftId = $res->json('data.id');

        $updatePayload = [
            'status' => 'draft',
            'wholesale_price' => 45.00,
        ];
        $res2 = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$draftId}", $updatePayload);
        $res2->assertStatus(200);

        $product = Product::find($draftId);
        $this->assertEquals('draft', $product->status);
    }

    /** 7. Draft appears in Draft Products list */
    public function test_7_draft_appears_in_draft_products_list(): void
    {
        $payload = $this->baseDraftPayload([
            'name' => 'Draft For List Verification',
            'product_id' => 'AYC-LIST-DRAFT-1',
        ]);
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        // Fetch admin listing filtered by draft
        $listRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/products?status=draft&isAdmin=1');
        $listRes->assertStatus(200);
        $items = $listRes->json('data');

        $found = collect($items)->firstWhere('product_id', 'AYC-LIST-DRAFT-1');
        $this->assertNotNull($found);
        $this->assertEquals('draft', $found['status']);
    }

    /** 8. Open draft restores saved data */
    public function test_8_open_draft_restores_saved_data(): void
    {
        $payload = $this->baseDraftPayload([
            'product_id' => 'AYC-RESTORE-001',
            'name' => 'Full Restore Verification',
            'wholesale_price' => 32.50,
            'moq' => 25,
            'package_allocations' => [
                ['package_name' => 'Universal Pack', 'color' => 'Navy', 'size' => 'XL', 'quantity' => 25],
            ],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $draftId = $res->json('data.id');

        $fetchRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$draftId}");
        $fetchRes->assertStatus(200);
        $data = $fetchRes->json('data');

        $this->assertEquals('AYC-RESTORE-001', $data['productId'] ?? $data['product_id']);
        $this->assertEquals('Full Restore Verification', $data['name']);
        $this->assertEquals(32.50, (float) $data['wholesalePrice']);
        $this->assertEquals('draft', $data['status']);
    }

    /** 9. Draft product hidden from storefront listing and search */
    public function test_9_draft_product_hidden_from_storefront(): void
    {
        $payload = $this->baseDraftPayload([
            'product_id' => 'AYC-HIDDEN-DRAFT',
            'name' => 'Secret Unpublished Apparel Draft',
        ]);
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        // Guest / customer request to catalog listing (clear admin sanctum auth first)
        auth()->forgetGuards();
        $guestRes = $this->getJson('/api/v1/products');
        $guestRes->assertStatus(200);
        $guestItems = $guestRes->json('data');
        $foundGuest = collect($guestItems)->firstWhere('name', 'Secret Unpublished Apparel Draft');
        $this->assertNull($foundGuest);

        // Customer search request
        $searchRes = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/products?search=Secret');
        $searchRes->assertStatus(200);
        $searchItems = $searchRes->json('data');
        $foundSearch = collect($searchItems)->firstWhere('name', 'Secret Unpublished Apparel Draft');
        $this->assertNull($foundSearch);

        // Attempt by customer to pass status=draft query parameter
        $hackRes = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/products?status=draft');
        $hackRes->assertStatus(200);
        $hackItems = $hackRes->json('data');
        $foundHack = collect($hackItems)->firstWhere('name', 'Secret Unpublished Apparel Draft');
        $this->assertNull($foundHack);
    }

    /** 10. Publish remains deliberate/manual */
    public function test_10_publish_remains_deliberate_and_manual(): void
    {
        $draft = $this->test_1_create_draft_without_package_breakdown();
        $this->assertEquals('draft', $draft->status);

        // Explicit publish action
        $publishPayload = [
            'status' => 'published',
            'wholesale_price' => 20.00,
            'full_stock_price' => 15.00,
            'bulk_threshold' => 100,
            'bulk_price' => 18.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$draft->id}", $publishPayload);
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'published');

        $draft->refresh();
        $this->assertEquals('published', $draft->status);
    }

    /** 11. Package breakdown remains optional even on publish */
    public function test_11_package_breakdown_remains_optional_on_publish(): void
    {
        $payload = [
            'product_id' => 'AYC-PUB-NOPKG-' . uniqid(),
            'name' => 'Published Without Package Breakdown',
            'slug' => 'published-without-pkg-' . uniqid(),
            'sku' => 'PUB-NOPKG-' . uniqid(),
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 22.00,
            'full_stock_price' => 18.00,
            'bulk_threshold' => 50,
            'bulk_price' => 20.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'published',
            // No package allocations!
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'published');

        $product = Product::find($res->json('data.id'));
        $this->assertNotNull($product);
        $this->assertEquals('published', $product->status);
        $this->assertEquals(0, $product->packageAllocations()->count());
    }
}
