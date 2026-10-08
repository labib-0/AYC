<?php

namespace Tests\Feature\Order;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentReceiptVerificationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected User $admin;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->customer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'b2b_approval_status' => 'approved',
        ]);

        $this->otherCustomer = User::factory()->create([
            'role' => User::ROLE_CUSTOMER,
            'b2b_approval_status' => 'approved',
        ]);

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $product = Product::factory()->create([
            'name' => 'Premium Cotton Twill Overshirt',
            'stock' => 500,
            'moq' => 10,
        ]);

        $this->order = Order::factory()->create([
            'order_number' => 'ORD-2026-TEST01',
            'user_id' => $this->customer->id,
            'email' => 'buyer@abcfashion.com',
            'status' => 'pending',
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 4000.00,
            'shipping_cost' => 255.00,
            'total_amount' => 4255.00,
            'shipping_name' => 'ABC Fashion Ltd.',
            'shipping_address1' => '123 Fashion Ave',
            'shipping_city' => 'New York',
            'shipping_country_code' => 'US',
            'shipping_postal_code' => '10001',
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 100,
            'unit_price' => 40.00,
            'line_total' => 4000.00,
        ]);
    }

    public function test_customer_can_upload_receipt_and_submit_structured_payment_details(): void
    {
        $file = UploadedFile::fake()->image('pubali_bank_slip.jpg', 600, 800);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
                'payment_method' => 'Bank Transfer',
                'transaction_id' => 'TXN-987654321',
                'payer_name' => 'ABC Fashion Ltd.',
                'bank_name' => 'Pubali Bank Limited',
                'account_number' => '1234567890',
                'payment_amount' => 4255.00,
                'payment_date' => '2026-09-25',
                'notes' => 'Transferred via TT from Pubali Bank.',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'payment_submitted')
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('orders', [
            'id' => $this->order->id,
            'payment_status' => 'payment_submitted',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $this->order->id,
            'customer_id' => $this->customer->id,
            'status' => 'submitted',
            'payment_method' => 'Bank Transfer',
            'transaction_id' => 'TXN-987654321',
            'payer_name' => 'ABC Fashion Ltd.',
            'bank_name' => 'Pubali Bank Limited',
            'amount' => 4255.00,
        ]);

        $this->assertDatabaseHas('order_status_events', [
            'order_id' => $this->order->id,
            'event_type' => 'payment_proof_uploaded',
        ]);
    }

    public function test_receipt_upload_does_not_mark_order_as_paid(): void
    {
        $file = UploadedFile::fake()->image('receipt.png');

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
                'transaction_id' => 'TXN-ABC-123',
            ])->assertOk();

        $freshOrder = $this->order->fresh();
        $this->assertNotEquals('paid', $freshOrder->payment_status);
        $this->assertEquals('payment_submitted', $freshOrder->payment_status);
    }

    public function test_customer_cannot_upload_receipt_to_another_customers_order(): void
    {
        $file = UploadedFile::fake()->image('receipt.png');

        $this->actingAs($this->otherCustomer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
                'transaction_id' => 'TXN-HACKER',
            ])->assertStatus(403);
    }

    public function test_customer_cannot_call_admin_verification_endpoint(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$this->order->id}/payment-proof/review", [
                'action' => 'approve',
            ])->assertStatus(403);
    }

    public function test_admin_can_review_and_confirm_payment_with_historical_snapshot(): void
    {
        // 1. Customer submits payment
        $file = UploadedFile::fake()->create('wire_transfer.pdf', 500, 'application/pdf');

        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
                'payment_method' => 'Bank Transfer',
                'transaction_id' => 'TXN-WIRE-7788',
                'payer_name' => 'ABC Fashion Ltd.',
                'bank_name' => 'Pubali Bank Limited',
                'account_number' => '1234567890',
                'payment_amount' => 4255.00,
                'payment_date' => '2026-09-25',
                'notes' => 'Full stock order settlement.',
            ])->assertOk();

        // 2. Admin reviews and approves
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$this->order->id}/payment-proof/review", [
                'action' => 'approve',
                'payment_method' => 'Bank Transfer',
                'transaction_id' => 'TXN-WIRE-7788-VERIFIED',
                'payer_name' => 'ABC Fashion Ltd.',
                'bank_name' => 'Pubali Bank Limited',
                'account_number' => '1234567890',
                'payment_amount' => 4255.00,
                'payment_date' => '2026-09-25',
            ]);
        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.payment_details.payment_status', 'PAID')
            ->assertJsonPath('data.payment_details.transaction_id', 'TXN-WIRE-7788-VERIFIED')
            ->assertJsonPath('data.payment_details.bank_name', 'Pubali Bank Limited')
            ->assertJsonPath('data.payment_details.payer_name', 'ABC Fashion Ltd.')
            ->assertJsonPath('data.payment_details.payment_amount', fn ($amount) => (float) $amount === 4255.0);

        $fresh = $this->order->fresh();
        $this->assertEquals('paid', $fresh->payment_status);
        $this->assertEquals('processing', $fresh->status);
        $this->assertNotNull($fresh->payment_confirmed_at);
        $this->assertEquals($this->admin->id, $fresh->payment_confirmed_by);
        $this->assertIsArray($fresh->payment_details);
        $this->assertEquals('PAID', $fresh->payment_details['payment_status']);
        $this->assertEquals('Pubali Bank Limited', $fresh->payment_details['bank_name']);

        // Check payment record status is succeeded
        $this->assertDatabaseHas('payments', [
            'order_id' => $this->order->id,
            'status' => 'succeeded',
            'transaction_id' => 'TXN-WIRE-7788-VERIFIED',
            'confirmed_by' => $this->admin->id,
        ]);

        // Commercial Document generation check
        $doc = $fresh->getCommercialDocument('commercial_invoice');
        $this->assertEquals('PAID', $doc['payment_details']['payment_status']);
        $this->assertEquals('TXN-WIRE-7788-VERIFIED', $doc['payment_details']['transaction_id']);
        $this->assertEquals('Pubali Bank Limited', $doc['payment_details']['bank_name']);
        $this->assertEquals(4255.00, $doc['payment_details']['payment_amount']);
    }

    public function test_customer_can_view_their_confirmed_payment_details_without_admin_private_metadata(): void
    {
        $this->order->update([
            'payment_status' => 'paid',
            'status' => 'processing',
            'payment_confirmed_at' => now(),
            'payment_confirmed_by' => $this->admin->id,
            'payment_details' => [
                'payment_status' => 'PAID',
                'payment_method' => 'Bank Wire',
                'transaction_id' => 'TXN-CONFIRMED-99',
                'payer_name' => 'ABC Fashion Ltd.',
                'bank_name' => 'Pubali Bank',
                'account_number' => '****7890',
                'payment_amount' => 4255.00,
                'currency' => 'USD',
                'payment_date' => '2026-09-25',
                'notes' => 'Customer note',
                'confirmed_at' => now()->toIso8601String(),
                'confirmed_by_id' => $this->admin->id,
                'confirmed_by_name' => 'Super Admin',
            ],
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$this->order->id}");

        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payment_details.payment_status', 'PAID')
            ->assertJsonPath('data.payment_details.transaction_id', 'TXN-CONFIRMED-99')
            ->assertJsonPath('data.payment_details.bank_name', 'Pubali Bank')
            // admin-only payment_confirmed_by should be hidden from customer OrderResource
            ->assertJsonMissingPath('data.payment_confirmed_by');
    }

    public function test_multiple_payment_attempts_are_preserved(): void
    {
        // Attempt 1: submitted then rejected by admin
        $file1 = UploadedFile::fake()->image('attempt1.jpg');
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file1,
                'transaction_id' => 'TXN-ATTEMPT-1',
                'payment_amount' => 1000.00, // wrong amount
            ])->assertOk();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$this->order->id}/payment-proof/review", [
                'action' => 'reject',
                'note' => 'Amount does not match invoice total.',
            ])->assertOk();

        $this->assertDatabaseHas('payments', [
            'order_id' => $this->order->id,
            'transaction_id' => 'TXN-ATTEMPT-1',
            'status' => 'failed',
        ]);
        $this->assertEquals('failed', $this->order->fresh()->payment_status);

        // Attempt 2: re-submitted with correct amount and confirmed
        $file2 = UploadedFile::fake()->image('attempt2.jpg');
        $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file2,
                'transaction_id' => 'TXN-ATTEMPT-2-CORRECT',
                'payment_amount' => 4255.00,
            ])->assertOk();

        $this->assertEquals('payment_submitted', $this->order->fresh()->payment_status);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$this->order->id}/payment-proof/review", [
                'action' => 'approve',
                'transaction_id' => 'TXN-ATTEMPT-2-CORRECT',
                'payment_amount' => 4255.00,
            ])->assertOk();

        // Both attempts exist in database
        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('payments', [
            'order_id' => $this->order->id,
            'transaction_id' => 'TXN-ATTEMPT-1',
            'status' => 'failed',
        ]);
        $this->assertDatabaseHas('payments', [
            'order_id' => $this->order->id,
            'transaction_id' => 'TXN-ATTEMPT-2-CORRECT',
            'status' => 'succeeded',
        ]);
        $this->assertEquals('paid', $this->order->fresh()->payment_status);
    }
}
