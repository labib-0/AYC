<?php

namespace Tests\Feature\Admin;

use App\Models\AdminInventoryAdjustment;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected User $wholesaleCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@ayaan.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Regular Customer',
            'email' => 'customer@ayaan.com',
            'role' => 'customer',
        ]);

        $this->wholesaleCustomer = User::factory()->create([
            'name' => 'B2B Wholesale Customer',
            'email' => 'wholesale@company.com',
            'role' => 'customer',
            'b2b_approval_status' => 'approved',
        ]);
    }

    // =========================================================================
    // 1. Authorization & Role Security Tests
    // =========================================================================

    public function test_unauthenticated_user_cannot_access_admin_endpoints(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);
        $this->getJson('/api/v1/admin/orders')->assertStatus(401);
        $this->getJson('/api/v1/admin/customers')->assertStatus(401);
        $this->getJson('/api/v1/admin/inventory')->assertStatus(401);
        $this->getJson('/api/v1/admin/coupons')->assertStatus(401);
        $this->getJson('/api/v1/admin/promotions')->assertStatus(404);
    }

    public function test_customer_and_wholesale_customer_are_forbidden_from_admin_endpoints(): void
    {
        // Customer
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/customers')
            ->assertStatus(403);

        // Wholesale Customer
        $this->actingAs($this->wholesaleCustomer, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        $this->actingAs($this->wholesaleCustomer, 'sanctum')
            ->getJson('/api/v1/admin/inventory')
            ->assertStatus(403);
    }

    // =========================================================================
    // 2. Admin Dashboard Metrics Tests
    // =========================================================================

    public function test_admin_can_retrieve_accurate_live_dashboard_metrics(): void
    {
        Product::factory()->count(5)->create(['status' => 'published']);
        Product::factory()->count(2)->create(['status' => 'draft']);

        Order::create([
            'order_number' => 'ORD-101',
            'status' => 'delivered',
            'payment_status' => 'paid',
            'fulfillment_status' => 'fulfilled',
            'currency' => 'USD',
            'subtotal' => 200.00,
            'shipping_cost' => 0.00,
            'tax_amount' => 10.00,
            'discount_amount' => 0.00,
            'total_amount' => 210.00,
            'email' => 'buyer@test.com',
            'shipping_name' => 'Buyer',
            'shipping_address1' => 'Street',
            'shipping_city' => 'City',
            'shipping_postal_code' => '10000',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_products' => 7,
                    'active_products' => 5,
                    'total_orders' => 1,
                    'delivered_orders' => 1,
                    'revenue' => 210.00,
                ],
            ]);
    }

    // =========================================================================
    // 3. Product & Variants Management Tests
    // =========================================================================

    public function test_admin_can_create_product_with_variants_and_images(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Main Center',
            'code' => 'WH-MAIN',
            'country_code' => 'US',
            'is_active' => true,
        ]);

        $category = Category::create(['name' => 'Sweaters', 'slug' => 'sweaters']);
        $brand = Brand::create(['name' => 'Polo', 'slug' => 'polo']);

        $payload = [
            'product_id' => 'AYC-SWT-001',
            'name' => 'Cashmere Knit Sweater',
            'slug' => 'cashmere-knit-sweater',
            'sku' => 'POL-SWT-001',
            'brand_id' => $brand->id,
            'wholesale_price' => 85.00,
            'bulk_threshold' => 100,
            'bulk_price' => 75.00,
            'full_stock_price' => 65.00,
            'warehouse_id' => $warehouse->id,
            'msrp_price' => 150.00,
            'moq' => 10,
            'status' => 'published',
            'categories' => [$category->id],
            'images' => [
                ['image_url' => 'https://example.com/img1.jpg', 'is_primary' => true],
                ['image_url' => 'https://example.com/img2.jpg', 'is_primary' => false],
            ],
            'variants' => [
                ['size' => 'M', 'color' => 'Navy', 'stock' => 150],
                ['size' => 'L', 'color' => 'Navy', 'stock' => 200],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Cashmere Knit Sweater',
                    'sku' => 'POL-SWT-001',
                    'wholesalePrice' => 85.00,
                ],
            ]);

        $this->assertDatabaseHas('products', ['sku' => 'POL-SWT-001']);
        $this->assertDatabaseHas('product_variants', ['size' => 'M', 'color' => 'Navy', 'stock' => 150]);
        $this->assertDatabaseHas('product_images', ['image_url' => 'https://example.com/img1.jpg', 'is_primary' => true]);
    }

    public function test_admin_can_update_and_delete_product(): void
    {
        $product = Product::factory()->create(['wholesale_price' => 50.00, 'name' => 'Old Name']);

        // Update
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$product->id}", [
                'name' => 'Updated Product Name',
                'wholesale_price' => 65.00,
            ])
            ->assertStatus(200)
            ->assertJson([
                'data' => [
                    'name' => 'Updated Product Name',
                    'wholesalePrice' => 65.00,
                ],
            ]);


        // Delete
        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/products/{$product->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    // =========================================================================
    // 4. Category Management & Circular Reference Prevention Tests
    // =========================================================================

    public function test_admin_can_manage_category_hierarchy_and_circular_parent_is_rejected(): void
    {
        $parentCat = Category::create(['name' => 'Mens', 'slug' => 'mens']);
        $childCat = Category::create(['name' => 'Shirts', 'slug' => 'shirts', 'parent_id' => $parentCat->id]);

        // Valid update
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/categories/{$childCat->id}", ['name' => 'Formal Shirts'])
            ->assertStatus(200);

        // Circular parent rejection: category cannot be its own parent
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/categories/{$childCat->id}", ['parent_id' => $childCat->id])
            ->assertStatus(422);

        // Circular parent rejection: parent cannot set its descendant as parent
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/categories/{$parentCat->id}", ['parent_id' => $childCat->id])
            ->assertStatus(422);
    }

    // =========================================================================
    // 5. Brand Management Tests
    // =========================================================================

    public function test_admin_can_crud_brands(): void
    {
        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/brands', [
                'name' => 'Under Armour',
                'slug' => 'under-armour',
                'logo_url' => 'https://example.com/ua.png',
                'website' => 'https://underarmour.com',
            ]);

        $createRes->assertStatus(201);
        $brandId = $createRes->json('data.id');

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/brands/{$brandId}", ['name' => 'Under Armour Inc'])
            ->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/brands/{$brandId}")
            ->assertStatus(200);
    }

    // =========================================================================
    // 6. Inventory & Warehouse Management Tests
    // =========================================================================

    public function test_admin_can_list_and_safely_adjust_inventory_with_audit_trail(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'code' => 'WH-CENTRAL',
            'country_code' => 'US',
            'is_active' => true,
        ]);

        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 100]);
        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
        ]);

        // Adjustment +50
        $adjRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/inventory/adjust', [
                'inventory_id' => $inventory->id,
                'adjustment_amount' => 50,
                'reason' => 'Received supplier shipment batch #992',
            ]);

        $adjRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'variant_total_stock' => 150,
                ],
            ]);

        $this->assertDatabaseHas('inventories', ['id' => $inventory->id, 'quantity' => 150]);
        $this->assertDatabaseHas('product_variants', ['id' => $variant->id, 'stock' => 150]);
        $this->assertDatabaseHas('admin_inventory_adjustments', [
            'inventory_id' => $inventory->id,
            'admin_user_id' => $this->admin->id,
            'previous_quantity' => 100,
            'adjustment_amount' => 50,
            'resulting_quantity' => 150,
            'reason' => 'Received supplier shipment batch #992',
        ]);
    }

    public function test_negative_inventory_adjustment_is_rejected(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'code' => 'WH-CENTRAL-2',
            'country_code' => 'US',
            'is_active' => true,
        ]);

        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 20]);
        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 20,
        ]);

        // Try subtracting 50 from 20 (resulting in -30)
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/inventory/adjust', [
                'inventory_id' => $inventory->id,
                'adjustment_amount' => -50,
                'reason' => 'Test invalid adjustment',
            ])
            ->assertStatus(422);

        // Inventory should remain 20
        $this->assertEquals(20, $inventory->fresh()->quantity);
    }

    public function test_inventory_summary_returns_zeros_when_database_is_empty(): void
    {
        Inventory::query()->delete();
        ProductVariant::query()->delete();
        Product::query()->delete();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'totalItems' => 0,
                    'totalQuantity' => 0,
                    'inStock' => 0,
                    'lowStock' => 0,
                    'outOfStock' => 0,
                ],
            ]);

        // Empty inventory table index verification
        $indexRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory');

        $indexRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total' => 0,
                    'data' => [],
                ],
            ]);
    }

    public function test_inventory_summary_and_status_counts_are_dynamically_calculated_from_database(): void
    {
        Inventory::query()->delete();
        ProductVariant::query()->delete();
        Product::query()->delete();

        $warehouse = Warehouse::create([
            'name' => 'Uttara Warehouse',
            'code' => 'WH-UTT-TEST',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $product1 = Product::factory()->create();
        $varInStock = ProductVariant::factory()->create(['product_id' => $product1->id, 'stock' => 500]);
        Inventory::create([
            'product_variant_id' => $varInStock->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 500,
        ]);

        $product2 = Product::factory()->create();
        $varLowStock = ProductVariant::factory()->create(['product_id' => $product2->id, 'stock' => 50]);
        Inventory::create([
            'product_variant_id' => $varLowStock->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 50,
        ]);

        $product3 = Product::factory()->create();
        $varOutOfStock = ProductVariant::factory()->create(['product_id' => $product3->id, 'stock' => 0]);
        Inventory::create([
            'product_variant_id' => $varOutOfStock->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/inventory/summary');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'totalItems' => 3,
                    'totalQuantity' => 550,
                    'inStock' => 1,
                    'lowStock' => 1,
                    'outOfStock' => 1,
                ],
            ]);
    }

    public function test_inventory_history_retrieves_audit_adjustments(): void
    {
        $warehouse = Warehouse::create([
            'name' => 'History Hub',
            'code' => 'WH-HIST',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 100]);
        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 100,
        ]);

        // Create adjustment
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/inventory/adjust', [
                'inventory_id' => $inventory->id,
                'adjustment_amount' => 50,
                'reason' => 'Audit check',
            ]);

        $historyRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/inventory/{$inventory->id}/history");

        $historyRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertCount(1, $historyRes->json('data'));
        $this->assertEquals('Audit check', $historyRes->json('data.0.reason'));
    }

    // =========================================================================
    // 7. Customer Accounts Management Tests
    // =========================================================================

    public function test_admin_can_list_and_inspect_customers_without_sensitive_leakage(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'email',
                            'role',
                            'orders_count',
                            'total_spent',
                            'created_at',
                        ],
                    ],
                ],
            ]);

        // Ensure password and remember_token are NOT present in output
        $content = $response->getContent();
        $this->assertStringNotContainsString('password', $content);
        $this->assertStringNotContainsString('remember_token', $content);
    }

    // =========================================================================
    // 8. Order Management, Status Transitions, and Payment Proof Review Tests
    // =========================================================================

    public function test_admin_can_transition_order_status_and_invalid_transitions_are_rejected(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-TRANS-1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 100.00,
            'shipping_cost' => 15.00,
            'tax_amount' => 5.00,
            'discount_amount' => 0.00,
            'total_amount' => 120.00,
            'email' => 'test@buyer.com',
            'shipping_name' => 'Test Buyer',
            'shipping_address1' => '123 Test St',
            'shipping_city' => 'Dallas',
            'shipping_postal_code' => '75001',
            'shipping_country_code' => 'US',
            'payment_method' => 'bank_transfer',
        ]);

        // 1. Pending -> Processing (Valid)
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'processing',
                'note' => 'Payment verified by accounting.',
            ])
            ->assertStatus(200)
            ->assertJson(['data' => ['status' => 'processing']]);

        // 2. Processing -> Shipped (Valid)
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'shipped',
            ])
            ->assertStatus(200);

        // 3. Shipped -> Delivered (Valid)
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'delivered',
            ])
            ->assertStatus(200);

        // 4. Delivered -> Pending (Invalid Transition -> Rejected)
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'pending',
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_approve_and_reject_offline_payment_proof(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-PROOF-1',
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 150.00,
            'shipping_cost' => 0.00,
            'tax_amount' => 7.50,
            'discount_amount' => 0.00,
            'total_amount' => 157.50,
            'email' => 'bankpayer@ayaan.com',
            'shipping_name' => 'Bank Payer',
            'shipping_address1' => 'Main Ave',
            'shipping_city' => 'Austin',
            'shipping_postal_code' => '73301',
            'shipping_country_code' => 'US',
            'payment_method' => 'bank_transfer',
            'payment_proof_url' => 'https://example.com/receipts/proof.jpg',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'transaction_id' => 'txn_pending_1',
            'provider' => 'bank_transfer',
            'amount' => 157.50,
            'currency' => 'USD',
            'status' => 'pending',
        ]);

        // Admin approves payment proof
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
                'action' => 'approve',
                'note' => 'Deposit matching Chase Bank ref #98721',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'payment_status' => 'paid',
                    'status' => 'processing',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
            'status' => 'processing',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'succeeded',
        ]);
    }

    // =========================================================================
    // 9. Coupons Management Tests (Promotions Endpoint Removed)
    // =========================================================================

    public function test_admin_can_manage_coupons(): void
    {
        // 1. Obsolete promotions endpoint must be 404
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/promotions')
            ->assertStatus(404);

        // 2. Create Discount Coupon
        $couponRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'VIPWHOLESALE20',
                'discount_type' => 'percentage',
                'discount_value' => 20.00,
                'min_spend' => 100.00,
                'usage_limit' => 50,
                'is_active' => true,
            ]);

        $couponRes->assertStatus(201);
        $couponId = $couponRes->json('data.id');

        $this->assertDatabaseHas('coupons', ['id' => $couponId, 'code' => 'VIPWHOLESALE20']);
    }
}
