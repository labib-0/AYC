<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Product $product;
    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Store Admin',
            'email' => 'admin@ayaan.local',
            'role' => User::ROLE_ADMIN,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Wholesale Customer',
            'email' => 'buyer@ayaan.local',
            'role' => User::ROLE_CUSTOMER,
        ]);

        $brand = Brand::create(['name' => 'Ayaan Core', 'slug' => 'ayaan-core']);
        $category = Category::create(['name' => 'Tops', 'slug' => 'tops']);

        $this->product = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Heavyweight Pique Polo',
            'slug' => 'heavyweight-pique-polo',
            'sku' => 'AYN-POLO-001',
            'wholesale_price' => 20.00,
            'msrp_price' => 45.00,
            'status' => 'published',
        ]);
        $this->product->categories()->attach($category->id);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'AYN-POLO-001-BLK-L',
            'title' => 'Black / L',
            'size' => 'L',
            'color' => 'Black',
            'stock' => 500,
        ]);
    }

    public function test_admin_can_crud_coupons(): void
    {
        // 1. Create Coupon
        $createRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'WHOLESALE15',
                'discount_type' => 'percentage',
                'discount_value' => 15.00,
                'min_spend' => 300.00,
                'max_discount' => 150.00,
                'usage_limit' => 100,
                'is_active' => true,
            ]);

        $createRes->assertStatus(201);
        $couponId = $createRes->json('data.id');
        $this->assertDatabaseHas('coupons', ['id' => $couponId, 'code' => 'WHOLESALE15']);

        // 2. Read Coupon
        $showRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/coupons/{$couponId}");
        $showRes->assertStatus(200)
            ->assertJsonPath('data.code', 'WHOLESALE15')
            ->assertJsonPath('data.discount_value', '15.00');

        // 3. Update Coupon
        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/coupons/{$couponId}", [
                'discount_value' => 18.00,
                'is_active' => false,
            ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.discount_value', '18.00')
            ->assertJsonPath('data.is_active', false);

        // 4. Delete Coupon
        $deleteRes = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/coupons/{$couponId}");
        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('coupons', ['id' => $couponId]);
    }

    public function test_coupon_validation_rules_and_calculations(): void
    {
        $activeCoupon = Coupon::create([
            'code' => 'SAVE10',
            'discount_type' => 'percentage',
            'discount_value' => 10.00,
            'min_spend' => 100.00,
            'is_active' => true,
        ]);

        $inactiveCoupon = Coupon::create([
            'code' => 'INACTIVE20',
            'discount_type' => 'percentage',
            'discount_value' => 20.00,
            'is_active' => false,
        ]);

        $expiredCoupon = Coupon::create([
            'code' => 'EXPIRED30',
            'discount_type' => 'percentage',
            'discount_value' => 30.00,
            'expires_at' => Carbon::now()->subDay(),
            'is_active' => true,
        ]);

        $limitReachedCoupon = Coupon::create([
            'code' => 'LIMITREACHED',
            'discount_type' => 'percentage',
            'discount_value' => 15.00,
            'usage_limit' => 5,
            'usage_count' => 5,
            'is_active' => true,
        ]);

        // 1. Valid active coupon on $500 subtotal -> 10% = $50
        $resValid = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'save10',
            'subtotal' => 500.00,
        ]);
        $resValid->assertStatus(200)
            ->assertJsonPath('data.isValid', true);
        $this->assertEquals(50.0, (float) $resValid->json('data.discountAmount'));

        // 2. Reject inactive coupon
        $resInactive = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'INACTIVE20',
            'subtotal' => 500.00,
        ]);
        $resInactive->assertStatus(422)
            ->assertJsonPath('message', 'This promo code is currently inactive.');

        // 3. Reject expired coupon
        $resExpired = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'EXPIRED30',
            'subtotal' => 500.00,
        ]);
        $resExpired->assertStatus(422)
            ->assertJsonPath('message', 'Promo code has expired.');

        // 4. Reject coupon exceeding usage limit
        $resLimit = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'LIMITREACHED',
            'subtotal' => 500.00,
        ]);
        $resLimit->assertStatus(422)
            ->assertJsonPath('message', 'This promo code has reached its usage limit.');

        // 5. Reject below minimum spend
        $resMin = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'SAVE10',
            'subtotal' => 50.00,
        ]);
        $resMin->assertStatus(422);

        // 6. Fixed amount coupon calculation ($50 off $200 order)
        $flatCoupon = Coupon::create([
            'code' => 'FLAT50',
            'discount_type' => 'fixed_amount',
            'discount_value' => 50.00,
            'min_spend' => 100.00,
            'is_active' => true,
        ]);

        $resFlat = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'FLAT50',
            'subtotal' => 200.00,
        ]);
        $resFlat->assertStatus(200);
        $this->assertEquals(50.0, (float) $resFlat->json('data.discountAmount'));
    }

    public function test_coupon_application_during_order_checkout(): void
    {
        $coupon = Coupon::create([
            'code' => 'CHECKOUT10',
            'discount_type' => 'percentage',
            'discount_value' => 10.00,
            'min_spend' => 200.00,
            'usage_count' => 0,
            'is_active' => true,
        ]);

        $payload = [
            'shipping_name' => 'Elena Buyer',
            'email' => 'buyer@ayaan.local',
            'shipping_phone' => '+1 555-9988',
            'shipping_address1' => '123 Market St',
            'shipping_city' => 'Chicago',
            'shipping_region' => 'IL',
            'shipping_postal_code' => '60601',
            'shipping_country_code' => 'US',
            'coupon_code' => 'CHECKOUT10',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'size' => 'L',
                    'quantity' => 25, // 25 * $20.00 = $500.00
                ],
            ],
        ];

        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.subtotal', 500)
            ->assertJsonPath('data.discount_amount', 50); // 10% of 500

        $this->assertDatabaseHas('orders', [
            'discount_amount' => 50.00,
            'subtotal' => 500.00,
        ]);

        // Coupon usage count must be incremented
        $this->assertEquals(1, $coupon->fresh()->usage_count);
    }

    public function test_obsolete_promotions_endpoints_are_completely_inaccessible(): void
    {
        // GET /api/v1/admin/promotions must be 404
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/promotions')
            ->assertStatus(404);

        // POST /api/v1/admin/promotions must be 404
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/promotions', ['title' => 'Test'])
            ->assertStatus(404);

        // POST /api/v1/promotions/validate must be 404
        $this->postJson('/api/v1/promotions/validate', ['code' => 'TEST', 'subtotal' => 100])
            ->assertStatus(404);
    }
}
