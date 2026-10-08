<?php

namespace Tests\Feature\Order;

use App\Models\AdminInventoryAdjustment;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusEvent;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminPaymentApprovalInventoryShipmentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $admin;
    protected Warehouse $warehouse;
    protected Product $product;
    protected ProductVariant $variant;
    protected Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'b2b_approval_status' => 'approved',
            'email' => 'buyer@testfashion.com',
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
            'name' => 'Finance Director',
            'email' => 'finance@ayaanclothing.com',
        ]);

        $this->warehouse = Warehouse::firstOrCreate(
            ['code' => 'WH-UTTARA-01'],
            [
                'name' => 'Uttara Warehouse',
                'address' => 'House #33, Road #12, Sector #11, Uttara',
                'city' => 'Dhaka',
                'country_code' => 'BD',
                'is_active' => true,
            ]
        );

        $this->product = Product::factory()->create([
            'name' => 'Export Twill Overshirt',
            'moq' => 10,
            'stock' => 500,
        ]);

        $this->variant = ProductVariant::factory()->create([
            'product_id' => $this->product->id,
            'sku' => 'EXP-TWL-NVY-L',
            'title' => 'Navy / L',
            'stock' => 500,
        ]);

        $this->inventory = Inventory::create([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 500,
        ]);
    }

    protected function createTestOrder(int $quantity = 100, string $paymentStatus = 'pending', ?string $status = 'pending'): Order
    {
        $order = Order::factory()->create([
            'order_number' => 'AYN-2026-TEST-' . strtoupper(\Illuminate\Support\Str::random(5)),
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 40.00 * $quantity,
            'shipping_cost' => 150.00,
            'tax_amount' => 50.00,
            'total_amount' => (40.00 * $quantity) + 200.00,
            'payment_method' => 'Bank Transfer',
            'shipping_name' => 'Test Buyer Ltd',
            'shipping_address1' => '450 Fashion Blvd',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10018',
            'shipping_country_code' => 'US',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => $quantity,
            'unit_price' => 40.00,
            'line_total' => 40.00 * $quantity,
        ]);

        return $order;
    }

    /**
     * Case 1: Admin sees pending payment in order list & filters
     */
    public function test_01_admin_sees_pending_payment(): void
    {
        $order = $this->createTestOrder(100, 'pending', 'pending');

        $res = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/orders?customer_status=PAYMENT_PENDING');
        $res->assertOk();

        $ids = collect($res->json('data.data') ?? $res->json('data'))->pluck('id')->map(fn ($id) => (string) $id)->all();
        $this->assertContains((string) $order->id, $ids);
    }

    /**
     * Case 2: Admin can inspect payment proof details
     */
    public function test_02_admin_can_inspect_payment_proof(): void
    {
        $order = $this->createTestOrder(100, 'pending', 'pending');
        $file = UploadedFile::fake()->create('bank_slip.pdf', 300, 'application/pdf');

        $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->id}/payment-proof", [
            'receipt' => $file,
            'payment_method' => 'Bank Wire',
            'transaction_id' => 'TXN-SWIFT-9988',
            'payer_name' => 'Test Buyer Ltd',
            'bank_name' => 'Pubali Bank Limited',
            'payment_amount' => 4200.00,
        ])->assertOk();

        $res = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/admin/orders/{$order->id}");
        $res->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL)
            ->assertJsonPath('data.payments.0.transaction_id', 'TXN-SWIFT-9988')
            ->assertJsonPath('data.payments.0.status', 'submitted');
    }

    /**
     * Case 3: Admin approval confirms order
     */
    public function test_03_admin_approval_confirms_order(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-VERIFIED-100',
            'note' => 'Funds credited to corporate account',
        ]);

        $res->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);

        $fresh = $order->fresh();
        $this->assertEquals('paid', $fresh->payment_status);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $fresh->customer_status);
        $this->assertNotNull($fresh->payment_confirmed_at);
        $this->assertEquals($this->admin->id, $fresh->payment_confirmed_by);
    }

    /**
     * Case 4: Admin approval decrements inventory
     */
    public function test_04_admin_approval_decrements_inventory(): void
    {
        $this->assertEquals(500, (int) $this->variant->fresh()->stock);
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ])->assertOk();

        $this->assertEquals(400, (int) $this->variant->fresh()->stock);
        $this->assertEquals(400, (int) $this->inventory->fresh()->quantity);
    }

    /**
     * Case 5: Inventory decrement is exact
     */
    public function test_05_inventory_decrement_is_exact(): void
    {
        $initialStock = 500;
        $orderQuantity = 175;
        $order = $this->createTestOrder($orderQuantity, 'payment_submitted', 'pending');

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ])->assertOk();

        $this->assertEquals($initialStock - $orderQuantity, (int) $this->variant->fresh()->stock);
        $this->assertEquals($initialStock - $orderQuantity, (int) $this->inventory->fresh()->quantity);
    }

    /**
     * Case 6: Inventory decrement happens only once (method idempotency)
     */
    public function test_06_inventory_decrement_happens_only_once(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        $firstDeduct = $order->decrementInventory($this->admin->id, 'First call');
        $this->assertTrue($firstDeduct);
        $this->assertEquals(400, (int) $this->variant->fresh()->stock);

        // Second call must safely return false and leave stock unchanged
        $secondDeduct = $order->decrementInventory($this->admin->id, 'Second call');
        $this->assertFalse($secondDeduct);
        $this->assertEquals(400, (int) $this->variant->fresh()->stock);
    }

    /**
     * Case 7: Double-click approval is safe
     */
    public function test_07_double_click_approval_is_safe(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        // First click
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-DBL-1',
        ]);
        $res1->assertOk();
        $this->assertEquals(400, (int) $this->variant->fresh()->stock);

        // Second click
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-DBL-1',
        ]);
        $res2->assertOk()
            ->assertJsonPath('data.payment_status', 'paid');

        // Inventory must remain exactly 400
        $this->assertEquals(400, (int) $this->variant->fresh()->stock);
    }

    /**
     * Case 8: Concurrent approval is safe
     */
    public function test_08_concurrent_approval_is_safe(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        // Simulate concurrent requests
        for ($i = 1; $i <= 3; $i++) {
            $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
                'action' => 'approve',
                'transaction_id' => "TXN-CONCURRENT-{$i}",
            ]);
            $res->assertOk();
        }

        $this->assertEquals(400, (int) $this->variant->fresh()->stock);
        $this->assertEquals(1, AdminInventoryAdjustment::where('inventory_id', $this->inventory->id)->count());
    }

    /**
     * Case 9: Insufficient stock blocks confirmation and returns 422 conflict
     */
    public function test_09_insufficient_stock_blocks_confirmation(): void
    {
        $order = $this->createTestOrder(300, 'payment_submitted', 'pending');

        // External inventory change: stock drops to 150 before approval
        $this->variant->update(['stock' => 150]);
        $this->inventory->update(['quantity' => 150]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_INVENTORY');

        // Stock must NOT be negative and order must remain unconfirmed
        $fresh = $order->fresh();
        $this->assertEquals('payment_submitted', $fresh->payment_status);
        $this->assertNull($fresh->payment_confirmed_at);
        $this->assertEquals(150, (int) $this->variant->fresh()->stock);
    }

    /**
     * Case 10: Payment rejection does not decrement inventory
     */
    public function test_10_payment_rejection_does_not_decrement_inventory(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'reject',
            'note' => 'Payment slip illegible',
        ]);

        $res->assertOk()
            ->assertJsonPath('data.payment_status', 'failed');

        // Stock remains untouched at 500
        $this->assertEquals(500, (int) $this->variant->fresh()->stock);
        $this->assertEquals(0, AdminInventoryAdjustment::count());

        // Order remains unconfirmed
        $fresh = $order->fresh();
        $this->assertEquals('failed', $fresh->payment_status);
        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $fresh->customer_status);
    }

    /**
     * Case 11: Resubmitted payment proof works where supported
     */
    public function test_11_resubmitted_payment_proof_works(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        // 1. Admin rejects initial proof
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'reject',
            'note' => 'Illegible voucher',
        ])->assertOk();

        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $order->fresh()->customer_status);

        // 2. Customer resubmits corrected proof
        $file = UploadedFile::fake()->create('corrected_slip.pdf', 300, 'application/pdf');
        $resUpload = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->id}/payment-proof", [
            'receipt' => $file,
            'transaction_id' => 'TXN-CORRECTED-200',
            'payment_amount' => 4200.00,
        ]);

        $resUpload->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL);

        // 3. Admin approves resubmitted proof
        $resApprove = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-CORRECTED-200',
        ]);

        $resApprove->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);

        // Decrement occurred once
        $this->assertEquals(400, (int) $this->variant->fresh()->stock);
        $this->assertEquals(1, AdminInventoryAdjustment::count());
    }

    /**
     * Case 12: Inventory audit is created
     */
    public function test_12_inventory_audit_is_created(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ])->assertOk();

        $audit = AdminInventoryAdjustment::where('inventory_id', $this->inventory->id)->first();
        $this->assertNotNull($audit);
        $this->assertEquals($this->admin->id, $audit->admin_user_id);
        $this->assertEquals(500, $audit->previous_quantity);
        $this->assertEquals(-100, $audit->adjustment_amount);
        $this->assertEquals(400, $audit->resulting_quantity);
        $this->assertStringContainsString($order->order_number, $audit->reason);
    }

    /**
     * Case 13: Confirmation event is created
     */
    public function test_13_confirmation_event_is_created(): void
    {
        $order = $this->createTestOrder(100, 'payment_submitted', 'pending');

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'note' => 'Accounts audit verified',
        ])->assertOk();

        $event = OrderStatusEvent::where('order_id', $order->id)
            ->where('event_type', 'payment_proof_approved')
            ->first();

        $this->assertNotNull($event);
        $this->assertEquals($this->admin->id, $event->user_id);
        $this->assertStringContainsString('Accounts audit verified', $event->message);
    }

    /**
     * Case 14: Shipment transition produces ON_SHIPMENT
     */
    public function test_14_shipment_transition_produces_on_shipment(): void
    {
        $order = $this->createTestOrder(100, 'paid', 'processing');

        $res = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/fulfillment", [
            'fulfillment_status' => 'shipped',
            'carrier' => 'Aramex',
            'tracking_number' => 'AWB-8833992211',
            'note' => 'Handed over to carrier',
        ]);

        $res->assertOk()
            ->assertJsonPath('data.fulfillment_status', 'shipped')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ON_SHIPMENT)
            ->assertJsonPath('data.tracking_number', 'AWB-8833992211');

        $fresh = $order->fresh();
        $this->assertEquals('shipped', $fresh->fulfillment_status);
        $this->assertEquals('AWB-8833992211', $fresh->tracking_number);
        $this->assertEquals(Order::CUSTOMER_STATUS_ON_SHIPMENT, $fresh->customer_status);
    }

    /**
     * Case 15: Customer receives correct canonical status at all 5 stages
     */
    public function test_15_customer_receives_correct_canonical_status(): void
    {
        // 1. ORDER_PLACED
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'order_placed',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
        ]);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_PLACED, $order->customer_status);

        // 2. PAYMENT_PENDING
        $order->update(['status' => 'pending', 'payment_status' => 'pending', 'payment_proof_url' => null, 'fulfillment_status' => 'unfulfilled']);
        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $order->fresh()->customer_status);

        // 3. WAITING_FOR_APPROVAL
        $order->update(['payment_status' => 'payment_submitted', 'payment_proof_url' => 'https://ayaanclothing.com/proof.pdf', 'fulfillment_status' => 'unfulfilled']);
        $this->assertEquals(Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL, $order->fresh()->customer_status);

        // 4. ORDER_CONFIRMED
        $order->update(['payment_status' => 'paid', 'payment_confirmed_at' => now(), 'fulfillment_status' => 'unfulfilled']);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $order->fresh()->customer_status);

        // 5. ON_SHIPMENT
        $order->update(['fulfillment_status' => 'shipped', 'tracking_number' => 'AWB-12345']);
        $this->assertEquals(Order::CUSTOMER_STATUS_ON_SHIPMENT, $order->fresh()->customer_status);
    }

    /**
     * Case 16: Documents respect payment gating
     */
    public function test_16_documents_respect_payment_gating(): void
    {
        $unpaidOrder = $this->createTestOrder(100, 'pending', 'pending');

        // Pre-approval: Commercial Invoice is gated (403)
        $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$unpaidOrder->id}/documents/COMMERCIAL_INVOICE")
            ->assertStatus(403);

        // Pre-approval: Proforma Invoice is accessible (200)
        $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$unpaidOrder->id}/documents/PROFORMA_INVOICE")
            ->assertOk();

        // Post-approval: Commercial Invoice unlocks
        $unpaidOrder->update(['payment_status' => 'paid', 'payment_confirmed_at' => now()]);
        $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$unpaidOrder->id}/documents/COMMERCIAL_INVOICE")
            ->assertOk();
    }

    /**
     * Case 17: Customer cannot manipulate status or bypass approval gate
     */
    public function test_17_customer_cannot_manipulate_status(): void
    {
        $order = $this->createTestOrder(100, 'pending', 'pending');

        // Customer attempts to call admin status endpoint
        $this->actingAs($this->customer, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'confirmed'])
            ->assertStatus(403);

        // Customer attempts to call payment review endpoint
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", ['action' => 'approve'])
            ->assertStatus(403);

        // Customer attempts to call fulfillment endpoint
        $this->actingAs($this->customer, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/fulfillment", ['fulfillment_status' => 'shipped'])
            ->assertStatus(403);

        // Admin cannot confirm order without payment approval
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'confirmed'])
            ->assertStatus(422);
    }

    /**
     * Case 18: Historical orders remain intact and map cleanly
     */
    public function test_18_historical_orders_remain_intact(): void
    {
        // Legacy production order
        $h1 = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'in_production',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
        ]);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $h1->customer_status);

        // Legacy delivered order
        $h2 = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'delivered',
            'payment_status' => 'paid',
        ]);
        $this->assertEquals(Order::CUSTOMER_STATUS_ON_SHIPMENT, $h2->customer_status);

        // Customer API endpoint returns valid resources for legacy orders
        $res = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$h1->id}");
        $res->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);
    }
}
