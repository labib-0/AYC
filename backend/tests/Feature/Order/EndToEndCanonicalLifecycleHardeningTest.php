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
use App\Notifications\OrderLifecycleNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EndToEndCanonicalLifecycleHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected User $admin;
    protected Product $product;
    protected ProductVariant $variant;
    protected Warehouse $warehouse;
    protected Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'email' => 'primary-buyer@fashionretail.com',
            'b2b_approval_status' => 'approved',
        ]);

        $this->otherCustomer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'email' => 'other-buyer@anotherbrand.com',
            'b2b_approval_status' => 'approved',
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
            'email' => 'ops-admin@ayaanclothing.com',
        ]);

        $this->product = Product::factory()->create([
            'name' => 'Premium Heavyweight Cotton T-Shirt',
            'moq' => 10,
            'stock' => 200,
        ]);

        $this->variant = ProductVariant::factory()->create([
            'product_id' => $this->product->id,
            'sku' => 'AYN-TSH-WHT-L',
            'title' => 'White / L',
            'stock' => 200,
        ]);

        $this->warehouse = Warehouse::firstOrCreate(
            ['code' => 'WH-DHAKA-EXP'],
            [
                'name' => 'Dhaka Central Export Facility',
                'country_code' => 'BD',
                'is_active' => true,
            ]
        );

        $this->inventory = Inventory::create([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 200,
        ]);
    }

    /**
     * Complete End-to-End Canonical Order Flow: Steps 1 through 18.
     */
    public function test_complete_canonical_order_lifecycle_and_synchronization(): void
    {
        // -------------------------------------------------------------
        // CUSTOMER: 1. Place order via Storefront API
        // -------------------------------------------------------------
        $orderData = [
            'shipping_name' => 'Primary Buyer',
            'email' => $this->customer->email,
            'shipping_phone' => '+15551234567',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '97477',
            'shipping_country_code' => 'US',
            'payment_method' => 'bank_transfer',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 50,
                    'unit_price' => 20.00,
                ],
            ],
        ];

        $resPlace = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', $orderData);
        $resPlace->assertStatus(201);

        $orderId = $resPlace->json('data.id');
        $orderNumber = $resPlace->json('data.order_number');
        $this->assertNotEmpty($orderId);
        $this->assertNotEmpty($orderNumber);

        // -------------------------------------------------------------
        // 2 & 3. Verify ORDER_PLACED & PAYMENT_PENDING
        // -------------------------------------------------------------
        $order = Order::find($orderId);
        $this->assertNotNull($order);
        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $order->customer_status);
        $this->assertEquals('pending', $order->payment_status);

        // Stock must have ZERO decrement at order placement
        $this->assertEquals(200, $this->variant->fresh()->stock);
        $this->assertEquals(200, $this->inventory->fresh()->quantity);

        // Verify customer received ORDER_PLACED & PAYMENT_PENDING notifications
        $notifications = $this->customer->notifications;
        $stagesReceived = $notifications->pluck('data.stage')->all();
        $this->assertContains(Order::CUSTOMER_STATUS_ORDER_PLACED, $stagesReceived);
        $this->assertContains(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $stagesReceived);

        // -------------------------------------------------------------
        // 4 & 5. Customer uploads payment proof -> WAITING_FOR_APPROVAL
        // -------------------------------------------------------------
        $receiptFile = UploadedFile::fake()->image('wire_transfer_swift.jpg', 800, 1000);
        $resUpload = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->id}/payment-proof", [
            'receipt' => $receiptFile,
            'payment_method' => 'Bank Wire Transfer',
            'transaction_id' => 'SWIFT-BD-2026-9901',
            'payer_name' => 'Primary Buyer',
            'bank_name' => 'Pubali Bank Limited',
            'payment_amount' => 1000.00,
        ]);

        $resUpload->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL)
            ->assertJsonPath('data.payment_status', 'payment_submitted');

        // Verify stock remains untouched after proof upload
        $this->assertEquals(200, $this->variant->fresh()->stock);
        $this->assertEquals(200, $this->inventory->fresh()->quantity);

        // Verify WAITING_FOR_APPROVAL notification dispatched
        $this->customer->refresh();
        $waitingNotif = $this->customer->notifications()->where('data', 'like', '%"stage":"WAITING_FOR_APPROVAL"%')->first();
        $this->assertNotNull($waitingNotif);
        $this->assertEquals(Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL, $waitingNotif->data['stage']);

        // -------------------------------------------------------------
        // ADMIN: 6 & 7. Admin opens order and reviews payment proof
        // -------------------------------------------------------------
        $resAdminView = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/admin/orders/{$order->id}");
        $resAdminView->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL);
        $this->assertContains('SWIFT-BD-2026-9901', collect($resAdminView->json('data.payments'))->pluck('transaction_id')->all());

        // -------------------------------------------------------------
        // ADMIN & SYSTEM: 8, 9, 10, 11, 12. Approve payment -> ORDER_CONFIRMED & Inventory decrement
        // -------------------------------------------------------------
        $resApprove = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'note' => 'Bank remittance verified in Pubali USD account',
        ]);

        $resApprove->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED)
            ->assertJsonPath('data.payment_status', 'paid');

        // Step 10: Verify physical stock decremented by EXACT ordered quantity (50 PCS)
        $this->assertEquals(150, (int) $this->variant->fresh()->stock);
        $this->assertEquals(150, (int) $this->inventory->fresh()->quantity);

        // Step 12: Verify audit event & notification recorded
        $auditEvent = OrderStatusEvent::where('order_id', $order->id)
            ->where('event_type', 'payment_proof_approved')
            ->first();
        $this->assertNotNull($auditEvent);
        $this->assertEquals($this->admin->id, $auditEvent->user_id);

        $this->customer->refresh();
        $confirmedNotif = $this->customer->notifications()->where('data', 'like', '%"stage":"ORDER_CONFIRMED"%')->first();
        $this->assertNotNull($confirmedNotif);
        $this->assertEquals("Your payment has been approved and your order is confirmed.", $confirmedNotif->data['message']);

        // -------------------------------------------------------------
        // CUSTOMER: 13 & 14. Customer reopens/refreshes order -> ORDER_CONFIRMED
        // -------------------------------------------------------------
        $resCustRefresh = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $resCustRefresh->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ORDER_CONFIRMED)
            ->assertJsonPath('data.payment_status', 'paid');

        // Document gating: Commercial Invoice now unlocked
        $resCI = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$order->id}/documents/COMMERCIAL_INVOICE");
        $resCI->assertOk();

        // -------------------------------------------------------------
        // ADMIN: 15. Initiate shipment
        // -------------------------------------------------------------
        $resShip = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/fulfillment", [
            'fulfillment_status' => 'shipped',
            'carrier' => 'Aramex International',
            'tracking_number' => 'ARM-EXP-88992200',
            'note' => 'Consignment dispatched via air freight',
        ]);

        $resShip->assertOk()
            ->assertJsonPath('data.fulfillment_status', 'shipped')
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ON_SHIPMENT);

        // -------------------------------------------------------------
        // CUSTOMER: 16, 17, 18. Customer reopens order -> ON_SHIPMENT + Tracking
        // -------------------------------------------------------------
        $resCustShipped = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $resCustShipped->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_ON_SHIPMENT)
            ->assertJsonPath('data.tracking_number', 'ARM-EXP-88992200')
            ->assertJsonPath('data.carrier', 'Aramex International');

        // Customer received ON_SHIPMENT notification
        $this->customer->refresh();
        $shipNotif = $this->customer->notifications()->where('data', 'like', '%"stage":"ON_SHIPMENT"%')->first();
        $this->assertNotNull($shipNotif);
        $this->assertEquals("Your order has been shipped.", $shipNotif->data['message']);
    }

    /**
     * Failure Test 1: Payment approval idempotency (double clicks, concurrent requests).
     */
    public function test_payment_approval_idempotency_prevents_duplicate_decrement_and_duplicate_notification(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'payment_status' => 'payment_submitted',
            'fulfillment_status' => 'unfulfilled',
            'total_amount' => 600.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 30,
            'unit_price' => 20.00,
            'line_total' => 600.00,
        ]);

        $initialStock = (int) $this->variant->fresh()->stock;

        // First click (Approve)
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-IDEM-001',
        ]);
        $res1->assertOk();
        $this->assertEquals($initialStock - 30, (int) $this->variant->fresh()->stock);

        $notifCountAfterFirst = $this->customer->notifications()->where('data', 'like', '%"stage":"ORDER_CONFIRMED"%')->count();
        $this->assertEquals(1, $notifCountAfterFirst);

        // Second click (Duplicate / rapid retry)
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-IDEM-001',
        ]);
        $res2->assertOk();

        // Third click (Delayed retry)
        $res3 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
            'transaction_id' => 'TXN-IDEM-001',
        ]);
        $res3->assertOk();

        // Stock MUST remain exactly initial - 30
        $this->assertEquals($initialStock - 30, (int) $this->variant->fresh()->stock);
        $this->assertEquals(1, AdminInventoryAdjustment::where('inventory_id', $this->inventory->id)->count());

        // Notifications MUST not be duplicated
        $notifCountAfterRetries = $this->customer->notifications()->where('data', 'like', '%"stage":"ORDER_CONFIRMED"%')->count();
        $this->assertEquals(1, $notifCountAfterRetries);
    }

    /**
     * Failure Test 2: Inventory race condition.
     * Another operation reduces stock below ordered quantity before Admin approves.
     */
    public function test_inventory_race_condition_fails_safely_without_confirming_or_negative_stock(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'payment_status' => 'payment_submitted',
            'fulfillment_status' => 'unfulfilled',
            'total_amount' => 2000.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 100,
            'unit_price' => 20.00,
            'line_total' => 2000.00,
        ]);

        // Prior to approval, another sales order or stock adjustment drains stock to 40
        $this->variant->update(['stock' => 40]);
        $this->inventory->update(['quantity' => 40]);

        // Admin attempts approval
        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ]);

        // Must fail with 422 INSUFFICIENT_INVENTORY
        $res->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_INVENTORY');

        // Order must NOT be confirmed
        $fresh = $order->fresh();
        $this->assertNotEquals('paid', $fresh->payment_status);
        $this->assertNotEquals(Order::CUSTOMER_STATUS_ORDER_CONFIRMED, $fresh->customer_status);
        $this->assertNull($fresh->payment_confirmed_at);

        // Stock must remain intact at 40 (no negative stock, no silent partial deduction)
        $this->assertEquals(40, (int) $this->variant->fresh()->stock);
        $this->assertEquals(40, (int) $this->inventory->fresh()->quantity);
        $this->assertEquals(0, AdminInventoryAdjustment::count());
    }

    /**
     * Failure Test 3: Invalid status transitions must be rejected (State Transition Matrix).
     */
    public function test_state_transition_matrix_blocks_invalid_transitions(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
        ]);

        // 1. Direct jump from pending to shipped without payment approval or confirmation -> REJECTED (422)
        $resDirectShip = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/fulfillment", [
            'fulfillment_status' => 'shipped',
        ]);
        $resDirectShip->assertStatus(422);

        // 2. Direct jump from pending to confirmed without payment approval -> REJECTED (422)
        $resUnapprovedConfirm = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ]);
        $resUnapprovedConfirm->assertStatus(422);

        // 3. Status jump directly from pending to shipped via status endpoint -> REJECTED (422)
        $resDirectStatusShip = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
        ]);
        $resDirectStatusShip->assertStatus(422);
    }

    /**
     * Failure Test 4: Security and Authorization enforcement.
     */
    public function test_customer_cannot_approve_payment_or_alter_status_or_access_other_orders(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $otherOrder = Order::factory()->create([
            'user_id' => $this->otherCustomer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        // Customer attempts to approve payment -> 403 Forbidden
        $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'approve',
        ])->assertStatus(403);

        // Customer attempts to mutate order status directly -> 403 Forbidden
        $this->actingAs($this->customer, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ])->assertStatus(403);

        // Customer attempts to initiate shipment -> 403 Forbidden
        $this->actingAs($this->customer, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/fulfillment", [
            'fulfillment_status' => 'shipped',
        ])->assertStatus(403);

        // Cross-customer tenant isolation: Customer A cannot view Customer B's order
        $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$otherOrder->id}")
            ->assertStatus(403);

        // Cross-customer tenant isolation: Customer A cannot view Customer B's documents
        $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$otherOrder->id}/documents/PROFORMA_INVOICE")
            ->assertStatus(403);

        // Cross-customer tenant isolation: Customer A cannot upload proof to Customer B's order
        $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$otherOrder->id}/payment-proof", [
            'transaction_id' => 'HACK-TXN',
            'payment_amount' => 100,
        ])->assertStatus(403);
    }

    /**
     * Failure Test 5: Payment rejection consistency and resubmission workflow.
     */
    public function test_payment_rejection_consistency_preserves_unconfirmed_state_and_stock(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'payment_status' => 'payment_submitted',
            'fulfillment_status' => 'unfulfilled',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 25,
            'unit_price' => 20.00,
            'line_total' => 500.00,
        ]);

        $initialStock = (int) $this->variant->fresh()->stock;

        // Admin rejects payment
        $resReject = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'reject',
            'note' => 'Voucher number is unreadable, please re-upload clear scan.',
        ]);

        $resReject->assertOk();

        // Stock must NOT decrement
        $this->assertEquals($initialStock, (int) $this->variant->fresh()->stock);

        // Customer status must be PAYMENT_PENDING (no sixth status created)
        $fresh = $order->fresh();
        $this->assertEquals('failed', $fresh->payment_status);
        $this->assertEquals(Order::CUSTOMER_STATUS_PAYMENT_PENDING, $fresh->customer_status);
        $this->assertNull($fresh->payment_confirmed_at);

        // Customer notification received explaining rejection
        $this->customer->refresh();
        $notif = $this->customer->notifications()->latest()->first();
        $this->assertStringContainsString('Voucher number is unreadable', $notif->data['message']);

        // Customer can successfully resubmit
        $newReceipt = UploadedFile::fake()->image('clear_slip.png', 800, 1000);
        $resResubmit = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->id}/payment-proof", [
            'receipt' => $newReceipt,
            'transaction_id' => 'CLEAR-TXN-2026',
            'payment_amount' => 500.00,
        ]);

        $resResubmit->assertOk()
            ->assertJsonPath('data.customer_status', Order::CUSTOMER_STATUS_WAITING_FOR_APPROVAL);
    }

    /**
     * Requirement 8 & 9: Verify Notification API endpoints and unread tracking.
     */
    public function test_customer_notification_endpoints_and_unread_tracking(): void
    {
        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $order->notifyCustomerOfLifecycleTransition(Order::CUSTOMER_STATUS_ORDER_PLACED);
        $order->notifyCustomerOfLifecycleTransition(Order::CUSTOMER_STATUS_PAYMENT_PENDING);

        // 1. Unread count endpoint
        $resCount = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/notifications/unread-count');
        $resCount->assertOk()
            ->assertJsonPath('data.unread_count', 2);

        // 2. Index endpoint
        $resIndex = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/notifications');
        $resIndex->assertOk()
            ->assertJsonPath('meta.unread_count', 2);

        $notifs = $resIndex->json('data.data');
        $this->assertCount(2, $notifs);
        $firstId = $notifs[0]['id'];

        // 3. Mark single as read
        $resRead = $this->actingAs($this->customer, 'sanctum')->patchJson("/api/v1/notifications/{$firstId}/read");
        $resRead->assertOk();

        $resCountAfterRead = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/notifications/unread-count');
        $resCountAfterRead->assertOk()
            ->assertJsonPath('data.unread_count', 1);

        // 4. Mark all as read
        $resReadAll = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/notifications/read-all');
        $resReadAll->assertOk();

        $resCountFinal = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/notifications/unread-count');
        $resCountFinal->assertOk()
            ->assertJsonPath('data.unread_count', 0);
    }
}

