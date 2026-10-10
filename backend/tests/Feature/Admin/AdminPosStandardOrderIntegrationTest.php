<?php

namespace Tests\Feature\Admin;

use App\Models\AdminInventoryAdjustment;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPosStandardOrderIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private User $posCustomer;
    private User $otherCustomer;
    private Warehouse $warehouse;
    private Product $standardProduct;
    private ProductVariant $variantM;
    private Product $moqProduct;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Seed RBAC Permissions
        $permissions = [
            'pos.view' => ['name' => 'View POS', 'module' => 'POS', 'action' => 'view'],
            'pos.create' => ['name' => 'Create POS Sale', 'module' => 'POS', 'action' => 'create'],
            'order.view' => ['name' => 'View Orders', 'module' => 'Orders', 'action' => 'view'],
            'order.confirm' => ['name' => 'Confirm Order', 'module' => 'Orders', 'action' => 'confirm'],
            'order.mark_processing' => ['name' => 'Mark Processing', 'module' => 'Orders', 'action' => 'mark_processing'],
            'order.mark_shipped' => ['name' => 'Mark Shipped', 'module' => 'Orders', 'action' => 'mark_shipped'],
            'order.update_status' => ['name' => 'Update Status', 'module' => 'Orders', 'action' => 'update_status'],
            'order.update_fulfillment' => ['name' => 'Update Fulfillment', 'module' => 'Orders', 'action' => 'update_fulfillment'],
            'payment.receipt.verify' => ['name' => 'Verify Payment', 'module' => 'Orders', 'action' => 'receipt.verify'],
            'payment.receipt.reject' => ['name' => 'Reject Payment', 'module' => 'Orders', 'action' => 'receipt.reject'],
            'document.view' => ['name' => 'View Documents', 'module' => 'Documents', 'action' => 'view'],
            'document.download' => ['name' => 'Download Documents', 'module' => 'Documents', 'action' => 'download'],
            'document.invoice.generate' => ['name' => 'Generate Invoice', 'module' => 'Documents', 'action' => 'invoice.generate'],
            'document.proforma.generate' => ['name' => 'Generate PI', 'module' => 'Documents', 'action' => 'proforma.generate'],
            'document.commercial_invoice.generate' => ['name' => 'Generate CI', 'module' => 'Documents', 'action' => 'commercial_invoice.generate'],
        ];

        $permissionIds = [];
        foreach ($permissions as $slug => $data) {
            $p = Permission::firstOrCreate(['slug' => $slug], array_merge($data, ['is_system' => true]));
            $permissionIds[] = $p->id;
        }

        $cashierRole = Role::firstOrCreate(
            ['slug' => 'pos_manager'],
            ['name' => 'POS Manager', 'description' => 'Full POS & Order Operations', 'is_system' => false]
        );
        $cashierRole->permissions()->sync($permissionIds);

        // 2. Seed Users
        $this->admin = User::factory()->create([
            'name' => 'Store Super Admin',
            'email' => 'superadmin@ayaanclothing.com',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => true,
            'status' => 'active',
        ]);

        $this->cashier = User::factory()->create([
            'name' => 'Counter Cashier',
            'email' => 'cashier@ayaanclothing.com',
            'role' => User::ROLE_ADMIN,
            'is_super_admin' => false,
            'status' => 'active',
        ]);
        $this->cashier->rbacRoles()->attach($cashierRole->id);

        $this->posCustomer = User::factory()->create([
            'name' => 'Kazi Nazrul',
            'email' => 'nazrul@dhakafashion.com',
            'phone' => '+8801711223344',
            'company_name' => 'Nazrul Outfits Ltd',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ]);

        $this->otherCustomer = User::factory()->create([
            'name' => 'Shamsur Rahman',
            'email' => 'shamsur@otherretail.com',
            'phone' => '+8801799887766',
            'company_name' => 'Shamsur Textiles',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ]);

        // 3. Seed Warehouse & Products
        $this->warehouse = Warehouse::firstOrCreate(
            ['code' => 'WH-UTTARA-01'],
            [
                'name' => 'Uttara Central Warehouse',
                'address' => 'Sector 11, Uttara',
                'city' => 'Dhaka',
                'country_code' => 'BD',
                'is_active' => true,
            ]
        );

        $brand = Brand::create(['name' => 'Ayaan Signature', 'slug' => 'ayaan-signature']);
        $cat = Category::create(['name' => 'Apparel', 'slug' => 'apparel', 'is_active' => true]);

        // Product A: Variant-based (stock 100, price $40.00, MOQ 1)
        $this->standardProduct = Product::create([
            'brand_id' => $brand->id,
            'category_id' => $cat->id,
            'name' => 'Export Poplin Shirt',
            'slug' => 'export-poplin-shirt',
            'sku' => 'EXP-POP-001',
            'wholesale_price' => 40.00,
            'cost_price' => 22.50,
            'stock' => 100,
            'moq' => 1,
            'status' => 'published',
        ]);

        $this->variantM = ProductVariant::create([
            'product_id' => $this->standardProduct->id,
            'sku' => 'EXP-POP-001-WHT-M',
            'title' => 'White / M',
            'size' => 'M',
            'color' => 'White',
            'stock' => 100,
            'price' => 40.00,
            'is_active' => true,
        ]);

        Inventory::create([
            'product_id' => $this->standardProduct->id,
            'product_variant_id' => $this->variantM->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
        ]);

        // Product B: MOQ-based (MOQ 10, stock 80, price $15.00)
        $this->moqProduct = Product::create([
            'brand_id' => $brand->id,
            'category_id' => $cat->id,
            'name' => 'Pima Cotton Tee',
            'slug' => 'pima-cotton-tee',
            'sku' => 'EXP-PIMA-002',
            'wholesale_price' => 15.00,
            'cost_price' => 8.00,
            'stock' => 80,
            'moq' => 10,
            'status' => 'published',
        ]);

        Inventory::create([
            'product_id' => $this->moqProduct->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 80,
        ]);
    }

    /**
     * Scenario 1: Search for an existing customer and select their profile
     */
    public function test_01_search_existing_customer_and_select_profile(): void
    {
        Sanctum::actingAs($this->cashier);

        // Search by name
        $response = $this->getJson('/api/v1/admin/pos/customers?search=Nazrul');
        $response->assertOk()
            ->assertJsonPath('data.0.id', $this->posCustomer->id)
            ->assertJsonPath('data.0.name', 'Kazi Nazrul')
            ->assertJsonPath('data.0.phone', '+8801711223344');

        // Search by phone
        $responsePhone = $this->getJson('/api/v1/admin/pos/customers?search=+8801711223344');
        $responsePhone->assertOk()
            ->assertJsonPath('data.0.id', $this->posCustomer->id);

        // Search by email
        $responseEmail = $this->getJson('/api/v1/admin/pos/customers?search=nazrul@dhakafashion.com');
        $responseEmail->assertOk()
            ->assertJsonPath('data.0.id', $this->posCustomer->id);
    }

    /**
     * Scenario 2: Register a new customer with valid name and phone and no email address
     */
    public function test_02_register_new_customer_without_email_persists_nullable_email(): void
    {
        Sanctum::actingAs($this->cashier);

        $payload = [
            'name' => 'Tariqul Retailer',
            'phone' => '+8801799112233',
            'company_name' => 'Tariqul Traders',
        ];

        $response = $this->postJson('/api/v1/admin/pos/customers', $payload);
        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Tariqul Retailer')
            ->assertJsonPath('data.phone', '+8801799112233')
            ->assertJsonPath('data.email', null);

        $createdUser = User::where('phone', '+8801799112233')->first();
        $this->assertNotNull($createdUser);
        $this->assertNull($createdUser->email);
        $this->assertNull($createdUser->email_verified_at);
        $this->assertEquals(User::ROLE_CUSTOMER, $createdUser->role);
        $this->assertFalse($createdUser->isSyntheticEmail());
    }

    /**
     * Scenario 3 & 4: Server-authoritative prices, MOQ, and stock limits
     */
    public function test_03_moq_and_stock_limits_enforced_authoritatively(): void
    {
        Sanctum::actingAs($this->cashier);

        // 1. Violation: Below MOQ (moqProduct MOQ is 10, ordering 5)
        $subMoqPayload = [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 75.00,
            'items' => [
                [
                    'product_id' => $this->moqProduct->id,
                    'quantity' => 5,
                ],
            ],
        ];
        $resSubMoq = $this->postJson('/api/v1/admin/pos/orders', $subMoqPayload);
        $resSubMoq->assertStatus(422);
        $this->assertStringContainsString('Minimum order quantity (MOQ)', $resSubMoq->json('message'));

        // 2. Violation: Exceeding available stock (standardProduct stock is 100, ordering 120)
        $excessStockPayload = [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 5000.00,
            'items' => [
                [
                    'product_id' => $this->standardProduct->id,
                    'product_variant_id' => $this->variantM->id,
                    'quantity' => 120,
                ],
            ],
        ];
        $resExcess = $this->postJson('/api/v1/admin/pos/orders', $excessStockPayload);
        $resExcess->assertStatus(422);
    }

    /**
     * Scenario 5, 6, 7, 8, 10: Complete POS Sale fully paid at counter
     * - Order created with source 'pos'
     * - Initial status is 'processing', payment_status is 'paid'
     * - Customer-facing status is ORDER_CONFIRMED
     * - Authoritative Payment record created with cashier attribution
     * - Cash tendered ($100.00) & change ($20.00) calculated for $80.00 order
     * - Inventory decremented exactly once with audit log
     */
    public function test_04_create_pos_order_fully_paid_at_counter(): void
    {
        Sanctum::actingAs($this->cashier);

        $initialStock = $this->variantM->fresh()->stock;
        $initialInv = Inventory::where('product_variant_id', $this->variantM->id)->first()->quantity;

        // Buying 2 shirts @ $40.00 = $80.00. Cash tendered = $100.00. Change = $20.00.
        $salePayload = [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 100.00,
            'warehouse_id' => $this->warehouse->id,
            'items' => [
                [
                    'product_id' => $this->standardProduct->id,
                    'product_variant_id' => $this->variantM->id,
                    'quantity' => 2,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/admin/pos/orders', $salePayload);
        $response->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED)
            ->assertJsonPath('data.user_id', (string) $this->posCustomer->id);

        $this->assertEquals(80.00, (float) $response->json('data.subtotal'));
        $this->assertEquals(80.00, (float) $response->json('data.total_amount'));

        $orderId = $response->json('data.id');
        $order = Order::with('payments')->find($orderId);
        $this->assertNotNull($order);
        $this->assertEquals('pos', $order->order_source);
        $this->assertEquals($this->posCustomer->id, $order->user_id);
        $this->assertEquals('paid', $order->payment_status);

        // Verify tender & change recorded
        $details = $order->payment_details;
        $this->assertEquals(100.00, $details['tendered_amount']);
        $this->assertEquals(20.00, $details['change_return']);
        $this->assertTrue($details['inventory_decremented']);

        // Verify Authoritative Payment Record
        $payment = $order->payments()->first();
        $this->assertNotNull($payment);
        $this->assertEquals('pos_cash', $payment->payment_method);
        $this->assertEquals('succeeded', $payment->status);
        $this->assertEquals(80.00, (float) $payment->amount);
        $this->assertEquals($this->cashier->id, $payment->confirmed_by);

        // Verify Exactly-Once Inventory Decrement
        $newStock = $this->variantM->fresh()->stock;
        $newInv = Inventory::where('product_variant_id', $this->variantM->id)->first()->quantity;
        $this->assertEquals($initialStock - 2, $newStock);
        $this->assertEquals($initialInv - 2, $newInv);

        // Verify Inventory Adjustment Audit
        $adj = AdminInventoryAdjustment::where('reason', "POS Order #{$order->order_number}")->first();
        $this->assertNotNull($adj);
        $this->assertEquals(-2, $adj->adjustment_amount);
        $this->assertEquals($this->cashier->id, $adj->admin_user_id);
    }

    /**
     * Scenario 6 & 14: POS order appears in Admin Orders list and search
     */
    public function test_05_pos_order_appears_in_admin_orders_list_and_search(): void
    {
        Sanctum::actingAs($this->cashier);

        // Create POS order
        $res = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $orderNumber = $res->json('data.order_number');

        // Admin searches by order number
        $searchRes = $this->getJson("/api/v1/admin/orders?search={$orderNumber}");
        $searchRes->assertOk()
            ->assertJsonPath('data.data.0.order_number', $orderNumber)
            ->assertJsonPath('data.data.0.user.name', 'Kazi Nazrul');

        // Admin filters by customer_status=ORDER_CONFIRMED
        $filterRes = $this->getJson('/api/v1/admin/orders?customer_status=ORDER_CONFIRMED');
        $filterRes->assertOk();
        $orderNumbers = collect($filterRes->json('data.data'))->pluck('order_number')->all();
        $this->assertContains($orderNumber, $orderNumbers);
    }

    /**
     * Scenario 7 & 14: POS order appears in Customer Order History & details
     */
    public function test_06_pos_order_appears_in_customer_order_history_and_details(): void
    {
        // Cashier creates POS order
        Sanctum::actingAs($this->cashier);
        $res = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $orderNumber = $res->json('data.order_number');
        $orderId = $res->json('data.id');

        // Switch authentication to the customer
        Sanctum::actingAs($this->posCustomer);

        // Customer queries list
        $listRes = $this->getJson('/api/v1/orders');
        $listRes->assertOk();
        $userOrderNumbers = collect($listRes->json('data'))->pluck('order_number')->all();
        $this->assertContains($orderNumber, $userOrderNumbers);

        // Customer queries single order details
        $detailRes = $this->getJson("/api/v1/orders/{$orderId}");
        $detailRes->assertOk()
            ->assertJsonPath('data.order_number', $orderNumber)
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED)
            ->assertJsonPath('data.items.0.sku', $this->standardProduct->sku);
    }

    /**
     * Scenario 8 & 9: Create POS Order with pending payment (e.g. Bank Transfer)
     * - Order status is 'pending', payment_status is 'pending'
     * - Initial customer_status is PAYMENT_PENDING
     * - Inventory is NOT decremented yet
     * - Admin subsequently approves payment -> inventory decremented exactly once
     * - Double approval is a strict idempotent no-op
     */
    public function test_07_pending_pos_order_and_subsequent_admin_payment_approval(): void
    {
        Sanctum::actingAs($this->cashier);

        $initialStock = $this->variantM->fresh()->stock;

        // Create pending sale (bank_transfer, paid_amount = 0.00)
        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'bank_transfer',
            'paid_amount' => 0.00,
            'tendered_amount' => 0.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 3],
            ],
        ]);
        $saleRes->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_PAYMENT_PENDING);

        $orderId = $saleRes->json('data.id');
        $order = Order::find($orderId);

        // Verify inventory is NOT decremented yet
        $this->assertEquals($initialStock, $this->variantM->fresh()->stock);
        $this->assertFalse(!empty($order->payment_details['inventory_decremented']));

        // Admin approves payment via standard admin payment review
        Sanctum::actingAs($this->admin);
        $reviewRes = $this->postJson("/api/v1/admin/orders/{$orderId}/payment-proof/review", [
            'action' => 'approve',
            'payment_method' => 'Bank Transfer',
            'transaction_id' => 'TXN-BANK-9988',
            'payment_amount' => 120.00,
            'note' => 'Counter bank transfer confirmed by accounts',
        ]);
        $reviewRes->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);

        // Verify inventory decremented now
        $this->assertEquals($initialStock - 3, $this->variantM->fresh()->stock);

        // Idempotency: second approval call does NOT decrement again
        $reviewRes2 = $this->postJson("/api/v1/admin/orders/{$orderId}/payment-proof/review", [
            'action' => 'approve',
            'note' => 'Duplicate click approval',
        ]);
        $reviewRes2->assertOk();
        $this->assertEquals($initialStock - 3, $this->variantM->fresh()->stock);
    }

    /**
     * Scenario 10: Counter-paid POS order safe against double-decrement on admin review
     */
    public function test_08_counter_paid_pos_order_safe_against_double_decrement_on_admin_review(): void
    {
        Sanctum::actingAs($this->cashier);
        $initialStock = $this->variantM->fresh()->stock;

        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $orderId = $saleRes->json('data.id');

        // Stock already decremented by 1 at counter checkout
        $this->assertEquals($initialStock - 1, $this->variantM->fresh()->stock);

        // If an admin navigates to /ayc/orders/{id} and submits payment approval:
        Sanctum::actingAs($this->admin);
        $reviewRes = $this->postJson("/api/v1/admin/orders/{$orderId}/payment-proof/review", [
            'action' => 'approve',
            'note' => 'Redundant review on already paid POS sale',
        ]);
        $reviewRes->assertOk();

        // Stock remains exactly initialStock - 1 (idempotent, zero duplicate reduction)
        $this->assertEquals($initialStock - 1, $this->variantM->fresh()->stock);
    }

    /**
     * Scenario 11: Shipment actions gated by payment approval and order confirmation
     */
    public function test_09_shipment_actions_gated_by_payment_approval(): void
    {
        Sanctum::actingAs($this->cashier);

        // 1. Pending unpaid order
        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'bank_transfer',
            'paid_amount' => 0.00,
            'tendered_amount' => 0.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $orderId = $saleRes->json('data.id');

        // Attempting to mark as shipped before payment approval -> 422
        $shipAttempt = $this->patchJson("/api/v1/admin/orders/{$orderId}/fulfillment", [
            'fulfillment_status' => 'shipped',
            'tracking_number' => 'ARX-12345678',
            'carrier' => 'Aramex',
        ]);
        $shipAttempt->assertStatus(422)
            ->assertJsonFragment(['message' => 'Cannot fulfill or ship order before payment approval. Payment must be approved first.']);

        // 2. Paid order transitions cleanly to shipped (ON_SHIPMENT)
        $paidSaleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $paidOrderId = $paidSaleRes->json('data.id');

        $shipSuccess = $this->patchJson("/api/v1/admin/orders/{$paidOrderId}/fulfillment", [
            'fulfillment_status' => 'shipped',
            'tracking_number' => 'ARX-98765432',
            'carrier' => 'Aramex',
        ]);
        $shipSuccess->assertOk()
            ->assertJsonPath('data.fulfillment_status', 'shipped')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ON_SHIPMENT);
    }

    /**
     * Scenario 12 & 13: Standard Commercial Documents generation & zero-mutation on reprint
     */
    public function test_10_standard_commercial_documents_generation_and_zero_mutation(): void
    {
        Sanctum::actingAs($this->cashier);

        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $orderId = $saleRes->json('data.id');

        $initialOrdersCount = Order::count();
        $initialPaymentsCount = Payment::count();
        $initialStock = $this->variantM->fresh()->stock;

        // Access 5 canonical commercial document types via admin document endpoint
        $docTypes = ['INVOICE', 'ORDER_SHEET', 'PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST'];
        foreach ($docTypes as $type) {
            $docRes = $this->getJson("/api/v1/admin/orders/{$orderId}/documents/{$type}");
            $docRes->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonStructure([
                    'data' => ['doc_type', 'doc_number', 'items', 'financials'],
                ]);
        }

        // Verify zero mutation (reprinting does not create orders, payments, or stock changes)
        $this->assertEquals($initialOrdersCount, Order::count());
        $this->assertEquals($initialPaymentsCount, Payment::count());
        $this->assertEquals($initialStock, $this->variantM->fresh()->stock);
    }

    /**
     * Scenario 15 & 16: Failure Handling - Missing customer and invalid inputs
     */
    public function test_11_failure_handling_missing_or_invalid_customer(): void
    {
        Sanctum::actingAs($this->cashier);

        // Missing customer_id
        $resNoCustomer = $this->postJson('/api/v1/admin/pos/orders', [
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'quantity' => 1],
            ],
        ]);
        $resNoCustomer->assertStatus(422)
            ->assertJsonValidationErrors(['customer_id']);

        // Deprecated walk-in customer (customer_id = 0)
        $resWalkin = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => 0,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'quantity' => 1],
            ],
        ]);
        $resWalkin->assertStatus(422);

        // Non-existent customer
        $resBadId = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => 999999,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'quantity' => 1],
            ],
        ]);
        $resBadId->assertStatus(422);
    }

    /**
     * Scenario 17 & 18: Failure Handling - Cash tender and non-cash overpayment validation
     */
    public function test_12_failure_handling_tender_amount_validation(): void
    {
        Sanctum::actingAs($this->cashier);

        // Insufficient cash tender ($20.00 tendered for $40.00 sale)
        $resShortCash = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 20.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $resShortCash->assertStatus(422)
            ->assertJsonValidationErrors(['tendered_amount']);

        // Non-cash overpayment ($50.00 entered for $40.00 card sale)
        $resOverCard = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'card',
            'tendered_amount' => 50.00,
            'paid_amount' => 50.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $resOverCard->assertStatus(422)
            ->assertJsonValidationErrors(['paid_amount']);
    }

    /**
     * Scenario 19: Failure Handling - Idempotency deduplication
     */
    public function test_13_failure_handling_idempotency_prevents_duplicate_orders_and_stock_deductions(): void
    {
        Sanctum::actingAs($this->cashier);

        $initialStock = $this->variantM->fresh()->stock;
        $idempotencyKey = 'pos_sale_' . Str::random(12);

        $salePayload = [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'idempotency_key' => $idempotencyKey,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ];

        // First execution
        $res1 = $this->postJson('/api/v1/admin/pos/orders', $salePayload);
        $res1->assertStatus(201);
        $orderNumber1 = $res1->json('data.order_number');

        // Immediate retry with identical key
        $res2 = $this->postJson('/api/v1/admin/pos/orders', $salePayload);
        $res2->assertStatus(201);
        $orderNumber2 = $res2->json('data.order_number');

        $this->assertEquals($orderNumber1, $orderNumber2);
        // Inventory decremented only 1 time
        $this->assertEquals($initialStock - 1, $this->variantM->fresh()->stock);
        // Only 1 order created in database
        $this->assertEquals(1, Order::where('order_number', $orderNumber1)->count());
    }

    /**
     * Scenario 20: Tenant Isolation - Customer cannot view another customer's POS order
     */
    public function test_14_tenant_isolation_customer_cannot_view_another_customer_pos_order(): void
    {
        Sanctum::actingAs($this->cashier);

        // POS order belongs to Kazi Nazrul ($this->posCustomer)
        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'pos_cash',
            'tendered_amount' => 40.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);
        $orderId = $saleRes->json('data.id');
        $this->assertNotNull($orderId);

        // Shamsur Rahman ($this->otherCustomer) tries to view the order
        Sanctum::actingAs($this->otherCustomer);
        $viewAttempt = $this->getJson("/api/v1/orders/{$orderId}");
        $viewAttempt->assertStatus(403);
    }

    /**
     * Scenario 15: Deferred POS Order with Non-Default Warehouse Attribution
     * - POS order created with deferred payment (paid_amount = 0) and specific warehouse (WH-CHITTAGONG)
     * - Verifies warehouse_id is preserved in payment_details
     * - Stock is not decremented at order placement
     * - Admin approves payment proof without passing warehouse_id
     * - Canonical Order::decrementInventory resolves warehouse_id from payment_details
     * - Deducts exactly from WH-CHITTAGONG, leaving Uttara warehouse untouched
     */
    public function test_15_deferred_pos_order_persists_warehouse_and_deducts_correct_inventory_upon_approval(): void
    {
        $chittagongWarehouse = Warehouse::create([
            'name' => 'Chittagong Retail Warehouse',
            'code' => 'WH-CTG-01',
            'address' => 'Agrabad C/A',
            'city' => 'Chittagong',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $uttaraInv = Inventory::where('product_variant_id', $this->variantM->id)
            ->where('warehouse_id', $this->warehouse->id)
            ->first();
        $this->assertEquals(100, $uttaraInv->quantity);

        $ctgInv = Inventory::create([
            'product_id' => $this->standardProduct->id,
            'product_variant_id' => $this->variantM->id,
            'warehouse_id' => $chittagongWarehouse->id,
            'quantity' => 50,
        ]);

        Sanctum::actingAs($this->cashier);

        // Place deferred POS order selecting Chittagong warehouse
        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'warehouse_id' => $chittagongWarehouse->id,
            'payment_method' => 'bank_transfer',
            'paid_amount' => 0.00,
            'tendered_amount' => 0.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 5],
            ],
        ]);

        $saleRes->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.status', 'pending');

        $orderId = $saleRes->json('data.id');
        $order = Order::find($orderId);

        // Verify warehouse_id is saved in payment_details
        $this->assertEquals($chittagongWarehouse->id, $order->payment_details['warehouse_id']);
        // Verify no decrement yet
        $this->assertEquals(50, $ctgInv->fresh()->quantity);
        $this->assertEquals(100, $uttaraInv->fresh()->quantity);

        // Admin approves payment via review endpoint
        Sanctum::actingAs($this->admin);
        $reviewRes = $this->postJson("/api/v1/admin/orders/{$orderId}/payment-proof/review", [
            'action' => 'approve',
            'payment_method' => 'Bank Transfer',
            'transaction_id' => 'TXN-CTG-WIRE-01',
            'payment_amount' => 200.00,
            'note' => 'Approved offline wire for Chittagong POS sale',
        ]);
        $reviewRes->assertOk();

        // Chittagong inventory decremented by 5
        $this->assertEquals(45, $ctgInv->fresh()->quantity);
        // Uttara inventory remains completely untouched at 100
        $this->assertEquals(100, $uttaraInv->fresh()->quantity);

        // Verify audit log points to Chittagong inventory
        $adj = AdminInventoryAdjustment::where('inventory_id', $ctgInv->id)->latest()->first();
        $this->assertNotNull($adj);
        $this->assertEquals(-5, $adj->adjustment_amount);
        $this->assertEquals(50, $adj->previous_quantity);
        $this->assertEquals(45, $adj->resulting_quantity);
    }

    /**
     * Scenario 16: Partial Counter Payment Status and Lifecycle Alignment
     * - Order with partial payment ($20 of $40 total)
     * - payment_status = partially_paid, customer_status = PAYMENT_PENDING
     * - Lifecycle notification matches PAYMENT_PENDING
     * - Stock decremented at counter
     */
    public function test_16_partial_counter_payment_lifecycle_and_status_alignment(): void
    {
        Sanctum::actingAs($this->cashier);
        $initialStock = $this->variantM->fresh()->stock;

        $saleRes = $this->postJson('/api/v1/admin/pos/orders', [
            'customer_id' => $this->posCustomer->id,
            'payment_method' => 'card',
            'paid_amount' => 20.00,
            'items' => [
                ['product_id' => $this->standardProduct->id, 'product_variant_id' => $this->variantM->id, 'quantity' => 1],
            ],
        ]);

        $saleRes->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'partially_paid')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_PAYMENT_PENDING)
            ->assertJsonPath('data.paid_amount', 20)
            ->assertJsonPath('data.balance_due', 20);

        // Inventory decremented at counter since payment was accepted
        $this->assertEquals($initialStock - 1, $this->variantM->fresh()->stock);

        // Verify lifecycle notification sent was PAYMENT_PENDING
        $notif = $this->posCustomer->notifications()
            ->where('type', \App\Notifications\OrderLifecycleNotification::class)
            ->latest()
            ->first();
        $this->assertNotNull($notif);
        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $notif->data['stage']);
    }
}
