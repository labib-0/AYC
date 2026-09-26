<?php

namespace Tests\Feature\B2b;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class B2bAndCurrencyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $b2bBuyer;
    private User $retailCustomer;
    private Product $sampleProduct;
    private ProductVariant $sampleVariant;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Users
        $this->admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->b2bBuyer = User::factory()->create([
            'name' => 'B2B Wholesale Buyer',
            'email' => 'buyer@corporate.test',
            'role' => 'customer',
            'company_name' => 'Apex Global Apparel Ltd',
            'tax_id' => 'US-EIN-992384',
            'b2b_approval_status' => 'approved',
            'b2b_payment_terms' => 'net_30',
        ]);

        $this->retailCustomer = User::factory()->create([
            'name' => 'Retail Customer',
            'email' => 'customer@retail.test',
            'role' => 'customer',
        ]);

        // 2. Setup Catalog with Wholesale vs MSRP pricing and MOQ = 50
        $brand = Brand::create(['name' => 'Ayaan Core', 'slug' => 'ayaan-core']);
        $category = Category::create(['name' => 'Tops', 'slug' => 'tops']);

        $this->sampleProduct = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Premium Heavyweight Crewneck',
            'slug' => 'premium-heavyweight-crewneck',
            'sku' => 'AYN-TOP-001',
            'wholesale_price' => 14.50,
            'msrp_price' => 38.00,
            'cost_price' => 8.20,
            'moq' => 50,
            'status' => 'published',
        ]);
        $this->sampleProduct->categories()->attach($category->id);

        $this->sampleVariant = ProductVariant::create([
            'product_id' => $this->sampleProduct->id,
            'sku' => 'AYN-TOP-001-BLK-L',
            'title' => 'Size: L / Color: Black',
            'size' => 'L',
            'color' => 'Black',
            'stock' => 500,
        ]);
    }

    public function test_retail_user_sees_msrp_price_while_b2b_user_sees_wholesale_price(): void
    {
        // 1. Guest/Retail customer request
        $retailResponse = $this->getJson("/api/v1/products/{$this->sampleProduct->id}");
        $retailResponse->assertOk()
            ->assertJsonPath('data.price', 38)
            ->assertJsonPath('data.wholesalePrice', 14.5)
            ->assertJsonPath('data.msrpPrice', 38)
            ->assertJsonPath('data.isB2bTier', false);

        // 2. Authenticated B2B buyer request
        $b2bResponse = $this->actingAs($this->b2bBuyer, 'sanctum')
            ->getJson("/api/v1/products/{$this->sampleProduct->id}");
        $b2bResponse->assertOk()
            ->assertJsonPath('data.price', 14.5)
            ->assertJsonPath('data.wholesalePrice', 14.5)
            ->assertJsonPath('data.isB2bTier', true);
    }

    public function test_moq_is_strictly_enforced_for_b2b_cart_additions(): void
    {
        // 1. B2B buyer attempts adding quantity 10 (less than MOQ = 50) -> Rejected
        $failResponse = $this->actingAs($this->b2bBuyer, 'sanctum')
            ->postJson('/api/v1/cart', [
                'product_id' => $this->sampleProduct->id,
                'variant_id' => $this->sampleVariant->id,
                'size' => 'L',
                'quantity' => 10,
            ]);

        $failResponse->assertStatus(422)
            ->assertJsonPath('message', "Minimum order quantity (MOQ) for '{$this->sampleProduct->name}' is 50 units.");

        // 2. B2B buyer attempts adding quantity 60 (not a multiple of MOQ 50) -> Rejected
        $invalidMultResponse = $this->actingAs($this->b2bBuyer, 'sanctum')
            ->postJson('/api/v1/cart', [
                'product_id' => $this->sampleProduct->id,
                'variant_id' => $this->sampleVariant->id,
                'size' => 'L',
                'quantity' => 60,
            ]);

        $invalidMultResponse->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_MOQ_MULTIPLE');

        // 3. B2B buyer adds valid multiple quantity 100 (2 * MOQ) -> Succeeded
        $successResponse = $this->actingAs($this->b2bBuyer, 'sanctum')
            ->postJson('/api/v1/cart', [
                'product_id' => $this->sampleProduct->id,
                'variant_id' => $this->sampleVariant->id,
                'size' => 'L',
                'quantity' => 100,
            ]);

        $successResponse->assertOk()
            ->assertJsonPath('data.items.0.quantity', 100)
            ->assertJsonPath('data.items.0.unit_price', 14.5); // Wholesale price applied
    }

    public function test_unauthorized_retail_user_cannot_use_net_30_payment_terms(): void
    {
        $payload = [
            'shipping_name' => 'John Customer',
            'email' => 'customer@retail.test',
            'shipping_phone' => '+1 555-0199',
            'shipping_address1' => '123 Retail Ave',
            'shipping_city' => 'New York',
            'shipping_region' => 'NY',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
            'payment_method' => 'net_30',
            'items' => [
                [
                    'product_id' => $this->sampleProduct->id,
                    'variant_id' => $this->sampleVariant->id,
                    'size' => 'L',
                    'quantity' => 50,
                ],
            ],
        ];

        // Retail customer attempt -> 403 Forbidden
        $response = $this->actingAs($this->retailCustomer, 'sanctum')
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Commercial payment terms (Net 30 / Net 60) are restricted to approved B2B wholesale accounts.');
    }

    public function test_approved_b2b_user_can_place_order_with_net_30_terms_and_usd_currency(): void
    {
        $payload = [
            'shipping_name' => 'Apex Receiving Dept',
            'email' => 'buyer@corporate.test',
            'shipping_phone' => '+1 555-0299',
            'shipping_address1' => '700 Industrial Pkwy',
            'shipping_city' => 'Chicago',
            'shipping_region' => 'IL',
            'shipping_postal_code' => '60601',
            'shipping_country_code' => 'US',
            'payment_method' => 'net_30',
            'items' => [
                [
                    'product_id' => $this->sampleProduct->id,
                    'variant_id' => $this->sampleVariant->id,
                    'size' => 'L',
                    'quantity' => 100, // 100 * $14.50 = $1,450.00
                ],
            ],
        ];

        $response = $this->actingAs($this->b2bBuyer, 'sanctum')
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.payment_method', 'net_30')
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.subtotal', 1450); // 100 * 14.50 wholesale price


        $orderId = $response->json('data.id');
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'currency' => 'USD',
            'payment_method' => 'net_30',
            'status' => 'processing',
        ]);

        $this->assertDatabaseHas('order_status_events', [
            'order_id' => $orderId,
            'event_type' => 'payment_terms_approved',
        ]);
    }

    public function test_admin_can_manage_b2b_verification_status_and_terms(): void
    {
        // 1. Admin inspects customer
        $showResponse = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$this->b2bBuyer->id}");

        $showResponse->assertOk()
            ->assertJsonPath('data.tax_id', 'US-EIN-992384')
            ->assertJsonPath('data.company_name', 'Apex Global Apparel Ltd');

        // 2. Admin updates customer profile information
        $updateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/customers/{$this->b2bBuyer->id}", [
                'name' => 'Updated Buyer Name',
                'company_name' => 'Apex Global Apparel International',
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.name', 'Updated Buyer Name')
            ->assertJsonPath('data.company_name', 'Apex Global Apparel International');

        $this->assertDatabaseHas('users', [
            'id' => $this->b2bBuyer->id,
            'company_name' => 'Apex Global Apparel International',
        ]);
    }
}
