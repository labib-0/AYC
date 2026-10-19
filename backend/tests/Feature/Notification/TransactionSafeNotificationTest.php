<?php

namespace Tests\Feature\Notification;

use App\Jobs\SendOrderConfirmationEmailJob;
use App\Jobs\SendOrderConfirmedEmailJob;
use App\Jobs\SendPaymentProofReceivedEmailJob;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\User;
use App\Notifications\AdminRfqReceivedNotification;
use App\Notifications\CustomerVerifyEmailNotification;
use App\Notifications\RfqApprovedNotification;
use App\Notifications\RfqCreatedNotification;
use App\Notifications\RfqRejectedNotification;
use App\Services\Mail\OrderEmailService;
use App\Services\Notification\RfqNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TransactionSafeNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $admin;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'name' => 'Karin Lindqvist',
            'email' => 'karin@nordic-apparel.se',
            'role' => 'customer',
            'company_name' => 'Nordic Apparel AB',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Managing Director',
            'email' => 'director@ayaanclothing.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $brand = Brand::create(['name' => 'AYC Signature', 'slug' => 'ayc-sig', 'is_active' => true]);
        $category = Category::create(['name' => 'Hoodies', 'slug' => 'hoodies', 'is_active' => true]);

        $this->product = Product::create([
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'name' => 'Heavyweight 450GSM Organic Fleece Hoodie',
            'slug' => 'heavyweight-450gsm-organic-fleece-hoodie',
            'sku' => 'HD-450-ORG',
            'type' => 'simple',
            'is_active' => true,
            'price' => 22.50,
            'moq' => 100,
        ]);

        Config::set('mail.admin_recipients', 'exports@ayaanclothing.com');
    }

    public function test_rfq_notifications_not_dispatched_until_transaction_commits(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-TX001',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'status' => 'SUBMITTED',
        ]);

        $service = new RfqNotificationService();

        DB::beginTransaction();

        $service->notifySubmission($rfq);

        // While transaction is in flight, neither notification nor deduplication cache key should exist
        Notification::assertNothingSent();
        $this->assertFalse(Cache::has("rfq_notified_submission_{$rfq->id}"));
        $this->assertFalse(Cache::has("rfq_notified_admin_alert_{$rfq->id}"));

        DB::commit();

        // After commit, notifications are dispatched and deduplication keys are set
        Notification::assertSentTo($this->customer, RfqCreatedNotification::class);
        Notification::assertSentOnDemand(AdminRfqReceivedNotification::class);

        $this->assertTrue(Cache::has("rfq_notified_submission_{$rfq->id}"));
        $this->assertTrue(Cache::has("rfq_notified_admin_alert_{$rfq->id}"));
    }

    public function test_rfq_notifications_and_cache_keys_discarded_on_transaction_rollback(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-TX002',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'status' => 'SUBMITTED',
        ]);

        $service = new RfqNotificationService();

        DB::beginTransaction();

        $service->notifySubmission($rfq);

        DB::rollBack();

        // Following rollback, zero notifications are sent and zero cache keys persist
        Notification::assertNothingSent();
        $this->assertFalse(Cache::has("rfq_notified_submission_{$rfq->id}"));
        $this->assertFalse(Cache::has("rfq_notified_admin_alert_{$rfq->id}"));
    }

    public function test_rfq_approval_notification_is_transaction_safe(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-TX003',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'status' => 'SUBMITTED',
        ]);

        $service = new RfqNotificationService();

        // Rollback test
        DB::beginTransaction();
        $service->notifyApproval($rfq, 'Approval note on uncommitted tx');
        DB::rollBack();

        Notification::assertNothingSent();
        $this->assertFalse(Cache::has("rfq_notified_approval_{$rfq->id}"));

        // Commit test
        DB::beginTransaction();
        $service->notifyApproval($rfq, 'Authoritative approval note');
        Notification::assertNothingSent();
        DB::commit();

        Notification::assertSentTo($this->customer, RfqApprovedNotification::class);
        $this->assertTrue(Cache::has("rfq_notified_approval_{$rfq->id}"));
    }

    public function test_concurrent_duplicate_notification_attempts_dispatch_at_most_once(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-TX004',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'status' => 'SUBMITTED',
        ]);

        $service = new RfqNotificationService();

        // First dispatch
        $service->notifySubmission($rfq);

        // Immediate second duplicate dispatch attempt
        $service->notifySubmission($rfq);

        // Exactly 1 customer notification and 1 admin alert dispatched
        Notification::assertSentToTimes($this->customer, RfqCreatedNotification::class, 1);
        Notification::assertSentTimes(AdminRfqReceivedNotification::class, 1);
    }

    public function test_order_confirmation_continues_to_dispatch_after_commit(): void
    {
        Queue::fake();

        Config::set('order.emails.enabled', true);

        $order = Order::create([
            'order_number' => 'AYN-20261020-TX0001',
            'user_id' => $this->customer->id,
            'status' => 'processing',
            'payment_status' => 'paid',
            'currency' => 'USD',
            'subtotal' => 225.00,
            'shipping_cost' => 15.00,
            'tax_amount' => 0.00,
            'other_charges' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => 240.00,
            'email' => 'karin@nordic-apparel.se',
            'shipping_name' => 'Karin Lindqvist',
            'shipping_address1' => 'Storgatan 12',
            'shipping_city' => 'Gothenburg',
            'shipping_postal_code' => '41101',
            'shipping_country_code' => 'SE',
            'placed_at' => now(),
        ]);

        $dispatch = app(OrderEmailService::class)->queueOrderConfirmation($order);

        $this->assertNotNull($dispatch);
        $this->assertEquals(\App\Models\OrderEmailDispatch::STATUS_QUEUED, $dispatch->status);

        Queue::assertPushed(SendOrderConfirmationEmailJob::class, function ($job) use ($order, $dispatch) {
            return $job->orderId === $order->id
                && $job->dispatchId === $dispatch->id
                && $job->afterCommit === true;
        });

        $this->assertTrue((new SendOrderConfirmedEmailJob($order->id))->afterCommit);
        $this->assertTrue((new SendPaymentProofReceivedEmailJob($order->id))->afterCommit);
    }

    public function test_queued_notifications_and_redis_queue_have_after_commit_configured(): void
    {
        $rfq = new Quote(['id' => 999, 'rfq_number' => 'RFQ-AYN-2026-UNIT']);

        $rfqCreated = new RfqCreatedNotification($rfq);
        $this->assertTrue($rfqCreated->afterCommit);

        $adminReceived = new AdminRfqReceivedNotification($rfq);
        $this->assertTrue($adminReceived->afterCommit);

        $rfqApproved = new RfqApprovedNotification($rfq);
        $this->assertTrue($rfqApproved->afterCommit);

        $rfqRejected = new RfqRejectedNotification($rfq);
        $this->assertTrue($rfqRejected->afterCommit);

        $verifyEmail = new CustomerVerifyEmailNotification();
        $this->assertTrue($verifyEmail->afterCommit);

        $this->assertTrue(config('queue.connections.redis.after_commit'));
    }

    public function test_synthetic_domain_rejection_does_not_persist_deduplication_keys(): void
    {
        Notification::fake();
        Config::set('mail.admin_recipients', '');

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-SYNTH',
            'buyer_name' => 'Synthetic Buyer',
            'buyer_email' => 'test@example.com',
            'company_name' => 'Example Corp',
            'status' => 'SUBMITTED',
        ]);

        $service = new RfqNotificationService();
        $service->notifySubmission($rfq);

        Notification::assertNothingSent();
        $this->assertFalse(Cache::has("rfq_notified_submission_{$rfq->id}"));
    }
}
