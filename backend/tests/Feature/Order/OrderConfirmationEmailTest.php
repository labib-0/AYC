<?php

namespace Tests\Feature\Order;

use App\Jobs\SendOrderConfirmationEmailJob;
use App\Mail\CustomerOrderConfirmationMail;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderEmailDispatch;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use App\Services\Mail\OrderEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class OrderConfirmationEmailTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected Product $product;
    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Authoritative business & banking settings
        SystemSetting::set('company_name', 'Ayaan Clothing Ltd.', 'string', 'business');
        SystemSetting::set('company_tagline', 'Ready-made Garments Manufacturer & Exporter', 'string', 'business');
        SystemSetting::set('support_email', 'export@ayaanclothing.com', 'string', 'contact');
        SystemSetting::set('whatsapp_display', '+880 1620-853502', 'string', 'contact');
        SystemSetting::set('whatsapp_number', '8801620853502', 'string', 'contact');
        SystemSetting::set('bank_name', 'Pubali Bank Limited', 'string', 'banking');
        SystemSetting::set('bank_branch', 'Uttara Model Town Corporate Branch', 'string', 'banking');
        SystemSetting::set('bank_account_name', 'M/S AYAAN CLOTHING', 'string', 'banking');
        SystemSetting::set('bank_account_number', '1788-901-044316', 'string', 'banking');
        SystemSetting::set('bank_swift_code', 'PUBABDDH210', 'string', 'banking');

        // 2. Customer
        $this->customer = User::factory()->create([
            'name' => 'Commercial Buyer',
            'email' => 'buyer@international-apparel.com',
            'role' => 'customer',
        ]);

        // 3. Category & Brand & Product
        $category = Category::create([
            'name' => 'Knitwear',
            'slug' => 'knitwear',
            'is_active' => true,
        ]);

        $brand = Brand::create([
            'name' => 'Ayaan Basics',
            'slug' => 'ayaan-basics',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'name' => 'Premium Heavyweight Cotton T-Shirt',
            'slug' => 'premium-heavyweight-cotton-tshirt',
            'sku' => 'AYN-TSHIRT-001',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'price' => 12.50,
            'regular_price' => 15.00,
            'stock' => 5000,
            'is_active' => true,
        ]);

        // 4. Order
        $this->order = Order::create([
            'order_number' => 'ORD-2026-990011',
            'user_id' => $this->customer->id,
            'status' => Order::CUSTOMER_STATUS_ORDER_PLACED,
            'payment_status' => 'pending',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 2500.00,
            'shipping_cost' => 150.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => 2650.00,
            'payment_method' => 'bank_transfer',
            'email' => 'buyer@international-apparel.com',
            'shipping_name' => 'Commercial Buyer Ltd.',
            'shipping_address1' => 'Terminalgatan 4',
            'shipping_city' => 'Gothenburg',
            'shipping_country_code' => 'Sweden',
            'shipping_phone' => '+46 31 123 4567',
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'sku' => $this->product->sku,
            'quantity' => 200,
            'unit_price' => 12.50,
            'line_total' => 2500.00,
            'size' => 'L',
            'color' => 'Navy',
        ]);
    }

    /** 1. Default configuration: ORDER_EMAILS_ENABLED is false and dispatches no email */
    public function test_01_order_confirmation_email_is_disabled_by_default(): void
    {
        Queue::fake();
        Mail::fake();

        Config::set('order.emails.enabled', false);

        $service = app(OrderEmailService::class);
        $result = $service->queueOrderConfirmation($this->order);

        $this->assertNull($result);
        Queue::assertNothingPushed();
        Mail::assertNothingSent();
        $this->assertDatabaseMissing('order_email_dispatches', [
            'order_id' => $this->order->id,
        ]);
    }

    /** 2. Enabled flag schedules queued email job after commit */
    public function test_02_enabled_flag_queues_order_confirmation_notification(): void
    {
        Queue::fake();

        Config::set('order.emails.enabled', true);

        $service = app(OrderEmailService::class);
        $dispatch = $service->queueOrderConfirmation($this->order);

        $this->assertInstanceOf(OrderEmailDispatch::class, $dispatch);
        $this->assertEquals(OrderEmailDispatch::STATUS_QUEUED, $dispatch->status);
        $this->assertEquals($this->order->email, $dispatch->recipient_email);
        $this->assertEquals("order_confirmation_{$this->order->id}", $dispatch->idempotency_key);

        Queue::assertPushed(SendOrderConfirmationEmailJob::class, function ($job) use ($dispatch) {
            return $job->orderId === $this->order->id && $job->dispatchId === $dispatch->id;
        });
    }

    /** 3. Duplicate trigger attempts do not duplicate outbox records */
    public function test_03_duplicate_triggers_respect_idempotency_key(): void
    {
        Queue::fake();
        Config::set('order.emails.enabled', true);

        $service = app(OrderEmailService::class);

        $first = $service->queueOrderConfirmation($this->order);
        $second = $service->queueOrderConfirmation($this->order);

        $this->assertEquals($first->id, $second->id);
        $this->assertEquals(1, OrderEmailDispatch::where('order_id', $this->order->id)->count());
    }

    /** 4. Missing or invalid customer email suppresses delivery and records failure */
    public function test_04_missing_or_invalid_customer_email_suppresses_dispatch(): void
    {
        Queue::fake();
        Config::set('order.emails.enabled', true);

        $noEmailOrder = Order::create([
            'order_number' => 'ORD-2026-990022',
            'user_id' => null,
            'status' => 'order_placed',
            'payment_status' => 'pending',
            'currency' => 'USD',
            'subtotal' => 100.00,
            'total_amount' => 100.00,
            'email' => null,
            'shipping_name' => 'Anonymous Walkin',
        ]);

        $service = app(OrderEmailService::class);
        $dispatch = $service->queueOrderConfirmation($noEmailOrder);

        $this->assertNotNull($dispatch);
        $this->assertEquals(OrderEmailDispatch::STATUS_FAILED, $dispatch->status);
        $this->assertEquals('invalid_recipient', $dispatch->error_category);

        Queue::assertNothingPushed();
    }

    /** 5. POS synthetic account suppresses delivery cleanly */
    public function test_05_pos_synthetic_account_suppresses_delivery_cleanly(): void
    {
        Queue::fake();
        Config::set('order.emails.enabled', true);

        $posOrder = Order::create([
            'order_number' => 'ORD-2026-990033',
            'user_id' => null,
            'status' => 'order_placed',
            'payment_status' => 'paid',
            'currency' => 'USD',
            'subtotal' => 50.00,
            'total_amount' => 50.00,
            'email' => 'walkin_customer_8801700000000@ayaan.local',
            'shipping_name' => 'Walkin POS Buyer',
        ]);

        $service = app(OrderEmailService::class);
        $dispatch = $service->queueOrderConfirmation($posOrder);

        $this->assertNotNull($dispatch);
        $this->assertEquals(OrderEmailDispatch::STATUS_SKIPPED, $dispatch->status);
        $this->assertEquals('skipped', $dispatch->error_category);

        Queue::assertNothingPushed();
    }

    /** 6. Queued job generates valid PI and Offer Sheet attachments and delivers mail */
    public function test_06_queued_job_generates_attachments_and_sends_email(): void
    {
        Mail::fake();
        Config::set('order.emails.enabled', true);

        $dispatch = OrderEmailDispatch::create([
            'order_id' => $this->order->id,
            'notification_type' => OrderEmailDispatch::TYPE_ORDER_CONFIRMATION,
            'idempotency_key' => "order_confirmation_{$this->order->id}",
            'recipient_email' => $this->order->email,
            'recipient_name' => $this->order->shipping_name,
            'status' => OrderEmailDispatch::STATUS_QUEUED,
        ]);

        $job = new SendOrderConfirmationEmailJob($this->order->id, $dispatch->id);
        $job->handle(
            app(ProformaInvoiceService::class),
            app(OfferSheetService::class),
            app(DocumentPdfService::class)
        );

        $dispatch->refresh();
        $this->assertEquals(OrderEmailDispatch::STATUS_SENT, $dispatch->status);
        $this->assertNotNull($dispatch->sent_at);
        $this->assertEquals(2, $dispatch->attachments_count);

        Mail::assertSent(CustomerOrderConfirmationMail::class, function ($mail) {
            $this->assertEquals($this->order->email, $mail->to[0]['address']);
            $this->assertStringContainsString($this->order->order_number, $mail->subject);

            // Verify attachments
            $this->assertNotEmpty($mail->piPdfBinary);
            $this->assertStringStartsWith('%PDF-', $mail->piPdfBinary);
            $this->assertStringStartsWith('AYC_PI_', $mail->piFilename);

            $this->assertNotEmpty($mail->offerPdfBinary);
            $this->assertStringStartsWith('%PDF-', $mail->offerPdfBinary);
            $this->assertStringStartsWith('AYC_Offer_Sheet_', $mail->offerFilename);

            return true;
        });
    }

    /** 7. Already sent dispatch ignores repeated job executions */
    public function test_07_already_sent_dispatch_ignores_repeated_execution(): void
    {
        Mail::fake();
        Config::set('order.emails.enabled', true);

        $dispatch = OrderEmailDispatch::create([
            'order_id' => $this->order->id,
            'notification_type' => OrderEmailDispatch::TYPE_ORDER_CONFIRMATION,
            'idempotency_key' => "order_confirmation_{$this->order->id}",
            'recipient_email' => $this->order->email,
            'recipient_name' => $this->order->shipping_name,
            'status' => OrderEmailDispatch::STATUS_SENT,
            'sent_at' => now(),
            'attempts' => 1,
        ]);

        $job = new SendOrderConfirmationEmailJob($this->order->id, $dispatch->id);
        $job->handle(
            app(ProformaInvoiceService::class),
            app(OfferSheetService::class),
            app(DocumentPdfService::class)
        );

        // Mail must NOT be sent again
        Mail::assertNothingSent();
        $this->assertEquals(1, $dispatch->fresh()->attempts);
    }

    /** 8. Failed dispatch can be retried by operator */
    public function test_08_failed_dispatch_can_be_retried(): void
    {
        Queue::fake();
        Config::set('order.emails.enabled', true);

        $dispatch = OrderEmailDispatch::create([
            'order_id' => $this->order->id,
            'notification_type' => OrderEmailDispatch::TYPE_ORDER_CONFIRMATION,
            'idempotency_key' => "order_confirmation_{$this->order->id}",
            'recipient_email' => $this->order->email,
            'recipient_name' => $this->order->shipping_name,
            'status' => OrderEmailDispatch::STATUS_FAILED,
            'error_category' => 'transport_error',
            'error_message' => 'Connection timeout to SMTP host',
        ]);

        $service = app(OrderEmailService::class);
        $retried = $service->retryDispatch($dispatch);

        $this->assertTrue($retried);
        $this->assertEquals(OrderEmailDispatch::STATUS_QUEUED, $dispatch->fresh()->status);
        $this->assertNull($dispatch->fresh()->error_category);

        Queue::assertPushed(SendOrderConfirmationEmailJob::class);
    }

    /** 9. Blade email templates render authoritative content without placeholders */
    public function test_09_email_templates_render_authoritative_content(): void
    {
        $mail = new CustomerOrderConfirmationMail(
            $this->order,
            '%PDF-1.4 Mock PI',
            'AYC_PI_PI-2026-990011.pdf',
            '%PDF-1.4 Mock Offer Sheet',
            'AYC_Offer_Sheet_ORD-2026-990011.pdf'
        );

        $html = $mail->render();

        // 1. Customer greeting & Order Reference
        $this->assertStringContainsString('Commercial Buyer Ltd.', $html);
        $this->assertStringContainsString('ORD-2026-990011', $html);
        $this->assertStringContainsString('USD 2,650.00', $html);

        // 2. Attachments listed
        $this->assertStringContainsString('AYC_PI_PI-2026-990011.pdf', $html);
        $this->assertStringContainsString('AYC_Offer_Sheet_ORD-2026-990011.pdf', $html);

        // 3. Payment Instructions & Official Bank Details
        $this->assertStringContainsString('Pubali Bank Limited', $html);
        $this->assertStringContainsString('1788-901-044316', $html);
        $this->assertStringContainsString('PUBABDDH210', $html);

        // 4. WhatsApp Export Contact
        $this->assertStringContainsString('+880 1620-853502', $html);
        $this->assertStringContainsString('wa.me/8801620853502', $html);

        // 5. Order Dashboard Payment Link
        $this->assertStringContainsString("/dashboard/orders/{$this->order->id}", $html);

        // 6. Clean Sender Name & Footer Branding (No M/S, No Automated Disclaimer)
        $mail->build();
        $this->assertEquals('AYAAN CLOTHING', $mail->from[0]['name']);
        $this->assertStringContainsString('<strong>AYAAN CLOTHING</strong> &bull; Ready-made Garments Manufacturer & Exporter', $html);
        $this->assertStringNotContainsString('<strong>M/S AYAAN CLOTHING</strong>', $html);
        $this->assertStringNotContainsString('This is an automated transactional notification', $html);
        $this->assertStringNotContainsString('Please do not reply directly to this email', $html);
    }
}
