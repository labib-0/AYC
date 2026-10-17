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
        $file = UploadedFile::fake()->image('wire_transfer.jpg', 600, 800);

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

    public function test_customer_can_submit_payment_details_without_receipt_file(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'payment_details' => 'Arranged via WhatsApp. Transaction ID: TXN-WA-992211. Paid via Bank Wire $4255.00 on 2026-09-25.',
                'payment_method'  => 'Bank Transfer',
                'transaction_id'  => 'TXN-WA-992211',
                'payer_name'      => 'ABC Fashion Ltd.',
                'payment_amount'  => 4255.00,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'payment_submitted');

        $this->assertDatabaseHas('orders', [
            'id' => $this->order->id,
            'payment_status' => 'payment_submitted',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $this->order->id,
            'status' => 'submitted',
            'transaction_id' => 'TXN-WA-992211',
            'receipt_path' => null,
        ]);
    }

    public function test_customer_submission_fails_when_payment_details_empty_and_no_receipt(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'payment_details' => '   ',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Please enter your payment details before submitting.');
    }

    public function test_admin_can_approve_payment_and_attach_receipt_file(): void
    {
        $adminFile = UploadedFile::fake()->image('admin_bank_slip.png', 400, 400);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post("/api/v1/admin/orders/{$this->order->id}/payment-proof/review", [
                'action'         => 'approve',
                'payment_method' => 'Bank Transfer',
                'transaction_id' => 'TXN-ADMIN-CONFIRMED-88',
                'payer_name'     => 'ABC Fashion Ltd.',
                'bank_name'      => 'Pubali Bank Limited',
                'payment_amount' => 4255.00,
                'payment_date'   => '2026-09-25',
                'note'           => 'WhatsApp payment confirmed with bank slip attached by admin.',
                'receipt'        => $adminFile,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.status', 'processing');

        $fresh = $this->order->fresh();
        $this->assertEquals('paid', $fresh->payment_status);
        $this->assertNotNull($fresh->payment_proof_url);
        $this->assertEquals('PAID', $fresh->payment_details['payment_status']);
        $this->assertEquals('TXN-ADMIN-CONFIRMED-88', $fresh->payment_details['transaction_id']);
        $this->assertNotNull($fresh->payment_details['receipt_url']);
    }

    public function test_receipt_upload_with_file_only_succeeds(): void
    {
        $file = UploadedFile::fake()->image('slip_only.jpg', 600, 800);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.payment_status', 'payment_submitted');

        $fresh = $this->order->fresh();
        $this->assertNotNull($fresh->payment_proof_url);
    }

    public function test_admin_can_update_payment_receipt_directly(): void
    {
        $file = UploadedFile::fake()->image('admin_proof.png', 500, 700);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post("/api/v1/admin/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
                'notes' => 'Admin audited receipt attachment.',
            ]);

        $response->assertOk();
        $fresh = $this->order->fresh();
        $this->assertNotNull($fresh->payment_proof_url);
        // Order status must NOT automatically become paid
        $this->assertEquals('pending', $fresh->status);
        $this->assertNotEquals('paid', $fresh->payment_status);
    }

    public function test_receipt_upload_rejects_invalid_file_extension(): void
    {
        $file = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['receipt']);
    }

    public function test_receipt_upload_rejects_oversized_file(): void
    {
        // 11MB is larger than 10240KB limit
        $file = UploadedFile::fake()->create('huge_slip.pdf', 11500, 'application/pdf');

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['receipt']);
    }

    public function test_receipt_update_cleans_up_old_receipt_file_safely(): void
    {
        $file1 = UploadedFile::fake()->image('old_slip.jpg');
        $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file1,
            ])->assertOk();

        $fresh = $this->order->fresh();
        $oldPath = $fresh->payment_details['receipt_path'] ?? null;
        $this->assertNotNull($oldPath);
        Storage::disk('public')->assertExists($oldPath);

        // Upload replacement
        $file2 = UploadedFile::fake()->image('new_slip.png');
        $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file2,
            ])->assertOk();

        $fresh2 = $this->order->fresh();
        $newPath = $fresh2->payment_details['receipt_path'] ?? null;
        $this->assertNotNull($newPath);
        $this->assertNotEquals($oldPath, $newPath);

        Storage::disk('public')->assertExists($newPath);
        Storage::disk('public')->assertMissing($oldPath);
    }

    public function test_receipt_update_does_not_modify_inventory_or_mark_order_confirmed(): void
    {
        $product = Product::first();
        $initialStock = $product->stock;

        $file = UploadedFile::fake()->image('slip.jpg');
        $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
            ])->assertOk();

        $this->assertEquals($initialStock, $product->fresh()->stock);
        $this->assertEquals('pending', $this->order->fresh()->status);
    }

    public function test_receipt_is_converted_to_webp_format_on_storage(): void
    {
        $file = UploadedFile::fake()->image('original_receipt.png', 400, 600);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file,
            ]);

        $response->assertOk();

        $fresh = $this->order->fresh();
        $this->assertNotNull($fresh->payment_proof_url);
        $this->assertStringEndsWith('.webp', $fresh->payment_proof_url);

        $storedPath = $fresh->payment_details['receipt_path'] ?? '';
        $this->assertStringEndsWith('.webp', $storedPath);
        Storage::disk('public')->assertExists($storedPath);
    }

    public function test_corrupted_image_file_is_safely_rejected(): void
    {
        // File named .jpg but containing non-image corrupt payload
        $corruptFile = UploadedFile::fake()->createWithContent('corrupted.jpg', 'INVALID_CORRUPTED_BINARY_DATA_NOT_AN_IMAGE');

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $corruptFile,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['receipt']);
    }

    public function test_simulated_conversion_failure_preserves_old_receipt_and_db_state(): void
    {
        // 1. Initial valid upload
        $file1 = UploadedFile::fake()->image('first_receipt.jpg');
        $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file1,
            ])->assertOk();

        $initialOrder = $this->order->fresh();
        $oldPath = $initialOrder->payment_details['receipt_path'];
        $oldUrl = $initialOrder->payment_proof_url;
        Storage::disk('public')->assertExists($oldPath);

        // 2. Mock ReceiptImageService to simulate conversion failure
        $mockService = $this->createMock(\App\Services\ReceiptImageService::class);
        $mockService->method('convertAndStore')
            ->willThrowException(new \RuntimeException('Failed to encode receipt to WebP format: Memory limit exceeded'));
        $this->app->instance(\App\Services\ReceiptImageService::class, $mockService);

        // 3. Attempt replacement
        $file2 = UploadedFile::fake()->image('replacement_receipt.png');
        try {
            $this->actingAs($this->customer, 'sanctum')
                ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                    'receipt' => $file2,
                ]);
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Failed to encode receipt to WebP', $e->getMessage());
        }

        // 4. Verify old receipt remains completely intact
        $afterOrder = $this->order->fresh();
        $this->assertEquals($oldUrl, $afterOrder->payment_proof_url);
        $this->assertEquals($oldPath, $afterOrder->payment_details['receipt_path']);
        Storage::disk('public')->assertExists($oldPath);
    }

    public function test_simulated_storage_failure_preserves_old_receipt_and_db_state(): void
    {
        // 1. Initial valid upload
        $file1 = UploadedFile::fake()->image('initial_receipt.png');
        $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file1,
            ])->assertOk();

        $initialOrder = $this->order->fresh();
        $oldPath = $initialOrder->payment_details['receipt_path'];
        $oldUrl = $initialOrder->payment_proof_url;
        Storage::disk('public')->assertExists($oldPath);

        // 2. Mock ReceiptImageService to simulate storage failure
        $mockService = $this->createMock(\App\Services\ReceiptImageService::class);
        $mockService->method('convertAndStore')
            ->willThrowException(new \RuntimeException('Failed to store converted WebP receipt to storage disk.'));
        $this->app->instance(\App\Services\ReceiptImageService::class, $mockService);

        // 3. Attempt replacement
        $file2 = UploadedFile::fake()->image('new_receipt.jpg');
        try {
            $this->actingAs($this->customer, 'sanctum')
                ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                    'receipt' => $file2,
                ]);
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Failed to store converted WebP receipt', $e->getMessage());
        }

        // 4. Verify old receipt remains untouched
        $afterOrder = $this->order->fresh();
        $this->assertEquals($oldUrl, $afterOrder->payment_proof_url);
        Storage::disk('public')->assertExists($oldPath);
    }

    public function test_simulated_persistence_failure_rolls_back_and_removes_new_stored_file(): void
    {
        // 1. Initial valid upload
        $file1 = UploadedFile::fake()->image('original_slip.jpg');
        $this->actingAs($this->customer, 'sanctum')
            ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => $file1,
            ])->assertOk();

        $initialOrder = $this->order->fresh();
        $oldPath = $initialOrder->payment_details['receipt_path'];
        $oldUrl = $initialOrder->payment_proof_url;
        Storage::disk('public')->assertExists($oldPath);

        // Count files currently in storage
        $filesBefore = Storage::disk('public')->allFiles('order-receipts');
        $this->assertCount(1, $filesBefore);

        // 2. Attach a database event listener or throw during order updating to simulate DB persistence crash
        \App\Models\OrderStatusEvent::saving(function () {
            throw new \PDOException('Simulated database connection loss during payment receipt persistence');
        });

        // 3. Attempt replacement
        $file2 = UploadedFile::fake()->image('replacement_slip.png');
        try {
            $this->actingAs($this->customer, 'sanctum')
                ->post("/api/v1/orders/{$this->order->id}/payment-proof", [
                    'receipt' => $file2,
                ]);
        } catch (\PDOException $e) {
            $this->assertStringContainsString('Simulated database connection loss', $e->getMessage());
        }

        // 4. Verify transactional rollback:
        // - Old receipt file is still preserved on disk
        Storage::disk('public')->assertExists($oldPath);
        // - No new orphan file was left on disk
        $filesAfter = Storage::disk('public')->allFiles('order-receipts');
        $this->assertCount(1, $filesAfter);
        $this->assertEquals($filesBefore, $filesAfter);

        // - Order database record still references the old receipt
        $afterOrder = $this->order->fresh();
        $this->assertEquals($oldUrl, $afterOrder->payment_proof_url);
        $this->assertEquals($oldPath, $afterOrder->payment_details['receipt_path']);
    }

    public function test_multiple_receipt_attachments_rejected_only_single_image_allowed(): void
    {
        $file1 = UploadedFile::fake()->image('slip1.jpg');
        $file2 = UploadedFile::fake()->image('slip2.jpg');

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$this->order->id}/payment-proof", [
                'receipt' => [$file1, $file2],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['receipt']);
    }
}

