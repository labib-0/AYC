<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * STEP 5 — Preorder Badge + Estimated Delivery Date Feature Tests
 */
class PreorderProductTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Preorder Test WH',
            'code' => 'WH-PO-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    private function adminUser(): User
    {
        return User::factory()->create([
            'email' => 'admin_po_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
    }

    private function customerUser(): User
    {
        return User::factory()->create([
            'email' => 'customer_po_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function minimalProductPayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'name' => 'Preorder Test Item ' . $uid,
            'slug' => 'preorder-test-item-' . $uid,
            'sku' => 'SKU-PO-' . $uid,
            'brand' => 'Ayaan',
            'audience' => 'MEN',
            'status' => 'published',
            'wholesale_price' => 15.00,
            'bulk_threshold' => 100,
            'bulk_price' => 12.00,
            'full_stock_price' => 10.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'stock' => 100,
            'variants' => [
                ['size' => 'M', 'stock' => 50, 'color' => 'Black'],
                ['size' => 'L', 'stock' => 50, 'color' => 'Black'],
            ],
        ], $overrides);
    }

    public function test_normal_product_can_publish_without_estimated_delivery_date(): void
    {
        $admin = $this->adminUser();
        $payload = $this->minimalProductPayload([
            'is_preorder' => false,
        ]);

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertFalse((bool) $res->json('data.isPreorder'));
        $this->assertNull($res->json('data.estimatedDeliveryDate'));
    }

    public function test_preorder_product_cannot_publish_without_estimated_delivery_date(): void
    {
        $admin = $this->adminUser();
        $payload = $this->minimalProductPayload([
            'is_preorder' => true,
            'estimated_delivery_date' => null,
            'status' => 'published',
        ]);

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['estimated_delivery_date']);
    }

    public function test_preorder_product_publishes_successfully_with_valid_estimated_delivery_date(): void
    {
        $admin = $this->adminUser();
        $futureDate = Carbon::today()->addDays(30)->toDateString();
        $payload = $this->minimalProductPayload([
            'is_preorder' => true,
            'estimated_delivery_date' => $futureDate,
            'status' => 'published',
        ]);

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertTrue((bool) $res->json('data.isPreorder'));
        $this->assertEquals($futureDate, $res->json('data.estimatedDeliveryDate'));
    }

    public function test_updating_product_to_preorder_without_delivery_date_fails_validation(): void
    {
        $admin = $this->adminUser();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => false,
            'estimated_delivery_date' => null,
        ]);

        $res = $this->actingAs($admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'is_preorder' => true,
            'estimated_delivery_date' => null,
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['estimated_delivery_date']);
    }

    public function test_disabling_preorder_clears_estimated_delivery_date(): void
    {
        $admin = $this->adminUser();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'estimated_delivery_date' => Carbon::today()->addDays(45)->toDateString(),
        ]);

        $res = $this->actingAs($admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'is_preorder' => false,
        ]);

        $res->assertStatus(200);
        $this->assertFalse((bool) $res->json('data.isPreorder'));
        $this->assertNull($res->json('data.estimatedDeliveryDate'));

        $product->refresh();
        $this->assertFalse((bool) $product->is_preorder);
        $this->assertNull($product->estimated_delivery_date);
    }

    public function test_customer_receives_preorder_badge_and_estimated_delivery_date(): void
    {
        $futureDate = Carbon::today()->addDays(20)->toDateString();
        $product = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'estimated_delivery_date' => $futureDate,
        ]);

        $customer = $this->customerUser();
        $res = $this->actingAs($customer, 'sanctum')->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertTrue((bool) $res->json('data.isPreorder'));
        $this->assertEquals($futureDate, $res->json('data.estimatedDeliveryDate'));
    }

    public function test_index_can_filter_by_is_preorder(): void
    {
        $admin = $this->adminUser();
        $poProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => true,
            'estimated_delivery_date' => Carbon::today()->addDays(15)->toDateString(),
        ]);
        $regularProduct = Product::factory()->create([
            'status' => 'published',
            'is_preorder' => false,
            'estimated_delivery_date' => null,
        ]);

        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/products?is_preorder=true&isAdmin=1');
        $res->assertStatus(200);

        $returnedIds = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($poProduct->id, $returnedIds);
        $this->assertNotContains($regularProduct->id, $returnedIds);
    }

    public function test_draft_saves_without_package_breakdown_colors_or_sizes(): void
    {
        $admin = $this->adminUser();
        $uid = uniqid();
        $payload = [
            'name' => 'Minimal Draft ' . $uid,
            'slug' => 'minimal-draft-' . $uid,
            'sku' => 'SKU-DRF-' . $uid,
            'status' => 'draft',
            'wholesale_price' => 10.00,
            'bulk_threshold' => 100,
            'bulk_price' => 9.00,
            'full_stock_price' => 8.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            // Notice: package_allocations, colors, sizes, variants are completely omitted
        ];

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertEquals('draft', $res->json('data.status'));
        $this->assertDatabaseHas('products', [
            'slug' => 'minimal-draft-' . $uid,
            'status' => 'draft',
        ]);
    }
}
