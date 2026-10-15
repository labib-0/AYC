<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\AdminInventoryAdjustment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductActionsAndSoldOutTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'name' => 'Uttara Main Warehouse',
            'code' => 'WH-UTT-01',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * Test: Mark product as sold out zeroes inventory, sets is_sold_out to true,
     * creates an audit trail entry, and keeps the product published.
     */
    public function test_mark_product_as_sold_out_zeroes_inventory_and_records_audit(): void
    {
        $product = Product::factory()->create([
            'name' => 'Premium Oxford Shirt',
            'status' => 'published',
            'is_sold_out' => false,
            'stock' => 150,
        ]);

        $inventory = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 150,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out", [
                'reason' => 'Admin marked product as sold out - Stock depleted',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        // Product stock in database must be 0
        $product->refresh();
        $this->assertEquals(0, $product->stock);
        $this->assertTrue((bool) $product->is_sold_out);
        $this->assertEquals('published', $product->status, 'Product must remain published');

        // Inventory table row must be zeroed
        $inventory->refresh();
        $this->assertEquals(0, $inventory->quantity);

        // Audit adjustment record must exist
        $adjustment = AdminInventoryAdjustment::where('inventory_id', $inventory->id)->first();
        $this->assertNotNull($adjustment);
        $this->assertEquals(150, $adjustment->previous_quantity);
        $this->assertEquals(-150, $adjustment->adjustment_amount);
        $this->assertEquals(0, $adjustment->resulting_quantity);
        $this->assertStringContainsString('Admin marked product as sold out', $adjustment->reason);
        $this->assertEquals($this->admin->id, $adjustment->admin_user_id);
    }

    /**
     * Test: Mark as sold out with product variants zeroes all variant inventories.
     */
    public function test_mark_sold_out_with_variants_zeroes_all_variant_inventories(): void
    {
        $product = Product::factory()->create([
            'name' => 'Multi-Variant Chino Pants',
            'status' => 'published',
            'is_sold_out' => false,
            'stock' => 100,
        ]);

        $v1 = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Size 32 Blue',
            'sku' => 'CHINO-BLUE-32',
            'price' => 25.00,
            'stock' => 60,
        ]);

        $v2 = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Size 34 Blue',
            'sku' => 'CHINO-BLUE-34',
            'price' => 25.00,
            'stock' => 40,
        ]);

        $inv1 = Inventory::create([
            'product_id' => $product->id,
            'product_variant_id' => $v1->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 60,
        ]);

        $inv2 = Inventory::create([
            'product_id' => $product->id,
            'product_variant_id' => $v2->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 40,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out", []);

        $response->assertStatus(200);

        $product->refresh();
        $this->assertEquals(0, $product->stock);
        $this->assertTrue((bool) $product->is_sold_out);

        $v1->refresh();
        $v2->refresh();
        $this->assertEquals(0, $v1->stock);
        $this->assertEquals(0, $v2->stock);

        $inv1->refresh();
        $inv2->refresh();
        $this->assertEquals(0, $inv1->quantity);
        $this->assertEquals(0, $inv2->quantity);

        // Both inventories have adjustment records
        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $inv1->id,
            'resulting_quantity' => 0,
        ]);
        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $inv2->id,
            'resulting_quantity' => 0,
        ]);
    }

    /**
     * Test: Reversing sold out status via adjust stock resetting stock > 0 clears is_sold_out.
     */
    public function test_reversing_sold_out_via_inventory_adjust_resets_sold_out_flag(): void
    {
        $product = Product::factory()->create([
            'name' => 'Restocked Polo',
            'status' => 'published',
            'is_sold_out' => true,
            'stock' => 0,
        ]);

        $inventory = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/inventory/adjust', [
                'inventory_id' => $inventory->id,
                'warehouse_id' => $this->warehouse->id,
                'new_quantity' => 200,
                'reason' => 'Factory restock shipment arrived',
            ]);

        $response->assertStatus(200);

        $product->refresh();
        $this->assertEquals(200, $product->stock);
        $this->assertFalse((bool) $product->is_sold_out, 'is_sold_out must be false after stock replenished > 0');

        $inventory->refresh();
        $this->assertEquals(200, $inventory->quantity);
    }

    /**
     * Test: Stock history endpoint returns all adjustments for a product.
     */
    public function test_product_stock_history_returns_adjustments(): void
    {
        $product = Product::factory()->create([
            'name' => 'Denim Jacket',
            'stock' => 50,
        ]);

        $inventory = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 50,
        ]);

        AdminInventoryAdjustment::create([
            'inventory_id' => $inventory->id,
            'admin_user_id' => $this->admin->id,
            'previous_quantity' => 20,
            'adjustment_amount' => 30,
            'resulting_quantity' => 50,
            'reason' => 'Initial batch addition',
            'created_at' => now()->subDay(),
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out");

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/inventory/products/{$product->id}/history");

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertIsArray($data);
        $this->assertGreaterThanOrEqual(2, count($data));

        // Fallback endpoint test
        $fallbackResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/products/{$product->id}/stock-history");
        $fallbackResponse->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, count($fallbackResponse->json()));
    }

    /**
     * Test: Unauthorized user (unauthenticated or regular customer) cannot mark as sold out.
     */
    public function test_unauthorized_user_cannot_mark_product_as_sold_out(): void
    {
        $product = Product::factory()->create([
            'stock' => 50,
        ]);

        // Unauthenticated
        $unauthResponse = $this->postJson("/api/v1/products/{$product->id}/mark-sold-out", []);
        $unauthResponse->assertStatus(401);

        // Regular customer
        $customer = User::factory()->create(['role' => 'customer']);
        $custResponse = $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out", []);
        $custResponse->assertStatus(403);
    }

    /**
     * Test: Public storefront show endpoint returns is_sold_out true and stock 0.
     */
    public function test_public_storefront_reflects_sold_out_state(): void
    {
        $product = Product::factory()->create([
            'name' => 'Storefront Check Jacket',
            'slug' => 'storefront-check-jacket',
            'status' => 'published',
            'stock' => 10,
            'is_sold_out' => false,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 10,
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out");

        // Public GET without auth
        $showResponse = $this->getJson("/api/v1/products/{$product->slug}");
        $showResponse->assertStatus(200);
        $data = $showResponse->json('data') ?? $showResponse->json();
        $this->assertTrue((bool) ($data['is_sold_out'] ?? false));
        $this->assertEquals(0, $data['stock'] ?? null);
    }

    /**
     * Test: Repeated mark sold out invocations are safe and idempotent.
     */
    public function test_consecutive_mark_sold_out_is_safe_and_idempotent(): void
    {
        $product = Product::factory()->create([
            'stock' => 30,
            'is_sold_out' => false,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 30,
        ]);

        // First call
        $first = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out");
        $first->assertStatus(200);

        // Second call (already sold out)
        $second = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$product->id}/mark-sold-out");
        $second->assertStatus(200);

        $product->refresh();
        $this->assertEquals(0, $product->stock);
        $this->assertTrue((bool) $product->is_sold_out);
    }
}
