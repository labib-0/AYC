<?php

namespace Tests\Feature\Notification;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\User;
use App\Notifications\AdminRfqReceivedNotification;
use App\Notifications\RfqApprovedNotification;
use App\Notifications\RfqCreatedNotification;
use App\Notifications\RfqRejectedNotification;
use App\Services\Notification\RfqNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RfqTransactionalEmailTest extends TestCase
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
    }

    public function test_customer_and_admin_receive_submission_notifications(): void
    {
        Notification::fake();
        Config::set('mail.admin_recipients', 'exports@ayaanclothing.com');

        $payload = [
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'buyer_phone' => '+46 8 123 4567',
            'company_name' => 'Nordic Apparel AB',
            'destination_country' => 'Sweden',
            'destination_city' => 'Gothenburg',
            'shipping_port' => 'Port of Gothenburg',
            'target_delivery_date' => now()->addDays(45)->toDateString(),
            'general_notes' => 'Looking for organic certification (GOTS) and custom woven neck labels.',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 500,
                    'target_price' => 19.50,
                ],
            ],
        ];

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/rfq', $payload);

        $response->assertStatus(201);
        $rfqId = $response->json('data.id');
        $rfqNumber = $response->json('data.rfq_number');

        // 1. Assert Customer received submission confirmation
        Notification::assertSentTo(
            $this->customer,
            RfqCreatedNotification::class,
            function (RfqCreatedNotification $notification) use ($rfqNumber) {
                return $notification->rfq->rfq_number === $rfqNumber;
            }
        );

        // 2. Assert Admin received new RFQ alert on demand
        Notification::assertSentOnDemand(
            AdminRfqReceivedNotification::class,
            function (AdminRfqReceivedNotification $notification, array $channels, AnonymousNotifiable $notifiable) use ($rfqNumber) {
                return $notification->rfq->rfq_number === $rfqNumber
                    && $notifiable->routes['mail'] === 'exports@ayaanclothing.com';
            }
        );
    }

    public function test_customer_receives_approval_notification_with_admin_notes(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-000101',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'destination_country' => 'Sweden',
            'status' => 'SUBMITTED',
        ]);

        QuoteItem::create([
            'quote_id' => $rfq->id,
            'product_name' => 'Organic Cotton Hoodie',
            'quantity' => 1000,
            'target_price' => 18.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/rfq/{$rfq->id}/status", [
                'status' => 'APPROVED',
                'note' => 'Target unit price accepted. Proforma offer sheet in preparation.',
            ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            $this->customer,
            RfqApprovedNotification::class,
            function (RfqApprovedNotification $notification) use ($rfq) {
                return $notification->rfq->id === $rfq->id
                    && $notification->approvalNote === 'Target unit price accepted. Proforma offer sheet in preparation.';
            }
        );
    }

    public function test_customer_receives_rejection_notification_with_recorded_reason(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-000102',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'destination_country' => 'Sweden',
            'status' => 'SUBMITTED',
        ]);

        QuoteItem::create([
            'quote_id' => $rfq->id,
            'product_name' => 'Custom Zip Hoodie',
            'quantity' => 50,
            'target_price' => 12.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/rfq/{$rfq->id}/status", [
                'status' => 'REJECTED',
                'note' => 'Requested quantity is below factory MOQ threshold of 250 units.',
            ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            $this->customer,
            RfqRejectedNotification::class,
            function (RfqRejectedNotification $notification) use ($rfq) {
                return $notification->rfq->id === $rfq->id
                    && $notification->rejectionReason === 'Requested quantity is below factory MOQ threshold of 250 units.';
            }
        );
    }

    public function test_missing_or_synthetic_email_does_not_send_mail(): void
    {
        Notification::fake();

        $service = new RfqNotificationService();

        $this->assertFalse($service->isValidCustomerEmail(null));
        $this->assertFalse($service->isValidCustomerEmail(''));
        $this->assertFalse($service->isValidCustomerEmail('invalid-email-string'));
        $this->assertFalse($service->isValidCustomerEmail('test@example.com'));
        $this->assertFalse($service->isValidCustomerEmail('user@test.local'));
        $this->assertTrue($service->isValidCustomerEmail('valid.buyer@company.co.uk'));

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-000103',
            'buyer_name' => 'No Email Buyer',
            'buyer_email' => 'fake@example.com',
            'company_name' => 'Synthetic Corp',
            'status' => 'SUBMITTED',
        ]);

        $service->notifyApproval($rfq, 'Note');
        $service->notifyRejection($rfq, 'Reason');

        Notification::assertNothingSent();
    }

    public function test_duplicate_events_prevent_duplicate_notifications(): void
    {
        Notification::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-000104',
            'user_id' => $this->customer->id,
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'status' => 'SUBMITTED',
        ]);

        // First approval
        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/rfq/{$rfq->id}/status", [
                'status' => 'APPROVED',
                'note' => 'Approved run 1',
            ]);
        $res1->assertStatus(200);

        // Second approval attempt on already approved RFQ
        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/rfq/{$rfq->id}/status", [
                'status' => 'APPROVED',
                'note' => 'Approved run 2',
            ]);
        $res2->assertStatus(200);

        // Notification must have only been sent once
        Notification::assertSentToTimes($this->customer, RfqApprovedNotification::class, 1);
    }

    public function test_notifications_implement_should_queue_with_retry_and_backoff(): void
    {
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-000105',
            'buyer_name' => 'Test',
            'buyer_email' => 'test@buyer.com',
            'company_name' => 'Buyer Corp',
            'status' => 'SUBMITTED',
        ]);

        $notif1 = new RfqCreatedNotification($rfq);
        $notif2 = new AdminRfqReceivedNotification($rfq);
        $notif3 = new RfqApprovedNotification($rfq, 'Note');
        $notif4 = new RfqRejectedNotification($rfq, 'Reason');

        $this->assertInstanceOf(ShouldQueue::class, $notif1);
        $this->assertInstanceOf(ShouldQueue::class, $notif2);
        $this->assertInstanceOf(ShouldQueue::class, $notif3);
        $this->assertInstanceOf(ShouldQueue::class, $notif4);

        $this->assertSame(3, $notif1->tries);
        $this->assertSame([30, 120], $notif1->backoff);
        $this->assertSame(3, $notif2->tries);
        $this->assertSame([30, 120], $notif2->backoff);
        $this->assertSame(3, $notif3->tries);
        $this->assertSame([30, 120], $notif3->backoff);
        $this->assertSame(3, $notif4->tries);
        $this->assertSame([30, 120], $notif4->backoff);
    }

    public function test_email_blade_views_render_valid_html_and_text(): void
    {
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-AYN-2026-000106',
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'destination_country' => 'Sweden',
            'destination_city' => 'Gothenburg',
            'status' => 'SUBMITTED',
        ]);

        QuoteItem::create([
            'quote_id' => $rfq->id,
            'product_name' => 'Fleece Zip Hoodie 450GSM',
            'quantity' => 750,
            'target_price' => 21.00,
        ]);

        $rfq->load('items');

        // Customer created view
        $html1 = view('emails.rfq.customer-created', [
            'rfq' => $rfq,
            'viewUrl' => 'https://ayaanclothing.com/dashboard/rfq/' . $rfq->id,
            'subject' => 'RFQ Received',
        ])->render();
        $this->assertStringContainsString('RFQ-AYN-2026-000106', $html1);
        $this->assertStringContainsString('Fleece Zip Hoodie 450GSM', $html1);

        $text1 = view('emails.rfq.customer-created-text', [
            'rfq' => $rfq,
            'viewUrl' => 'https://ayaanclothing.com/dashboard/rfq/' . $rfq->id,
        ])->render();
        $this->assertStringContainsString('RFQ-AYN-2026-000106', $text1);

        // Admin created view
        $html2 = view('emails.rfq.admin-created', [
            'rfq' => $rfq,
            'adminUrl' => 'https://ayaanclothing.com/ayc/rfq/' . $rfq->id,
            'subject' => 'New RFQ Received',
        ])->render();
        $this->assertStringContainsString('https://ayaanclothing.com/ayc/rfq/' . $rfq->id, $html2);
        $this->assertStringContainsString('Protected Administrative Link', $html2);

        // Customer approved view
        $html3 = view('emails.rfq.customer-approved', [
            'rfq' => $rfq,
            'approvalNote' => 'Target fabric certified OEKO-TEX standard 100.',
            'viewUrl' => 'https://ayaanclothing.com/dashboard/rfq/' . $rfq->id,
            'subject' => 'RFQ Approved',
        ])->render();
        $this->assertStringContainsString('APPROVED', $html3);
        $this->assertStringContainsString('Target fabric certified OEKO-TEX standard 100.', $html3);

        // Customer rejected view
        $html4 = view('emails.rfq.customer-rejected', [
            'rfq' => $rfq,
            'rejectionReason' => 'Target price below yarn procurement rate.',
            'viewUrl' => 'https://ayaanclothing.com/dashboard/rfq/' . $rfq->id,
            'subject' => 'RFQ Update',
        ])->render();
        $this->assertStringContainsString('REJECTED', $html4);
        $this->assertStringContainsString('Target price below yarn procurement rate.', $html4);
    }

    public function test_notification_failure_does_not_rollback_or_fail_rfq_creation(): void
    {
        // Bind a throwing notification service into container
        $throwingService = new class extends RfqNotificationService {
            public function notifySubmission(Quote $rfq): void
            {
                // Throws an unhandled exception internally, which must be caught safely
                throw new \RuntimeException('Simulated SMTP connection timeout or network outage');
            }
        };

        $this->app->instance(RfqNotificationService::class, $throwingService);

        $payload = [
            'buyer_name' => 'Resilience Test Buyer',
            'buyer_email' => 'resilience@buyer-corp.com',
            'company_name' => 'Resilience Apparel Corp',
            'destination_country' => 'Norway',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 200,
                    'target_price' => 20.00,
                ],
            ],
        ];

        // Must still succeed with 201 Created because mail failure must NEVER abort the RFQ transaction
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/rfq', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('quotes', [
            'company_name' => 'Resilience Apparel Corp',
            'buyer_email' => 'resilience@buyer-corp.com',
        ]);
    }

    public function test_admin_recipients_parsing_multiple_and_empty(): void
    {
        $service = new RfqNotificationService();

        Config::set('mail.admin_recipients', 'export@ayc.com, director@ayc.com ; merchandising@ayc.com , invalid-email');
        $recipients = $service->getAdminRecipients();

        $this->assertCount(3, $recipients);
        $this->assertContains('export@ayc.com', $recipients);
        $this->assertContains('director@ayc.com', $recipients);
        $this->assertContains('merchandising@ayc.com', $recipients);
        $this->assertNotContains('invalid-email', $recipients);

        Config::set('mail.admin_recipients', '');
        $this->assertSame([], $service->getAdminRecipients());
    }

    public function test_privacy_and_isolation_of_customer_notifications(): void
    {
        Notification::fake();

        $otherCustomer = User::factory()->create([
            'name' => 'Other Buyer',
            'email' => 'other@competitor.com',
            'role' => 'customer',
        ]);

        $payload = [
            'buyer_name' => 'Karin Lindqvist',
            'buyer_email' => 'karin@nordic-apparel.se',
            'company_name' => 'Nordic Apparel AB',
            'destination_country' => 'Sweden',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 300,
                ],
            ],
        ];

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/rfq', $payload);
        $response->assertStatus(201);

        // Assert notification sent ONLY to the submitting customer
        Notification::assertSentTo($this->customer, RfqCreatedNotification::class);
        // Assert other customer never receives notification
        Notification::assertNotSentTo($otherCustomer, RfqCreatedNotification::class);
    }
}

