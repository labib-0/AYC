<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPosPhase3BarcodeAndReceiptTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;
    private Product $variantlessProduct;
    private Product $variantProduct;
    private ProductVariant $variantA;
    private ProductVariant $variantB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Seed Permissions
        $posView = Permission::firstOrCreate(
            ['slug' => 'pos.view'],
            ['name' => 'View POS', 'module' => 'POS', 'action' => 'view', 'description' => 'View POS', 'is_system' => true]
        );
        $posCreate = Permission::firstOrCreate(
            ['slug' => 'pos.create'],
            ['name' => 'Create POS Sale', 'module' => 'POS', 'action' => 'create', 'description' => 'Create POS Sale', 'is_system' => true]
        );
        $orderView = Permission::firstOrCreate(
            ['slug' => 'order.view'],
            ['name' => 'View Order', 'module' => 'Order', 'action' => 'view', 'description' => 'View Order', 'is_system' => true]
        );

        $role = Role::firstOrCreate(
            ['slug' => 'pos_operator'],
            ['name' => 'POS Operator', 'description' => 'POS Operator', 'is_system' => false]
        );
        $role->permissions()->syncWithoutDetaching([$posView->id, $posCreate->id, $orderView->id]);

        $this->admin = User::factory()->create([
            'name' => 'Cashier Operator',
            'email' => 'cashier@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status' => 'active',
        ]);
        $this->admin->rbacRoles()->attach($role->id);

        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka Retail Store',
            'code' => 'DHK-RET',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $brand = Brand::create(['name' => 'Ayaan Collection', 'slug' => 'ayaan-collection', 'is_active' => true]);

        // Variantless product
        $this->variantlessProduct = Product::create([
            'name' => 'Premium Heavyweight Hoodie',
            'slug' => 'premium-heavyweight-hoodie',
            'sku' => 'AYC-HD-001',
            'wholesale_price' => 25.00,
            'retail_price' => 35.00,
            'stock' => 50,
            'moq' => 1,
            'status' => 'published',
            'brand_id' => $brand->id,
            'has_variants' => false,
        ]);
        Inventory::create([
            'product_id' => $this->variantlessProduct->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 50,
        ]);

        // Product with variants
        $this->variantProduct = Product::create([
            'name' => 'Classic Cotton Tee',
            'slug' => 'classic-cotton-tee',
            'sku' => 'AYC-TEE-MAIN',
            'wholesale_price' => 10.00,
            'retail_price' => 15.00,
            'stock' => 40,
            'moq' => 1,
            'status' => 'published',
            'brand_id' => $brand->id,
            'has_variants' => true,
        ]);

        $this->variantA = ProductVariant::create([
            'product_id' => $this->variantProduct->id,
            'sku' => 'VAR-TEE-BLK-M',
            'title' => 'Medium / Black',
            'size' => 'M',
            'color' => 'Black',
            'stock' => 20,
            'price' => 10.00,
            'is_active' => true,
        ]);
        Inventory::create([
            'product_id' => $this->variantProduct->id,
            'product_variant_id' => $this->variantA->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 20,
        ]);

        $this->variantB = ProductVariant::create([
            'product_id' => $this->variantProduct->id,
            'sku' => '890123456789', // numeric barcode SKU
            'title' => 'Large / White',
            'size' => 'L',
            'color' => 'White',
            'stock' => 20,
            'price' => 10.00,
            'is_active' => true,
        ]);
        Inventory::create([
            'product_id' => $this->variantProduct->id,
            'product_variant_id' => $this->variantB->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 20,
        ]);
    }

    public function test_exact_sku_search_returns_target_product_first(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->getJson('/api/v1/admin/pos/products?search=AYC-HD-001');
        $res->assertStatus(200);

        $data = $res->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals('AYC-HD-001', $data[0]['sku']);
        $this->assertEquals('Premium Heavyweight Hoodie', $data[0]['name']);
    }

    public function test_alphanumeric_variant_sku_search_resolves_parent_and_variant(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->getJson('/api/v1/admin/pos/products?search=VAR-TEE-BLK-M');
        $res->assertStatus(200);

        $data = $res->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals($this->variantProduct->id, $data[0]['id']);

        $variantMatched = collect($data[0]['variants'])->firstWhere('sku', 'VAR-TEE-BLK-M');
        $this->assertNotNull($variantMatched);
        $this->assertEquals('M', $variantMatched['size']);
    }

    public function test_numeric_variant_sku_barcode_search_resolves_correctly(): void
    {
        Sanctum::actingAs($this->admin);

        // Scan numeric barcode
        $res = $this->getJson('/api/v1/admin/pos/products?search=890123456789');
        $res->assertStatus(200);

        $data = $res->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals($this->variantProduct->id, $data[0]['id']);

        $variantMatched = collect($data[0]['variants'])->firstWhere('sku', '890123456789');
        $this->assertNotNull($variantMatched);
        $this->assertEquals('L', $variantMatched['size']);
    }

    public function test_quick_created_customer_with_synthetic_email_has_unverified_status(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Walk-in Counter Shopper',
            'phone' => '+880 1711 234567',
        ];

        $res = $this->postJson('/api/v1/admin/pos/customers', $payload);
        $res->assertStatus(201);

        $customerId = $res->json('data.id');
        $user = User::findOrFail($customerId);

        // Must end with synthetic domain @ayaan.local
        $this->assertTrue($user->isSyntheticEmail());
        $this->assertStringEndsWith('@ayaan.local', $user->email);
        $this->assertEquals('customer_8801711234567@ayaan.local', $user->email);

        // CRITICAL Task 3 requirement: MUST NOT be falsely marked as verified!
        $this->assertNull($user->email_verified_at, 'Synthetic email address must never be marked as verified.');

        // Outbound mail routing must be suppressed
        $this->assertNull($user->routeNotificationForMail(), 'Mail routing must be null for synthetic customers.');
    }

    public function test_forgot_password_rejects_synthetic_email_addresses(): void
    {
        $res = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'customer_8801711234567@ayaan.local',
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['email']);
    }

    public function test_reprinting_completed_order_is_idempotent_and_causes_no_duplicate_mutations(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. Create sale
        $payload = [
            'is_walkin' => true,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 2,
                ],
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 100.00,
            'paid_amount' => 50.00,
        ];

        $saleRes = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $saleRes->assertStatus(201);
        $orderId = $saleRes->json('data.id');

        // Verify stock deducted
        $stockAfterSale = $this->variantlessProduct->fresh()->stock;
        $this->assertEquals(48, $stockAfterSale);
        $paymentsCount = Payment::where('order_id', $orderId)->count();
        $this->assertEquals(1, $paymentsCount);

        // 2. Simulate cashier reprinting receipt (multiple GET order reads)
        for ($i = 0; $i < 3; $i++) {
            $readRes = $this->getJson("/api/v1/admin/orders/{$orderId}");
            $readRes->assertStatus(200);

            // Verify receipt-required financial and tender metadata
            $readData = $readRes->json('data');
            $this->assertEquals('USD', $readData['currency']);
            $this->assertEquals(50.00, (float) $readData['total_amount']);
            $this->assertEquals(50.00, (float) $readData['paid_amount']);
            $this->assertEquals(100.00, (float) $readData['payment_details']['tendered_amount']);
            $this->assertEquals(50.00, (float) $readData['payment_details']['change_return']);
        }

        // Verify no duplicate inventory deductions or payments occurred
        $this->assertEquals(48, $this->variantlessProduct->fresh()->stock);
        $this->assertEquals(1, Payment::where('order_id', $orderId)->count());
    }

    public function test_order_receipt_excludes_internal_purchase_costs_from_customer_view(): void
    {
        Sanctum::actingAs($this->admin);

        $customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'email' => 'receipt_test@ayaan.local',
        ]);

        $payload = [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_id' => $this->variantlessProduct->id,
                    'quantity' => 1,
                ],
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 50.00,
            'paid_amount' => 25.00,
        ];

        $saleRes = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $saleRes->assertStatus(201);
        $orderId = $saleRes->json('data.id');

        // Customer fetching the order
        Sanctum::actingAs($customer);
        $customerOrderRes = $this->getJson("/api/v1/orders/{$orderId}");
        $customerOrderRes->assertStatus(200);

        $items = $customerOrderRes->json('data.items');
        $this->assertNotEmpty($items);

        foreach ($items as $item) {
            $this->assertArrayNotHasKey('buying_price_at_sale', $item);
            $this->assertArrayNotHasKey('buying_price_at_sale_cents', $item);
            $this->assertArrayNotHasKey('gross_profit', $item);
            $this->assertArrayNotHasKey('cost_price', $item);
            $this->assertArrayNotHasKey('profit_margin', $item);
        }
    }
}
