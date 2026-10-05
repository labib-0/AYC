<?php

namespace Tests\Feature\Admin;

use App\Models\AdminInventoryAdjustment;
use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPosSaleWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $posAdmin;
    private User $unauthorizedAdmin;
    private User $customer;
    private Warehouse $warehouse;
    private Product $variantlessProduct;
    private Product $variantProduct;
    private ProductVariant $variantM;
    private ProductVariant $variantL;
    private Product $moqProduct;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Seed POS Permissions
        $posViewPerm = Permission::firstOrCreate(
            ['slug' => 'pos.view'],
            ['name' => 'View POS', 'module' => 'POS', 'action' => 'view', 'description' => 'View POS', 'is_system' => true]
        );
        $posCreatePerm = Permission::firstOrCreate(
            ['slug' => 'pos.create'],
            ['name' => 'Create POS Sale', 'module' => 'POS', 'action' => 'create', 'description' => 'Create POS Sale', 'is_system' => true]
        );

        $posRole = Role::firstOrCreate(
            ['slug' => 'pos_operator'],
            ['name' => 'POS Operator', 'description' => 'POS Operator Role', 'is_system' => false]
        );
        $posRole->permissions()->syncWithoutDetaching([$posViewPerm->id, $posCreatePerm->id]);

        // 2. Create Users
        $this->superAdmin = User::factory()->create([
            'name' => 'Super Admin Boss',
            'email' => 'super@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        $this->posAdmin = User::factory()->create([
            'name' => 'POS Admin Operator',
            'email' => 'posoperator@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);
        $this->posAdmin->rbacRoles()->attach($posRole->id);

        $this->unauthorizedAdmin = User::factory()->create([
            'name' => 'Unauthorized Admin',
            'email' => 'no_pos@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Rahim Chowdhury',
            'email' => 'rahim@retailer.com',
            'phone' => '+8801711000111',
            'company_name' => 'Rahim Fashions Ltd',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ]);

        // 3. Create Warehouse
        $this->warehouse = Warehouse::firstOrCreate(
            ['code' => 'WH-POS-01'],
            ['name' => 'Central POS Warehouse', 'country_code' => 'BD', 'is_active' => true]
        );

        $brand = Brand::create(['name' => 'Ayaan Classics', 'slug' => 'ayaan-classics']);

        // 4. Variantless Product (stock: 50, price: $25)
        $this->variantlessProduct = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Canvas Tote Bag',
            'slug' => 'canvas-tote-bag',
            'sku' => 'AYN-TOTE-001',
            'wholesale_price' => 25.00,
            'stock' => 50,
            'moq' => 1,
            'status' => 'published',
        ]);
        Inventory::create([
            'product_id' => $this->variantlessProduct->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 50,
        ]);

        // 5. Variant Product (M: 30, L: 40, price: $40)
        $this->variantProduct = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Premium Oxford Shirt',
            'slug' => 'premium-oxford-shirt',
            'sku' => 'AYN-OXF-001',
            'wholesale_price' => 40.00,
            'stock' => 70,
            'moq' => 1,
            'status' => 'published',
        ]);
        $this->variantM = ProductVariant::create([
            'product_id' => $this->variantProduct->id,
            'sku' => 'AYN-OXF-001-BLU-M',
            'title' => 'Blue / M',
            'size' => 'M',
            'color' => 'Blue',
            'stock' => 30,
            'price' => 40.00,
            'is_active' => true,
        ]);
        Inventory::create([
            'product_id' => $this->variantProduct->id,
            'product_variant_id' => $this->variantM->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 30,
        ]);

        $this->variantL = ProductVariant::create([
            'product_id' => $this->variantProduct->id,
            'sku' => 'AYN-OXF-001-BLU-L',
            'title' => 'Blue / L',
            'size' => 'L',
            'color' => 'Blue',
            'stock' => 40,
            'price' => 40.00,
            'is_active' => true,
        ]);
        Inventory::create([
            'product_id' => $this->variantProduct->id,
            'product_variant_id' => $this->variantL->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 40,
        ]);

        // 6. MOQ Product (MOQ: 10, stock: 100, price: $15)
        $this->moqProduct = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Bulk Crew Neck Tee',
            'slug' => 'bulk-crew-neck-tee',
            'sku' => 'AYN-TEE-BULK',
            'wholesale_price' => 15.00,
            'stock' => 100,
            'moq' => 10,
            'status' => 'published',
        ]);
        Inventory::create([
            'product_id' => $this->moqProduct->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
        ]);
    }

    /**
     * TEST 1: Authorized Admin opens POS -> success.
     */
    public function test_01_authorized_admin_opens_pos(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->getJson('/api/v1/admin/pos/products');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    /**
     * TEST 2: Admin without POS permission -> 403.
     */
    public function test_02_admin_without_pos_permission_receives_403(): void
    {
        Sanctum::actingAs($this->unauthorizedAdmin);

        $response = $this->getJson('/api/v1/admin/pos/products');

        $response->assertStatus(403);
    }

    /**
     * TEST 3: Customer accesses POS API -> 403.
     */
    public function test_03_customer_accesses_pos_api_receives_403(): void
    {
        Sanctum::actingAs($this->customer);

        $response = $this->getJson('/api/v1/admin/pos/products');

        $response->assertStatus(403);
    }

    /**
     * TEST 4: Search existing customer -> correct results.
     */
    public function test_04_search_existing_customer(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->getJson('/api/v1/admin/pos/customers?search=Rahim');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['name' => 'Rahim Chowdhury', 'email' => 'rahim@retailer.com']);
    }

    /**
     * TEST 5: Search product -> correct results.
     */
    public function test_05_search_product(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->getJson('/api/v1/admin/pos/products?search=Oxford');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonFragment(['sku' => 'AYN-OXF-001', 'name' => 'Premium Oxford Shirt']);
    }

    /**
     * TEST 6: Add variantless product -> correct line.
     */
    public function test_06_add_variantless_product(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 2,
                ]
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 50)
            ->assertJsonPath('data.lines.0.product_name', 'Canvas Tote Bag')
            ->assertJsonPath('data.lines.0.quantity', 2)
            ->assertJsonPath('data.lines.0.unit_price', 25);
    }

    /**
     * TEST 7: Add variant product -> correct variant.
     */
    public function test_07_add_variant_product(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantProduct->id,
                    'variant_id' => $this->variantM->id,
                    'size' => 'M',
                    'quantity' => 3,
                ]
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 120)
            ->assertJsonPath('data.lines.0.size', 'M')
            ->assertJsonPath('data.lines.0.quantity', 3);
    }

    /**
     * TEST 8: Multiple products -> correct order lines.
     */
    public function test_08_multiple_products(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 2, // 2 * 25 = 50
                ],
                [
                    'product_id' => $this->variantProduct->id,
                    'variant_id' => $this->variantL->id,
                    'size' => 'L',
                    'quantity' => 1, // 1 * 40 = 40
                ]
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 90)
            ->assertJsonCount(2, 'data.lines');
    }

    /**
     * TEST 9: Valid quantity -> accepted.
     */
    public function test_09_valid_quantity_accepted(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 5,
                ]
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.subtotal', 125);
    }

    /**
     * TEST 10: MOQ violation -> rejected.
     */
    public function test_10_moq_violation_rejected(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->moqProduct->id,
                    'quantity' => 5, // MOQ is 10
                ]
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /**
     * TEST 11: Insufficient stock -> rejected.
     */
    public function test_11_insufficient_stock_rejected(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/calculate', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 999, // available is 50
                ]
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /**
     * TEST 12: Concurrent stock reduction -> final backend validation rejects stale quantity.
     */
    public function test_12_concurrent_stock_reduction_rejects_stale_quantity(): void
    {
        Sanctum::actingAs($this->posAdmin);

        // Before submit, another process consumes stock down to 1
        $this->variantlessProduct->update(['stock' => 1]);
        Inventory::where('product_id', $this->variantlessProduct->id)->update(['quantity' => 1]);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 5, // Wants 5, but only 1 left
                ]
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /**
     * TEST 13: Successful POS order -> one real Order created.
     */
    public function test_13_successful_pos_order_creates_one_real_order(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $initialOrderCount = Order::count();

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 2,
                ]
            ],
            'payment_method' => 'pos_cash',
            'notes' => 'Walk-in cash customer',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertEquals($initialOrderCount + 1, Order::count());

        $order = Order::latest('id')->first();
        $this->assertEquals('pos', $order->order_source);
        $this->assertEquals($this->customer->id, $order->user_id);
    }

    /**
     * TEST 14: Successful POS order -> inventory deducted correctly.
     */
    public function test_14_successful_pos_order_deducts_inventory(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $startStock = $this->variantM->stock; // 30
        $startInv = Inventory::where('product_variant_id', $this->variantM->id)->first()->quantity;

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantProduct->id,
                    'variant_id' => $this->variantM->id,
                    'size' => 'M',
                    'quantity' => 4,
                ]
            ],
        ]);

        $response->assertStatus(201);

        $this->variantM->refresh();
        $endInv = Inventory::where('product_variant_id', $this->variantM->id)->first()->quantity;

        $this->assertEquals($startStock - 4, $this->variantM->stock);
        $this->assertEquals($startInv - 4, $endInv);
    }

    /**
     * TEST 15: Successful POS order -> inventory transaction recorded.
     */
    public function test_15_successful_pos_order_records_inventory_adjustment(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 3,
                ]
            ],
        ]);

        $response->assertStatus(201);

        $orderNumber = $response->json('data.order_number');
        $adjustment = AdminInventoryAdjustment::latest('id')->first();

        $this->assertNotNull($adjustment);
        $this->assertEquals($this->posAdmin->id, $adjustment->admin_user_id);
        $this->assertEquals(-3, $adjustment->adjustment_amount);
        $this->assertStringContainsString($orderNumber, $adjustment->reason);
    }

    /**
     * TEST 16: Successful POS order -> Admin/operator attribution exists.
     */
    public function test_16_successful_pos_order_operator_attribution(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 1,
                ]
            ],
        ]);

        $response->assertStatus(201);

        $order = Order::latest('id')->first();
        $this->assertEquals($this->posAdmin->id, $order->created_by_admin_id);
        $this->assertEquals($this->customer->id, $order->user_id);
        $this->assertNotEquals($order->created_by_admin_id, $order->user_id);
    }

    /**
     * TEST 17: Successful POS order -> appears in Admin Orders.
     */
    public function test_17_pos_order_appears_in_admin_orders(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $order = Order::create([
            'order_number' => 'AYN-POS-TEST-001',
            'user_id' => $this->customer->id,
            'created_by_admin_id' => $this->posAdmin->id,
            'order_source' => 'pos',
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'subtotal' => 50.00,
            'total_amount' => 52.50,
            'shipping_name' => $this->customer->name,
            'shipping_address1' => '123 POS Road',
            'shipping_city' => 'Dhaka',
            'shipping_region' => 'Dhaka',
            'shipping_postal_code' => '1230',
            'email' => $this->customer->email,
            'shipping_country_code' => 'BD',
            'shipping_method' => 'POS',
            'payment_method' => 'pos_cash',
            'placed_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/admin/orders');

        $response->assertStatus(200)
            ->assertJsonFragment(['order_number' => 'AYN-POS-TEST-001', 'order_source' => 'pos']);
    }

    /**
     * TEST 18: Successful POS order -> appears in customer's order history without operator identity.
     */
    public function test_18_pos_order_appears_in_customer_order_history_safely(): void
    {
        $order = Order::create([
            'order_number' => 'AYN-POS-CUST-001',
            'user_id' => $this->customer->id,
            'created_by_admin_id' => $this->posAdmin->id,
            'order_source' => 'pos',
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'subtotal' => 80.00,
            'total_amount' => 84.00,
            'shipping_name' => $this->customer->name,
            'shipping_address1' => '123 POS Road',
            'shipping_city' => 'Dhaka',
            'shipping_region' => 'Dhaka',
            'shipping_postal_code' => '1230',
            'email' => $this->customer->email,
            'shipping_country_code' => 'BD',
            'shipping_method' => 'POS In-Store',
            'payment_method' => 'pos_cash',
            'placed_at' => now(),
        ]);

        Sanctum::actingAs($this->customer);

        $response = $this->getJson('/api/v1/orders');

        $response->assertStatus(200)
            ->assertJsonFragment(['order_number' => 'AYN-POS-CUST-001'])
            ->assertJsonMissing(['created_by_admin_id' => (string) $this->posAdmin->id])
            ->assertJsonMissing(['created_by_admin' => ['name' => $this->posAdmin->name]]);
    }

    /**
     * TEST 19: Double submission -> only one order.
     */
    public function test_19_double_submission_protection(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $payload = [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 1,
                ]
            ],
            'idempotency_key' => 'idem_key_unique_test_123',
        ];

        $initialCount = Order::count();

        // First click
        $res1 = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $res1->assertStatus(201);
        $firstOrderId = $res1->json('data.id');

        // Immediate duplicate click with same idempotency key
        $res2 = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $res2->assertStatus(201);
        $secondOrderId = $res2->json('data.id');

        $this->assertEquals($firstOrderId, $secondOrderId);
        $this->assertEquals($initialCount + 1, Order::count());
    }

    /**
     * TEST 20: Failed transaction -> no partial order/inventory deduction.
     */
    public function test_20_failed_transaction_rolls_back_atomically(): void
    {
        Sanctum::actingAs($this->posAdmin);

        $initialOrders = Order::count();
        $startToteStock = $this->variantlessProduct->stock;
        $startShirtStock = $this->variantM->stock;

        // Try sale with 1 valid item and 1 item that fails stock check (wants 999)
        $response = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 2, // Valid
                ],
                [
                    'product_id' => $this->variantProduct->id,
                    'variant_id' => $this->variantM->id,
                    'size' => 'M',
                    'quantity' => 999, // Impossible stock -> triggers failure
                ]
            ],
        ]);

        $response->assertStatus(422);

        // Verify total rollback
        $this->assertEquals($initialOrders, Order::count());
        $this->assertEquals($startToteStock, $this->variantlessProduct->fresh()->stock);
        $this->assertEquals($startShirtStock, $this->variantM->fresh()->stock);
    }
}
