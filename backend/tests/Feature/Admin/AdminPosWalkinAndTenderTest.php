<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Order\AdminPosSaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPosWalkinAndTenderTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private User $unauthorizedUser;
    private Product $product;
    private Category $mensCategory;
    private Category $womensCategory;
    private Warehouse $warehouse;

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

        $cashierRole = Role::firstOrCreate(
            ['slug' => 'pos_cashier'],
            ['name' => 'POS Cashier', 'description' => 'POS Cashier Role', 'is_system' => false]
        );
        $cashierRole->permissions()->syncWithoutDetaching([$posView->id, $posCreate->id]);

        // 2. Users
        $this->admin = User::factory()->create([
            'name' => 'Store Manager',
            'email' => 'manager@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        $this->cashier = User::factory()->create([
            'name' => 'Counter Cashier',
            'email' => 'cashier@ayaan.local',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);
        $this->cashier->rbacRoles()->attach($cashierRole->id);

        $this->unauthorizedUser = User::factory()->create([
            'name' => 'Ordinary Customer',
            'email' => 'customer@external.com',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ]);

        // 3. Categories, Brand & Products
        $this->mensCategory = Category::create(['name' => "Men's Collection", 'slug' => 'mens-collection']);
        $this->womensCategory = Category::create(['name' => "Women's Collection", 'slug' => 'womens-collection']);

        $brand = Brand::create(['name' => 'Ayaan Casuals', 'slug' => 'ayaan-casuals']);

        $this->product = Product::create([
            'name' => 'Cotton Oxford Shirt',
            'slug' => 'cotton-oxford-shirt',
            'sku' => 'AYN-OXF-001',
            'brand_id' => $brand->id,
            'wholesale_price' => 85.00,
            'msrp_price' => 120.00,
            'moq' => 1,
            'stock' => 50,
            'status' => 'published',
            'is_sold_out' => false,
        ]);
        $this->product->categories()->attach($this->mensCategory->id);

        $this->warehouse = Warehouse::create([
            'name' => 'Main Counter Warehouse',
            'code' => 'WH-POS-01',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        Inventory::create([
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product->id,
            'quantity' => 50,
        ]);
    }

    /**
     * TEST 01: Successful Walk-in Customer retrieval and sale completion.
     */
    public function test_01_successful_walkin_customer_retrieval_and_sale(): void
    {
        Sanctum::actingAs($this->cashier);

        // Fetch walk-in customer endpoint
        $walkinRes = $this->getJson('/api/v1/admin/pos/customers/walkin');
        $walkinRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', AdminPosSaleService::WALKIN_CUSTOMER_EMAIL)
            ->assertJsonPath('data.is_walkin', true);

        $walkinId = $walkinRes->json('data.id');

        // Complete sale using walk-in customer ID or is_walkin flag
        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
            'payment_method' => 'pos_cash',
            'paid_amount' => 85.00,
        ]);

        $saleRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.total_amount', 85)
            ->assertJsonPath('data.paid_amount', 85);

        $orderId = (int) $saleRes->json('data.id');
        $order = Order::find($orderId);
        $this->assertNotNull($order);
        $this->assertEquals($walkinId, $order->user_id);
        $this->assertEquals('pos', $order->order_source);
        $this->assertEquals('Walk-in Customer', $order->shipping_name);
    }

    /**
     * TEST 02: Quick Add Customer creates a new customer and returns it.
     */
    public function test_02_quick_customer_registration_success(): void
    {
        Sanctum::actingAs($this->cashier);

        $res = $this->postJson('/api/v1/admin/pos/customers', [
            'name' => 'Tariq Rahman',
            'phone' => '+880 1711-223344',
            'email' => 'tariq.rahman@example.com',
            'company_name' => 'Tariq Outfits',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Tariq Rahman')
            ->assertJsonPath('data.email', 'tariq.rahman@example.com')
            ->assertJsonPath('data.phone', '+880 1711-223344');

        $this->assertDatabaseHas('users', [
            'name' => 'Tariq Rahman',
            'email' => 'tariq.rahman@example.com',
            'role' => User::ROLE_CUSTOMER,
        ]);
    }

    /**
     * TEST 03: Existing customer matched by email without creating duplicate account.
     */
    public function test_03_quick_customer_matches_existing_by_email(): void
    {
        $existing = User::factory()->create([
            'name' => 'Existing Buyer',
            'email' => 'existing.buyer@example.com',
            'phone' => '+880 1900-112233',
            'role' => User::ROLE_CUSTOMER,
        ]);

        $initialCount = User::where('role', User::ROLE_CUSTOMER)->count();

        Sanctum::actingAs($this->cashier);

        $res = $this->postJson('/api/v1/admin/pos/customers', [
            'name' => 'Existing Buyer Name Modified',
            'email' => 'existing.buyer@example.com',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $existing->id)
            ->assertJsonPath('data.email', 'existing.buyer@example.com');

        $this->assertEquals($initialCount, User::where('role', User::ROLE_CUSTOMER)->count());
    }

    /**
     * TEST 04: Existing customer matched by phone without creating duplicate account.
     */
    public function test_04_quick_customer_matches_existing_by_phone(): void
    {
        $existing = User::factory()->create([
            'name' => 'Phone Buyer',
            'email' => 'phone.buyer@example.com',
            'phone' => '+880 1799-887766',
            'role' => User::ROLE_CUSTOMER,
        ]);

        $initialCount = User::where('role', User::ROLE_CUSTOMER)->count();

        Sanctum::actingAs($this->cashier);

        $res = $this->postJson('/api/v1/admin/pos/customers', [
            'name' => 'Phone Buyer Match',
            'phone' => '+880 1799-887766',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $existing->id);

        $this->assertEquals($initialCount, User::where('role', User::ROLE_CUSTOMER)->count());
    }

    /**
     * TEST 05: Customer validation failures.
     */
    public function test_05_quick_customer_validation_failures(): void
    {
        Sanctum::actingAs($this->cashier);

        // Missing name
        $res1 = $this->postJson('/api/v1/admin/pos/customers', [
            'email' => 'invalid@example.com',
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        // Invalid email format
        $res2 = $this->postJson('/api/v1/admin/pos/customers', [
            'name' => 'Valid Name',
            'email' => 'not-an-email',
        ]);
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * TEST 06: Unauthorized non-admin user cannot access POS endpoints.
     */
    public function test_06_unauthorized_user_forbidden(): void
    {
        Sanctum::actingAs($this->unauthorizedUser);

        $res = $this->getJson('/api/v1/admin/pos/customers/walkin');
        $res->assertStatus(403);

        $res2 = $this->postJson('/api/v1/admin/pos/customers', [
            'name' => 'Test',
        ]);
        $res2->assertStatus(403);
    }

    /**
     * TEST 07: Exact cash payment.
     */
    public function test_07_exact_cash_payment_succeeds_with_zero_change(): void
    {
        Sanctum::actingAs($this->cashier);

        $res = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // $85.00
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 85.00,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.paid_amount', 85)
            ->assertJsonPath('data.balance_due', 0);

        $orderId = (int) $res->json('data.id');
        $order = Order::find($orderId);
        $this->assertEquals(85.00, (float) $order->paid_amount);
        $this->assertEquals(85.00, (float) $order->payment_details['tendered_amount']);
        $this->assertEquals(0.00, (float) $order->payment_details['change_return']);

        $payment = Payment::where('order_id', $orderId)->first();
        $this->assertNotNull($payment);
        $this->assertEquals(85.00, (float) $payment->amount);
    }

    /**
     * TEST 08: Cash overpayment with change calculation (e.g. $100 tendered on $85 total -> $15 change).
     */
    public function test_08_cash_overpayment_calculates_change_and_records_exact_revenue(): void
    {
        Sanctum::actingAs($this->cashier);

        // 1. Live preview calculation
        $previewRes = $this->postJson('/api/v1/admin/pos/calculate', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // $85.00
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 100.00,
        ]);

        $previewRes->assertStatus(200)
            ->assertJsonPath('data.total_amount', 85)
            ->assertJsonPath('data.paid_amount', 85)
            ->assertJsonPath('data.tendered_amount', 100)
            ->assertJsonPath('data.change_return', 15)
            ->assertJsonPath('data.balance_due', 0)
            ->assertJsonPath('data.payment_status', 'paid');

        // 2. Order completion
        $orderRes = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // $85.00
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 100.00,
        ]);

        $orderRes->assertStatus(201)
            ->assertJsonPath('data.total_amount', 85)
            ->assertJsonPath('data.paid_amount', 85)
            ->assertJsonPath('data.balance_due', 0)
            ->assertJsonPath('data.payment_status', 'paid');

        $orderId = (int) $orderRes->json('data.id');
        $order = Order::find($orderId);
        $this->assertEquals(85.00, (float) $order->total_amount);
        $this->assertEquals(85.00, (float) $order->paid_amount);
        $this->assertEquals(100.00, (float) $order->payment_details['tendered_amount']);
        $this->assertEquals(15.00, (float) $order->payment_details['change_return']);

        // Authoritative accounting: Payment amount MUST be $85, NOT $100 revenue!
        $payment = Payment::where('order_id', $orderId)->first();
        $this->assertEquals(85.00, (float) $payment->amount);
        $this->assertEquals(100.00, (float) $payment->payload['tendered_amount']);
        $this->assertEquals(15.00, (float) $payment->payload['change_return']);
    }

    /**
     * TEST 09: Insufficient cash tender is rejected with 422.
     */
    public function test_09_insufficient_cash_tender_is_rejected(): void
    {
        Sanctum::actingAs($this->cashier);

        $res = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // $85.00
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 50.00, // Insufficient: needs $85
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['tendered_amount']);
    }

    /**
     * TEST 10: Non-cash overpayment remains rejected; partial card payment is accepted.
     */
    public function test_10_non_cash_overpayment_rejected_and_partial_card_accepted(): void
    {
        Sanctum::actingAs($this->cashier);

        // Card overpayment rejected
        $overRes = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // $85.00
            ],
            'payment_method' => 'card',
            'paid_amount' => 100.00, // Card cannot overpay
            'payment_reference' => 'CARD-AUTH-1111',
        ]);

        $overRes->assertStatus(422)
            ->assertJsonValidationErrors(['paid_amount']);

        // Card partial payment accepted
        $partialRes = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // $85.00
            ],
            'payment_method' => 'card',
            'paid_amount' => 50.00,
            'payment_reference' => 'CARD-AUTH-2222',
        ]);

        $partialRes->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'partially_paid')
            ->assertJsonPath('data.paid_amount', 50)
            ->assertJsonPath('data.balance_due', 35);
    }

    /**
     * TEST 11: Tampered client totals or client-submitted change amounts are recalculated authoritatively.
     */
    public function test_11_client_tampered_totals_are_ignored(): void
    {
        Sanctum::actingAs($this->cashier);

        // Client attempts to claim total is $10 and change is $90
        $res = $this->postJson('/api/v1/admin/pos/orders', [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1], // Server catalog price is $85
            ],
            'total_amount' => 10.00, // Tampered
            'payment_method' => 'pos_cash',
            'tendered_amount' => 100.00,
            'change_return' => 90.00, // Tampered
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.total_amount', 85)
            ->assertJsonPath('data.paid_amount', 85);

        $orderId = (int) $res->json('data.id');
        $order = Order::find($orderId);
        $this->assertEquals(85.00, (float) $order->total_amount);
        $this->assertEquals(15.00, (float) $order->payment_details['change_return']);
    }

    /**
     * TEST 12: Duplicate checkout attempts with idempotency key do not double deduct stock.
     */
    public function test_12_idempotency_prevents_duplicate_deduction(): void
    {
        Sanctum::actingAs($this->cashier);

        $idempotencyKey = 'pos_test_idem_' . uniqid();
        $initialStock = (int) $this->product->fresh()->stock;

        $payload = [
            'is_walkin' => true,
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
            'payment_method' => 'pos_cash',
            'tendered_amount' => 170.00,
            'idempotency_key' => $idempotencyKey,
        ];

        $res1 = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $res1->assertStatus(201);
        $orderId1 = $res1->json('data.id');

        $res2 = $this->postJson('/api/v1/admin/pos/orders', $payload);
        $res2->assertStatus(201);
        $orderId2 = $res2->json('data.id');

        $this->assertEquals($orderId1, $orderId2);
        // Only deducted 2 pcs once
        $this->assertEquals($initialStock - 2, (int) $this->product->fresh()->stock);
    }

    /**
     * TEST 13: Product lookup supports category filter.
     */
    public function test_13_product_search_supports_category_filtering(): void
    {
        Sanctum::actingAs($this->cashier);

        // Filter by matching category
        $res1 = $this->getJson("/api/v1/admin/pos/products?category_id={$this->mensCategory->id}");
        $res1->assertStatus(200);
        $this->assertCount(1, $res1->json('data'));
        $this->assertEquals($this->product->id, $res1->json('data.0.id'));

        // Filter by non-matching category
        $res2 = $this->getJson("/api/v1/admin/pos/products?category_id={$this->womensCategory->id}");
        $res2->assertStatus(200);
        $this->assertCount(0, $res2->json('data'));
    }
}
