<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests for:
 * 1. Purchase Price field (cost_price) editable via admin API
 * 2. purchase_price_updated_at stamped when cost_price > 0
 * 3. purchase_price_updated_at NOT set when no cost_price
 * 4. Admin resource exposes purchasePriceUpdated status
 * 5. Customer API does NOT leak cost_price or purchasePriceUpdated
 * 6. Filter by purchase_price_status pending / updated
 */
class PurchasePriceTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouse = Warehouse::create([
            'name' => 'Test Warehouse',
            'code' => 'WH-TEST-' . uniqid(),
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    private function adminUser(): User
    {
        return User::factory()->create([
            'email' => 'admin_ppt_' . uniqid() . '@ayaan-test.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
    }

    private function customerUser(): User
    {
        return User::factory()->create([
            'email' => 'customer_ppt_' . uniqid() . '@ayaan-test.local',
            'role' => 'customer',
        ]);
    }

    private function minimalProductPayload(array $overrides = []): array
    {
        $uid = strtolower(substr(uniqid(), -6));
        return array_merge([
            'name' => 'Test Tee ' . $uid,
            'slug' => 'test-tee-' . $uid,
            'sku' => 'AYN-TEST-' . strtoupper($uid),
            'wholesale_price' => 25.00,
            'full_stock_price' => 18.00,
            'bulk_threshold' => 200,
            'bulk_price' => 20.00,
            'warehouse_id' => $this->warehouse->id,
            'initial_stock' => 500,
            'moq' => 100,
            'status' => 'draft',
        ], $overrides);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. New product with NO purchase price → purchase_price_updated_at = null
    // ─────────────────────────────────────────────────────────────────────
    public function test_new_product_without_purchase_price_has_pending_status(): void
    {
        $admin = $this->adminUser();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload());

        $response->assertStatus(201);

        $product = Product::find($response->json('data.id'));
        $this->assertNotNull($product);
        $this->assertNull($product->purchase_price_updated_at, 'purchase_price_updated_at should be null when no cost_price given');
        $this->assertFalse($response->json('data.purchasePriceUpdated'));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. New product WITH purchase price → purchase_price_updated_at is set
    // ─────────────────────────────────────────────────────────────────────
    public function test_new_product_with_purchase_price_has_updated_status(): void
    {
        $admin = $this->adminUser();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload([
                'cost_price' => 8.50,
            ]));

        $response->assertStatus(201);

        $product = Product::find($response->json('data.id'));
        $this->assertNotNull($product->purchase_price_updated_at, 'purchase_price_updated_at should be stamped when cost_price > 0');
        $this->assertEquals(8.50, (float) $product->cost_price);
        $this->assertTrue($response->json('data.purchasePriceUpdated'));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Update product to add purchase price → purchase_price_updated_at set
    // ─────────────────────────────────────────────────────────────────────
    public function test_updating_purchase_price_stamps_updated_at(): void
    {
        $admin = $this->adminUser();

        // Create without purchase price
        $createResponse = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload());
        $createResponse->assertStatus(201);
        $productId = $createResponse->json('data.id');

        $product = Product::find($productId);
        $this->assertNull($product->purchase_price_updated_at);

        // Now update with purchase price
        $updateResponse = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'cost_price' => 9.75,
            ]);

        $updateResponse->assertStatus(200);

        $product->refresh();
        $this->assertNotNull($product->purchase_price_updated_at);
        $this->assertEquals(9.75, (float) $product->cost_price);
        $this->assertTrue($updateResponse->json('data.purchasePriceUpdated'));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Re-editing purchase price → purchase_price_updated_at NOT reset
    // ─────────────────────────────────────────────────────────────────────
    public function test_re_editing_purchase_price_keeps_original_stamp(): void
    {
        $admin = $this->adminUser();

        $createResponse = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload([
                'cost_price' => 10.00,
            ]));
        $productId = $createResponse->json('data.id');

        $product = Product::find($productId);
        $firstStamp = $product->purchase_price_updated_at->toDateTimeString();
        $this->assertNotNull($firstStamp);

        // Update cost_price again
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/products/{$productId}", [
                'cost_price' => 12.00,
            ]);

        $product->refresh();
        // Timestamp must be the ORIGINAL — not overwritten
        $this->assertEquals($firstStamp, $product->purchase_price_updated_at->toDateTimeString());
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. Customer API does NOT leak cost_price or purchasePriceUpdated
    // ─────────────────────────────────────────────────────────────────────
    public function test_customer_api_does_not_leak_purchase_price(): void
    {
        $admin = $this->adminUser();

        $createResponse = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload([
                'cost_price' => 8.50,
                'status' => 'published',
            ]));
        $createResponse->assertStatus(201);
        $productId = $createResponse->json('data.id');

        // Logged-in customer (non-admin) should NOT see cost_price fields
        $customer = $this->customerUser();
        $customerResponse = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/products/{$productId}");
        $customerResponse->assertStatus(200);

        // costPrice must be null — not exposed to non-admin
        $this->assertNull($customerResponse->json('data.costPrice'), 'costPrice must not be exposed to customers');

        // purchasePriceUpdated must be null (not applicable to customers)
        $this->assertNull($customerResponse->json('data.purchasePriceUpdated'), 'purchasePriceUpdated must not be exposed to customers');
        $this->assertNull($customerResponse->json('data.purchasePriceUpdatedAt'));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. Filter by purchase_price_status=pending
    // ─────────────────────────────────────────────────────────────────────
    public function test_filter_by_purchase_price_status_pending(): void
    {
        $admin = $this->adminUser();

        // Create product WITHOUT purchase price
        $pendingResp = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload(['name' => 'Pending Price Product']));
        $pendingResp->assertStatus(201);
        $pendingId = (string) $pendingResp->json('data.id');

        // Create product WITH purchase price
        $updatedResp = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/products', $this->minimalProductPayload([
                'name' => 'Updated Price Product',
                'cost_price' => 7.50,
            ]));
        $updatedResp->assertStatus(201);
        $updatedId = (string) $updatedResp->json('data.id');

        // Filter: pending (isAdmin=1 required for status=all to work)
        $pendingListResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/products?purchase_price_status=pending&isAdmin=1');

        $pendingListResponse->assertStatus(200);

        $ids = collect($pendingListResponse->json('data'))->pluck('id')->map(fn($v) => (string) $v)->toArray();
        $this->assertContains($pendingId, $ids, 'Pending product should appear in pending filter');
        $this->assertNotContains($updatedId, $ids, 'Updated product should NOT appear in pending filter');

        // Filter: updated
        $updatedListResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/products?purchase_price_status=updated&isAdmin=1');

        $updatedListResponse->assertStatus(200);

        $ids2 = collect($updatedListResponse->json('data'))->pluck('id')->map(fn($v) => (string) $v)->toArray();
        $this->assertContains($updatedId, $ids2, 'Updated product should appear in updated filter');
        $this->assertNotContains($pendingId, $ids2, 'Pending product should NOT appear in updated filter');
    }
}
