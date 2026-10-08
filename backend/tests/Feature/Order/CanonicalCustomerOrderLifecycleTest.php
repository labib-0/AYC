<?php

namespace Tests\Feature\Order;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CanonicalCustomerOrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected User $customerA;
    protected User $customerB;
    protected User $admin;
    protected Product $product;
    protected ProductVariant $variant;
    protected Warehouse $warehouse;
    protected Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->customerA = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'email' => 'customerA@domain.com',
            'b2b_approval_status' => 'approved',
        ]);

        $this->customerB = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'email' => 'customerB@domain.com',
            'b2b_approval_status' => 'approved',
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->product = Product::factory()->create([
            'name' => 'Garment Export Shirt',
            'moq' => 10,
        ]);

        $this->variant = ProductVariant::factory()->create([
            'product_id' => $this->product->id,
            'sku' => 'EXP-SHT-BLK-M',
            'title' => 'Black / M',
            'stock' => 100,
        ]);

        $this->warehouse = Warehouse::create([
            'code' => 'WH-MAIN',
            'name' => 'Dhaka Central Warehouse',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        $this->inventory = Inventory::create([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
        ]);
    }

    /**
     * Requirement 1: Order creation with order_placed state -> ORDER_PLACED
     */
    public function test_01_order_creation_order_placed_status(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'order_placed',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
        ]);

        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_PLACED, $order->customer_status);

        $response = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $response->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_PLACED);
    }

    /**
     * Requirement 2: New order -> PAYMENT_PENDING & physical inventory unchanged
     */
    public function test_02_new_unpaid_order_is_payment_pending_without_stock_deduction(): void
    {
        $initialVariantStock = $this->variant->fresh()->stock;
        $initialInvQuantity = $this->inventory->fresh()->quantity;

        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 25,
            'unit_price' => 15.00,
            'line_total' => 375.00,
        ]);

        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $order->customer_status);

        // Verify inventory is completely unchanged
        $this->assertEquals($initialVariantStock, $this->variant->fresh()->stock);
        $this->assertEquals($initialInvQuantity, $this->inventory->fresh()->quantity);
    }

    /**
     * Requirement 3 & 4: Payment proof upload -> WAITING_FOR_APPROVAL & does NOT decrement inventory
     */
    public function test_03_and_04_payment_proof_upload_waiting_for_approval_no_inventory_decrement(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'total_amount' => 500.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 20,
            'unit_price' => 25.00,
            'line_total' => 500.00,
        ]);

        $stockBeforeUpload = $this->variant->fresh()->stock;
        $file = UploadedFile::fake()->image('wire_receipt.jpg', 600, 800);

        $res = $this->actingAs($this->customerA, 'sanctum')->postJson("/api/v1/orders/{$order->id}/payment-proof", [
            'receipt' => $file,
            'payment_method' => 'Bank Transfer',
            'transaction_id' => 'TXN-ABC-999',
            'payment_amount' => 500.00,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.payment_status', 'payment_submitted')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL);

        $fresh = $order->fresh();
        $this->assertEquals(Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL, $fresh->customer_status);
        $this->assertEquals($stockBeforeUpload, $this->variant->fresh()->stock, 'Stock must NOT be decremented upon payment proof upload');
    }

    /**
     * Requirement 5, 6, 7: Admin approval -> payment approved, ORDER_CONFIRMED, and inventory decremented once
     */
    public function test_05_06_07_admin_approval_confirms_order_and_decrements_inventory_once(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'total_amount' => 300.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 15,
            'unit_price' => 20.00,
            'line_total' => 300.00,
        ]);

        $initialStock = $this->variant->fresh()->stock;
        $initialInv = $this->inventory->fresh()->quantity;

        // Admin approves payment
        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'note' => 'Payment received in full.',
        ]);

        $res->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);

        $fresh = $order->fresh();
        $this->assertEquals('paid', $fresh->payment_status);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $fresh->customer_status);

        // Verify inventory decremented exactly by ordered quantity (15 pcs)
        $this->assertEquals($initialStock - 15, $this->variant->fresh()->stock);
        $this->assertEquals($initialInv - 15, $this->inventory->fresh()->quantity);
        $this->assertTrue(!empty($fresh->payment_details['inventory_decremented']));
    }

    /**
     * Requirement 8: Repeated approval cannot decrement inventory twice (idempotency)
     */
    public function test_08_repeated_approval_is_idempotent_no_duplicate_stock_deduction(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'total_amount' => 200.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 10,
            'unit_price' => 20.00,
            'line_total' => 200.00,
        ]);

        $initialStock = $this->variant->fresh()->stock;

        // First approval
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ])->assertOk();

        $stockAfterFirst = $this->variant->fresh()->stock;
        $this->assertEquals($initialStock - 10, $stockAfterFirst);

        // Second approval (simulating retry or rapid double click)
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ])->assertOk();

        $stockAfterSecond = $this->variant->fresh()->stock;
        $this->assertEquals($stockAfterFirst, $stockAfterSecond, 'Stock must NOT decrement a second time on repeated approval');
    }

    /**
     * Requirement 9: Inventory failure prevents inconsistent confirmation
     */
    public function test_09_inventory_failure_prevents_inconsistent_confirmation(): void
    {
        // Reduce available stock to 5 pcs
        $this->variant->update(['stock' => 5]);
        $this->inventory->update(['quantity' => 5]);

        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'total_amount' => 500.00,
        ]);

        // Order needs 20 pcs (more than available 5 pcs)
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 20,
            'unit_price' => 25.00,
            'line_total' => 500.00,
        ]);

        // Attempt admin approval
        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ]);

        // Should safely fail with 422
        $res->assertStatus(422);

        // Order must NOT become confirmed or paid
        $fresh = $order->fresh();
        $this->assertNotEquals('paid', $fresh->payment_status);
        $this->assertNotEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $fresh->customer_status);
        $this->assertEquals(5, $this->variant->fresh()->stock, 'Stock must remain unchanged on failure');
    }

    /**
     * Requirement 10: Shipment transition -> ON_SHIPMENT
     */
    public function test_10_shipment_transition_yields_on_shipment(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'fulfillment_status' => 'shipped',
            'tracking_number' => 'ARAMEX12345678',
            'carrier_status' => 'In Transit',
        ]);

        $this->assertEquals(Order::CUSTOMER_STATUS_ON_SHIPMENT, $order->customer_status);

        $res = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $res->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ON_SHIPMENT);
    }

    /**
     * Requirement 11: Customer sees ONLY canonical 5 states
     */
    public function test_11_customer_sees_only_canonical_five_states(): void
    {
        $allowed = [
            Order::CUSTOMER_STATUS_ORDER_PLACED,
            Order::CUSTOMER_STATUS_PAYMENT_PENDING,
            Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL,
            Order::CUSTOMER_STATUS_ORDER_CONFIRMED,
            Order::CUSTOMER_STATUS_ON_SHIPMENT,
        ];

        // Create 5 orders covering each lifecycle state
        $o1 = Order::factory()->create(['user_id' => $this->customerA->id, 'status' => 'order_placed', 'fulfillment_status' => 'unfulfilled']);
        $o2 = Order::factory()->create(['user_id' => $this->customerA->id, 'status' => 'pending', 'payment_status' => 'pending', 'fulfillment_status' => 'unfulfilled']);
        $o3 = Order::factory()->create(['user_id' => $this->customerA->id, 'payment_status' => 'payment_submitted', 'fulfillment_status' => 'unfulfilled']);
        $o4 = Order::factory()->create(['user_id' => $this->customerA->id, 'payment_status' => 'paid', 'status' => 'confirmed', 'fulfillment_status' => 'unfulfilled']);
        $o5 = Order::factory()->create(['user_id' => $this->customerA->id, 'payment_status' => 'paid', 'fulfillment_status' => 'shipped']);

        $res = $this->actingAs($this->customerA, 'sanctum')->getJson('/api/v1/orders');
        $res->assertOk();

        $items = $res->json('data');
        $this->assertNotEmpty($items);

        foreach ($items as $item) {
            $this->assertArrayHasKey('customer_status', $item);
            $this->assertContains($item['customer_status'], $allowed, "customer_status '{$item['customer_status']}' is not one of the 5 canonical states");
        }
    }

    /**
     * Requirement 12: Customer cannot manipulate order status
     */
    public function test_12_customer_cannot_manipulate_order_status(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        // Customer attempts to call admin status endpoint
        $res = $this->actingAs($this->customerA, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ]);
        $res->assertStatus(403);

        // Customer attempts to call admin payment review endpoint
        $res2 = $this->actingAs($this->customerA, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ]);
        $res2->assertStatus(403);

        $fresh = $order->fresh();
        $this->assertEquals('pending', $fresh->status);
        $this->assertEquals('pending', $fresh->payment_status);
    }

    /**
     * Requirement 13: Historical orders remain readable and map to canonical states
     */
    public function test_13_historical_orders_map_cleanly_to_canonical_states(): void
    {
        // Legacy 'in_production' with paid payment -> ORDER_CONFIRMED
        $h1 = Order::factory()->create(['user_id' => $this->customerA->id, 'status' => 'in_production', 'payment_status' => 'paid', 'fulfillment_status' => 'unfulfilled']);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $h1->customer_status);

        // Legacy 'ready_to_ship' -> ORDER_CONFIRMED
        $h2 = Order::factory()->create(['user_id' => $this->customerA->id, 'status' => 'ready_to_ship', 'payment_status' => 'paid', 'fulfillment_status' => 'unfulfilled']);
        $this->assertEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $h2->customer_status);

        // Legacy 'completed' -> ON_SHIPMENT
        $h3 = Order::factory()->create(['user_id' => $this->customerA->id, 'status' => 'completed', 'payment_status' => 'paid']);
        $this->assertEquals(Order::CUSTOMER_STATUS_ON_SHIPMENT, $h3->customer_status);

        // Legacy 'delivered' -> ON_SHIPMENT
        $h4 = Order::factory()->create(['user_id' => $this->customerA->id, 'status' => 'delivered', 'payment_status' => 'paid']);
        $this->assertEquals(Order::CUSTOMER_STATUS_ON_SHIPMENT, $h4->customer_status);
    }

    /**
     * Requirement 14: Document payment gating remains intact
     */
    public function test_14_document_payment_gating_remains_intact(): void
    {
        $unpaidOrder = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
        ]);

        // Commercial invoice should be 403 gated for unpaid order
        $res = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$unpaidOrder->id}/documents/COMMERCIAL_INVOICE");
        $res->assertStatus(403)
            ->assertJsonPath('is_gated', true);

        // Proforma invoice is available prior to payment approval
        $resPI = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$unpaidOrder->id}/documents/PROFORMA_INVOICE");
        $resPI->assertOk();
    }

    /**
     * Requirement 15: Customer A cannot see Customer B's orders
     */
    public function test_15_customer_a_cannot_see_customer_b_orders(): void
    {
        $orderB = Order::factory()->create([
            'user_id' => $this->customerB->id,
            'email' => 'customerB@domain.com',
            'status' => 'pending',
        ]);

        $res = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$orderB->id}");
        $res->assertStatus(403);
    }

    /**
     * Requirement 16: Refreshing order details preserves the correct status
     */
    public function test_16_refreshing_order_details_preserves_correct_status(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customerA->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
        ]);

        $res1 = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $res1->assertOk()->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);

        // Fetch again (refresh)
        $res2 = $this->actingAs($this->customerA, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $res2->assertOk()->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED);
    }
}
