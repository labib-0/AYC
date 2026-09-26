<?php

namespace Tests\Feature\Infrastructure;

use App\Jobs\GenerateCommercialDocumentJob;
use App\Models\Activity;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Quote;
use App\Models\Quotation;
use App\Models\User;
use App\Notifications\OrderCreatedNotification;
use App\Notifications\RfqCreatedNotification;
use App\Services\Cache\CatalogCacheService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schedule;
use Tests\TestCase;

class InfrastructureAndPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Managing Director',
            'email' => 'admin@ayaan.com',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Nordic Buyer',
            'email' => 'buyer@nordic.no',
            'role' => 'customer',
            'company_name' => 'Nordic Wear AS',
        ]);
    }

    /**
     * 1. Health Probe Check
     */
    public function test_health_check_endpoint_returns_ok_and_service_status(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'ok',
                    'services' => [
                        'database' => 'ok',
                        'cache' => 'ok',
                    ],
                ],
            ]);

        // Verify zero secrets leaked
        $json = $response->json();
        $this->assertArrayNotHasKey('password', $json['data']);
        $this->assertArrayNotHasKey('connection', $json['data']);
    }

    /**
     * 2. Public Catalog Caching and Invalidation on Admin Mutation
     */
    public function test_public_catalog_caching_and_admin_invalidation(): void
    {
        Cache::flush();

        $category = Category::create([
            'name' => 'Knitwear Collection',
            'slug' => 'knitwear-collection',
            'is_active' => true,
        ]);

        $brand = Brand::create([
            'name' => 'Ayaan Signature',
            'slug' => 'ayaan-signature',
            'is_active' => true,
        ]);

        $product = Product::create([
            'name' => 'Cashmere Pullover',
            'slug' => 'cashmere-pullover',
            'sku' => 'PUL-CSH-001',
            'brand_id' => $brand->id,
            'wholesale_price' => 45.00,
            'cost_price' => 28.00,
            'moq' => 50,
            'status' => 'published',
            'design_type' => 'ORIGINAL',
        ]);

        // First public request caches product
        $this->getJson("/api/v1/products/{$product->slug}")->assertStatus(200);
        $this->assertTrue(Cache::has(CatalogCacheService::productKey($product->slug, false)));

        // Admin updates product price
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'name' => 'Cashmere Pullover Elite',
            'wholesale_price' => 48.00,
        ])->assertStatus(200);

        // Cache must be invalidated immediately
        $this->assertFalse(Cache::has(CatalogCacheService::productKey($product->slug, false)));

        // Subsequent public read repopulates cache with updated price
        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertStatus(200);
        $this->assertEquals(48.00, $res->json('data.wholesalePrice'));
    }

    /**
     * 3. Private Customer Data Isolation — Sensitive Admin Costs Never Cached for Public
     */
    public function test_sensitive_cost_price_never_exposed_or_cached_for_customers(): void
    {
        Cache::flush();

        $product = Product::create([
            'name' => 'Technical Bomber Jacket',
            'slug' => 'technical-bomber-jacket',
            'sku' => 'JKT-BMB-999',
            'wholesale_price' => 65.00,
            'cost_price' => 38.50, // Internal secret buying cost
            'moq' => 20,
            'status' => 'published',
            'design_type' => 'ORIGINAL',
        ]);

        // Public/Customer access
        $customerRes = $this->getJson("/api/v1/products/{$product->slug}");
        $customerRes->assertStatus(200);
        $this->assertNull($customerRes->json('data.costPrice'));
        $this->assertNull($customerRes->json('data.cost_price'));

        // Admin access shows cost price live
        $adminRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/products/{$product->slug}");
        $adminRes->assertStatus(200);
        $this->assertEquals(38.50, $adminRes->json('data.costPrice'));

        // Inspect cache payload directly — must NOT contain costPrice
        $cached = Cache::get(CatalogCacheService::productKey($product->slug, false));
        $this->assertNotNull($cached);
        $this->assertNull($cached['costPrice'] ?? null);
    }

    /**
     * 4. Activity / Audit Logging on Admin Actions
     */
    public function test_admin_mutations_create_activity_audit_logs(): void
    {
        $category = Category::create([
            'name' => 'Outerwear Test',
            'slug' => 'outerwear-test',
            'is_active' => true,
        ]);

        $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/categories/{$category->id}", [
            'name' => 'Outerwear Premium',
        ])->assertStatus(200);

        // Verify Activity record was created
        $this->assertDatabaseHas('activities', [
            'user_id' => $this->admin->id,
            'action' => 'category.updated',
            'subject_type' => Category::class,
            'subject_id' => (string) $category->id,
        ]);

        // Verify Admin can retrieve activities
        $res = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/activities');
        $res->assertStatus(200);
        $this->assertTrue(collect($res->json('data'))->contains('action', 'category.updated'));

        // Customer cannot access audit logs (403 Forbidden)
        $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/admin/activities')
            ->assertStatus(403);
    }

    /**
     * 5. Scheduler Task — Quotation Expiration
     */
    public function test_scheduler_expires_past_due_quotations(): void
    {
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-EXP-001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Nordic Wear AS',
            'status' => 'SUBMITTED',
        ]);

        $quote = Quotation::create([
            'quotation_number' => 'QUO-EXP-001',
            'rfq_id' => $rfq->id,
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Nordic Wear AS',
            'status' => 'READY',
            'valid_until' => Carbon::now()->subDays(2), // Already expired
            'grand_total' => 1500.00,
        ]);

        // Run scheduler command
        $exitCode = Artisan::call('quotes:expire');
        $this->assertEquals(0, $exitCode);

        // Verify status changed to EXPIRED
        $this->assertEquals('EXPIRED', $quote->fresh()->status);

        // Verify audit activity recorded
        $this->assertDatabaseHas('activities', [
            'action' => 'quotation.expired_by_scheduler',
            'subject_id' => (string) $quote->id,
        ]);
    }

    /**
     * 6. Queued Document Generation Job Dispatch
     */
    public function test_async_document_generation_job_dispatch(): void
    {
        Queue::fake();

        $rfq = Quote::create([
            'rfq_number' => 'RFQ-DOC-001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Nordic Wear AS',
            'status' => 'SUBMITTED',
        ]);

        $quote = Quotation::create([
            'quotation_number' => 'QUO-DOC-001',
            'rfq_id' => $rfq->id,
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Nordic Wear AS',
            'status' => 'READY',
            'grand_total' => 3000.00,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/quotations/{$quote->id}/generate-document-async", [
            'document_type' => 'proforma-invoice',
        ]);

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'queued',
                ],
            ]);

        Queue::assertPushed(GenerateCommercialDocumentJob::class, function ($job) use ($quote) {
            return $job->quotationId === $quote->id && $job->documentType === 'proforma-invoice';
        });
    }

    /**
     * 7. Notifications Implement ShouldQueue
     */
    public function test_notifications_implement_should_queue_interface(): void
    {
        $rfq = Quote::create([
            'rfq_number' => 'RFQ-NOTIF-001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Nordic Wear AS',
            'status' => 'SUBMITTED',
        ]);

        $rfqNotification = new RfqCreatedNotification($rfq);
        $this->assertInstanceOf(ShouldQueue::class, $rfqNotification);
    }

    /**
     * 8. Rate Limiting Returns 429
     */
    public function test_rate_limiting_enforcement_returns_429(): void
    {
        // auth-register is limited to 5 attempts per minute
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/register', []);
        }

        $res = $this->postJson('/api/v1/auth/register', []);
        $res->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * 9. Centralized Exception Handling Returns Consistent Structured JSON
     */
    public function test_centralized_exception_handler_returns_consistent_json(): void
    {
        // 401 Unauthenticated
        $res401 = $this->getJson('/api/v1/orders');
        $res401->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated',
            ]);

        // 404 Route Not Found
        $res404 = $this->getJson('/api/v1/non-existent-route-endpoint');
        $res404->assertStatus(404)
            ->assertJson([
                'success' => false,
            ]);
        $this->assertNotEmpty($res404->json('message'));

        // 422 Validation Error
        $res422 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', []);
        $res422->assertStatus(422)
            ->assertJsonStructure([
                'success',
                'message',
                'errors',
            ]);

        // 403 Forbidden
        $res403 = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/products', []);
        $res403->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * 10. Database Performance Indexes Exist
     */
    public function test_database_performance_indexes_exist(): void
    {
        // quotes table indexes
        $quotesIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('quotes'))->pluck('name')->toArray();
        $this->assertContains('quotes_user_id_created_at_idx', $quotesIndexes);
        $this->assertContains('quotes_user_id_idx', $quotesIndexes);

        // order_items table indexes
        $orderItemsIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('order_items'))->pluck('name')->toArray();
        $this->assertContains('order_items_product_id_idx', $orderItemsIndexes);

        // quotations table indexes
        $quotationsIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('quotations'))->pluck('name')->toArray();
        $this->assertContains('quotations_status_valid_until_idx', $quotationsIndexes);
        $this->assertContains('quotations_quote_id_idx', $quotationsIndexes);

        // category_product table indexes
        $categoryProductIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('category_product'))->pluck('name')->toArray();
        $this->assertContains('category_product_category_id_idx', $categoryProductIndexes);
    }
}


