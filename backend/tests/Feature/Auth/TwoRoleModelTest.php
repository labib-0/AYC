<?php

namespace Tests\Feature\Auth;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductPricingTier;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TwoRoleModelTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $admin;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'name' => 'Elena Customer',
            'email' => 'customer@ayaan-demo.local',
            'password' => Hash::make('Customer@12345'),
            'role' => 'customer',
            'b2b_approval_status' => 'approved',
            'b2b_payment_terms' => 'net_30',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Ayaan Admin',
            'email' => 'admin@ayaan-demo.local',
            'password' => Hash::make('Admin@12345'),
            'role' => 'admin',
        ]);

        $brand = Brand::create(['name' => 'Ayaan Export', 'slug' => 'ayaan-export', 'logo_url' => '/brands/ayaan.png']);
        $category = Category::create(['name' => 'Tops', 'slug' => 'tops']);

        $this->product = Product::create([
            'name' => 'Premium Combed Cotton Tee',
            'slug' => 'premium-combed-cotton-tee',
            'sku' => 'AYN-TSH-001',
            'brand_id' => $brand->id,
            'wholesale_price' => 12.00,
            'standard_price' => 12.00,
            'bulk_price' => 9.50,
            'full_stock_price' => 7.80,
            'bulk_threshold' => 200,
            'moq' => 50,
            'status' => 'published',
            'is_package_assortment' => true,
        ]);

        $this->product->categories()->attach($category->id);

        ProductPricingTier::create([
            'product_id' => $this->product->id,
            'min_quantity' => 50,
            'max_quantity' => 199,
            'unit_price' => 12.00,
        ]);
        ProductPricingTier::create([
            'product_id' => $this->product->id,
            'min_quantity' => 200,
            'max_quantity' => 999,
            'unit_price' => 9.50,
        ]);
        ProductPricingTier::create([
            'product_id' => $this->product->id,
            'min_quantity' => 1000,
            'max_quantity' => null,
            'unit_price' => 7.80,
        ]);
    }

    // =========================================================================
    // AUTH TESTS (Items 1-6)
    // =========================================================================

    public function test_1_customer_role_accepted_at_login(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@ayaan-demo.local',
            'password' => 'Customer@12345',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'customer@ayaan-demo.local',
                        'role' => 'customer',
                    ],
                ],
            ]);
    }

    public function test_2_admin_role_accepted_at_login(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@ayaan-demo.local',
            'password' => 'Admin@12345',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'admin@ayaan-demo.local',
                        'role' => 'admin',
                    ],
                ],
            ]);
    }

    public function test_3_b2b_buyer_role_rejected_as_active_role(): void
    {
        // Public registration with b2b_buyer must fail validation
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Invalid Role User',
            'email' => 'invalid-role@test.local',
            'password' => 'Secret@12345',
            'role' => 'b2b_buyer',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        // Admin update cannot set b2b_buyer
        $adminUpdateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/customers/{$this->customer->id}", [
                'role' => 'b2b_buyer',
            ]);

        $adminUpdateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_4_customer_can_access_intended_b2b_features(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/products/{$this->product->slug}");

        $response->assertStatus(200);
        $this->assertEquals('customer', $this->customer->role);
        $this->assertTrue($this->customer->isCustomer());
        $this->assertTrue($this->customer->isApprovedB2b());
    }

    public function test_5_customer_cannot_access_admin_features(): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=daily')
            ->assertStatus(403);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(403);
    }

    public function test_6_admin_can_access_admin_features(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(200);
    }

    // =========================================================================
    // CUSTOMER B2B FEATURES (Items 7-12)
    // =========================================================================

    public function test_7_customer_can_access_tier_pricing(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/products/{$this->product->slug}");

        $response->assertStatus(200)
            ->assertJsonPath('data.isB2bTier', true)
            ->assertJsonPath('data.pricing_tiers.0.unit_price', 12)
            ->assertJsonPath('data.pricing_tiers.1.unit_price', 9.5)
            ->assertJsonPath('data.pricing_tiers.2.unit_price', 7.8);
    }

    public function test_8_customer_can_access_package_assortment(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/products/{$this->product->slug}");

        $response->assertStatus(200)
            ->assertJsonPath('data.isB2bTier', true)
            ->assertJsonPath('data.moq', 50);
    }

    public function test_9_customer_can_create_rfq(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/rfq', [
                'buyer_name' => $this->customer->name,
                'buyer_email' => $this->customer->email,
                'company_name' => $this->customer->company_name,
                'shipping_country' => 'United States',
                'target_delivery_date' => now()->addDays(30)->toDateString(),
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'product_name' => $this->product->name,
                        'product_sku' => $this->product->sku,
                        'quantity' => 500,
                        'target_price' => 9.00,
                        'notes' => 'Wholesale inquiry for spring line',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    public function test_10_customer_can_view_quotations(): void
    {
        $quote = Quote::create([
            'rfq_number' => 'RFQ-TEST-2026-001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => $this->customer->company_name ?? 'Demo Corp',
            'status' => 'issued',
            'subtotal' => 4750.00,
            'total_amount' => 5200.00,
            'valid_until' => now()->addDays(14),
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/rfq/{$quote->id}");

        $response->assertStatus(200);
    }

    public function test_11_customer_can_access_customer_documents(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-DOC-2026-01',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'shipping_name' => $this->customer->name,
            'shipping_address1' => '100 Broadway St',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'subtotal' => 1200.00,
            'total_amount' => 1200.00,
            'currency' => 'USD',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$order->id}/documents/proforma-invoice");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_12_customer_can_place_bulk_order(): void
    {
        $variant = $this->product->variants()->create([
            'title' => 'M / Black',
            'sku' => 'AYN-TSH-001-M-BLK',
            'size' => 'M',
            'color' => 'Black',
            'stock' => 1000,
            'price' => 12.00,
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/orders', [
                'email' => $this->customer->email,
                'shipping_name' => 'Elena Customer',
                'shipping_phone' => '+1-555-0199',
                'shipping_address1' => '100 Broadway St',
                'shipping_city' => 'New York',
                'shipping_region' => 'NY',
                'shipping_postal_code' => '10001',
                'shipping_country_code' => 'US',
                'payment_method' => 'card',
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'variant_id' => $variant->id,
                        'size' => 'M',
                        'quantity' => 200,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);
    }

    // =========================================================================
    // ADMIN CAPABILITIES (Items 13-18)
    // =========================================================================

    public function test_13_admin_can_manage_products(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/products', [
                'name' => 'Admin Oxford Shirt',
                'slug' => 'admin-oxford-shirt',
                'sku' => 'ADM-OXF-001',
                'wholesale_price' => 22.00,
            ]);

        $response->assertStatus(201);
    }

    public function test_14_admin_can_manage_orders(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders');

        $response->assertStatus(200);
    }

    public function test_15_admin_can_manage_rfq(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/rfq');

        $response->assertStatus(200);
    }

    public function test_16_admin_can_manage_quotations(): void
    {
        $quote = Quote::create([
            'rfq_number' => 'RFQ-ADM-2026-002',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Admin Quote Co',
            'status' => 'pending',
            'subtotal' => 3000.00,
            'total_amount' => 3200.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/rfq/{$quote->id}/status", [
                'status' => 'issued',
            ]);

        $response->assertStatus(200);
    }

    public function test_17_admin_can_manage_coupons(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/coupons');

        $response->assertStatus(200);

        // Obsolete promotions endpoint is removed (404)
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/promotions')
            ->assertStatus(404);
    }

    public function test_18_admin_can_access_analytics(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=daily');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_19_customer_cannot_access_another_customers_rfq(): void
    {
        $otherCustomer = User::factory()->create([
            'email' => 'other-customer@example.com',
            'role' => 'customer',
        ]);

        $otherQuote = Quote::create([
            'rfq_number' => 'RFQ-OTHER-2026-001',
            'user_id' => $otherCustomer->id,
            'buyer_name' => 'Other Customer',
            'buyer_email' => 'other-customer@example.com',
            'company_name' => 'Other Corp',
            'status' => 'SUBMITTED',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/rfq/{$otherQuote->id}");

        $response->assertStatus(403);
    }

    public function test_20_customer_cannot_update_another_customers_rfq_status(): void
    {
        $otherCustomer = User::factory()->create([
            'email' => 'other-customer2@example.com',
            'role' => 'customer',
        ]);

        $otherQuote = Quote::create([
            'rfq_number' => 'RFQ-OTHER-2026-002',
            'user_id' => $otherCustomer->id,
            'buyer_name' => 'Other Customer 2',
            'buyer_email' => 'other-customer2@example.com',
            'company_name' => 'Other Corp 2',
            'status' => 'SUBMITTED',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->patchJson("/api/v1/rfq/{$otherQuote->id}/status", [
                'status' => 'ACCEPTED',
            ]);

        $response->assertStatus(403);
    }

    public function test_21_customer_rfq_list_only_contains_own_rfqs(): void
    {
        $otherCustomer = User::factory()->create([
            'email' => 'other-customer3@example.com',
            'role' => 'customer',
        ]);

        $myQuote = Quote::create([
            'rfq_number' => 'RFQ-MY-2026-001',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Elena Corp',
            'status' => 'SUBMITTED',
        ]);

        $otherQuote = Quote::create([
            'rfq_number' => 'RFQ-OTHER-2026-003',
            'user_id' => $otherCustomer->id,
            'buyer_name' => 'Other Customer 3',
            'buyer_email' => 'other-customer3@example.com',
            'company_name' => 'Other Corp 3',
            'status' => 'SUBMITTED',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/rfq');

        $response->assertStatus(200);
        $data = $response->json('data');
        $rfqNumbers = collect($data)->pluck('rfq_number')->all();

        $this->assertContains('RFQ-MY-2026-001', $rfqNumbers);
        $this->assertNotContains('RFQ-OTHER-2026-003', $rfqNumbers);
    }

    public function test_22_admin_can_access_any_customers_rfq(): void
    {
        $quote = Quote::create([
            'rfq_number' => 'RFQ-TEST-2026-999',
            'user_id' => $this->customer->id,
            'buyer_name' => $this->customer->name,
            'buyer_email' => $this->customer->email,
            'company_name' => 'Elena Corp',
            'status' => 'SUBMITTED',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/rfq/{$quote->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.rfq_number', 'RFQ-TEST-2026-999');
    }

    public function test_23_customer_cannot_access_another_customers_order_documents(): void
    {
        $otherCustomer = User::factory()->create([
            'email' => 'other-customer4@example.com',
            'role' => 'customer',
        ]);

        $otherOrder = Order::create([
            'order_number' => 'ORD-OTHER-2026-01',
            'user_id' => $otherCustomer->id,
            'email' => $otherCustomer->email,
            'shipping_name' => 'Other Customer 4',
            'shipping_address1' => '200 Main St',
            'shipping_city' => 'Chicago',
            'shipping_postal_code' => '60601',
            'shipping_country_code' => 'US',
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'subtotal' => 500.00,
            'total_amount' => 500.00,
            'currency' => 'USD',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$otherOrder->id}/documents/proforma-invoice");

        $response->assertStatus(403);
    }
}
