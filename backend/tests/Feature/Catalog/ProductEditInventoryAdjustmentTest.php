<?php

namespace Tests\Feature\Catalog;

use App\Models\AdminInventoryAdjustment;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductEditInventoryAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $operatorWithoutAdjustPermission;
    protected Brand $brand;
    protected Category $category;
    protected Warehouse $warehouse1;
    protected Warehouse $warehouse2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaan-demo.local',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->operatorWithoutAdjustPermission = User::factory()->create([
            'email' => 'operator@ayaan-demo.local',
            'role' => 'staff',
            'is_super_admin' => false,
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Export',
            'slug' => 'ayaan-export',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Premium Hoodies',
            'slug' => 'premium-hoodies',
            'is_active' => true,
        ]);

        $this->warehouse1 = Warehouse::create([
            'name' => 'Uttara Hub',
            'code' => 'WH-UTTARA-01',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->warehouse2 = Warehouse::create([
            'name' => 'Chittagong Port Terminal',
            'code' => 'WH-CTG-02',
            'city' => 'Chittagong',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Product-level inventory adjustment via /api/v1/admin/inventory/adjust
     */
    public function test_product_level_inventory_adjustment_creates_audit_and_updates_availability(): void
    {
        $product = Product::create([
            'name' => 'Variantless Polo',
            'slug' => 'variantless-polo',
            'sku' => 'AYN-VLP-01',
            'wholesale_price' => 15.00,
            'moq' => 50,
            'stock' => 100,
            'status' => 'published',
        ]);

        $inv = Inventory::create([
            'product_id' => $product->id,
            'product_variant_id' => null,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 100,
        ]);

        $this->assertEquals(100, $product->getOnHandStock());
        $this->assertEquals(100, $product->getTotalAvailableStock());
        $this->assertEquals(2, $product->getAvailableMoqs());

        // Perform audited stock adjustment: add 150 pcs
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse1->id,
            'adjustment_amount' => 150,
            'reason' => 'Physical Audit Correction',
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals(250, $data['product_stock']);
        $this->assertEquals(250, $data['available_stock']);
        $this->assertEquals(250, $data['on_hand_stock']);
        $this->assertEquals(5, $data['available_moqs']); // 250 / 50 = 5

        // Verify database audit log
        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $inv->id,
            'admin_user_id' => $this->admin->id,
            'previous_quantity' => 100,
            'adjustment_amount' => 150,
            'resulting_quantity' => 250,
            'reason' => 'Physical Audit Correction',
        ]);

        // Verify product model authoritative values
        $freshProduct = $product->fresh();
        $this->assertEquals(250, $freshProduct->stock);
        $this->assertEquals(250, $freshProduct->getOnHandStock());
        $this->assertEquals(250, $freshProduct->getTotalAvailableStock());
        $this->assertEquals(5, $freshProduct->getAvailableMoqs());
        $this->assertEquals(50, $freshProduct->moq); // MOQ must remain unchanged!
    }

    /**
     * Test 2: Absolute set quantity inventory adjustment
     */
    public function test_set_absolute_quantity_adjustment(): void
    {
        $product = Product::create([
            'name' => 'Absolute Set Item',
            'slug' => 'absolute-set-item',
            'sku' => 'AYN-ASI-01',
            'wholesale_price' => 10.00,
            'moq' => 25,
            'stock' => 500,
            'status' => 'published',
        ]);

        $inv = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 500,
        ]);

        // Adjust by setting absolute new quantity to 350
        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'inventory_id' => $inv->id,
            'new_quantity' => 350,
            'reason' => 'Factory Shipment Arrival',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $inv->id,
            'previous_quantity' => 500,
            'adjustment_amount' => -150,
            'resulting_quantity' => 350,
            'reason' => 'Factory Shipment Arrival',
        ]);

        $this->assertEquals(350, $inv->fresh()->quantity);
        $this->assertEquals(350, $product->fresh()->getTotalAvailableStock());
        $this->assertEquals(25, $product->fresh()->moq); // MOQ unchanged
    }

    /**
     * Test 3: Multi-warehouse adjustment distributes correctly
     */
    public function test_multi_warehouse_distribution_adjustment(): void
    {
        $product = Product::create([
            'name' => 'Multi Warehouse Jacket',
            'slug' => 'multi-warehouse-jacket',
            'sku' => 'AYN-MWJ-01',
            'wholesale_price' => 20.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        $inv1 = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 80,
        ]);

        $inv2 = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse2->id,
            'quantity' => 120,
        ]);

        $this->assertEquals(200, $product->getOnHandStock());
        $this->assertEquals(200, $product->getTotalAvailableStock());

        // Adjust warehouse 2 specifically by adding 30 pcs
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'inventory_id' => $inv2->id,
            'adjustment_amount' => 30,
            'reason' => 'New Stock Received',
        ]);

        $res->assertStatus(200);

        $this->assertEquals(80, $inv1->fresh()->quantity);
        $this->assertEquals(150, $inv2->fresh()->quantity);
        $this->assertEquals(230, $product->fresh()->getTotalAvailableStock());

        $breakdown = $product->fresh()->getWarehouseStockBreakdown();
        $this->assertCount(2, $breakdown);
    }

    /**
     * Test 4: General product update does NOT overwrite inventory records
     */
    public function test_general_product_update_does_not_wipe_or_overwrite_inventory(): void
    {
        $product = Product::create([
            'name' => 'Original Name Product',
            'slug' => 'original-name-product',
            'sku' => 'AYN-ONP-01',
            'wholesale_price' => 18.00,
            'moq' => 20,
            'status' => 'published',
            'stock' => 300,
        ]);

        $inv = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 300,
        ]);

        // General update changing description and wholesale price
        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'name' => 'Updated Name Product',
            'wholesale_price' => 19.50,
            'description' => 'Updated product description specifications.',
        ]);

        $updateRes->assertStatus(200);

        // Verify inventory remains untouched at 300
        $this->assertEquals(300, $inv->fresh()->quantity);
        $this->assertEquals(300, $product->fresh()->getTotalAvailableStock());
    }

    /**
     * Test 5: Rejection of negative resulting quantity
     */
    public function test_adjustment_rejects_negative_stock(): void
    {
        $product = Product::create([
            'name' => 'Low Stock Product',
            'slug' => 'low-stock-product',
            'sku' => 'AYN-LSP-01',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'stock' => 20,
            'status' => 'published',
        ]);

        $inv = Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse1->id,
            'quantity' => 20,
        ]);

        // Attempt to deduct 50 units (would leave -30)
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'inventory_id' => $inv->id,
            'adjustment_amount' => -50,
            'reason' => 'Damaged Goods Write-off',
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('Cannot reduce stock below zero', $res->json('message'));
        $this->assertEquals(20, $inv->fresh()->quantity);
    }
}
