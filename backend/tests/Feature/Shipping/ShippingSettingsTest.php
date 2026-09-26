<?php

namespace Tests\Feature\Shipping;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ShippingSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Product $product;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin-test@ayaan.test',
            'password' => bcrypt('Admin@12345'),
            'role' => 'admin',
        ]);

        $this->customer = User::create([
            'name' => 'Customer User',
            'email' => 'customer-test@ayaan.test',
            'password' => bcrypt('Customer@12345'),
            'role' => 'customer',
        ]);

        $this->product = Product::create([
            'name' => 'Test Cotton Tee',
            'slug' => 'test-cotton-tee',
            'sku' => 'TEST-TEE-001',
            'brand' => 'Ayaan',
            'audience' => 'MEN',
            'category_id' => null,
            'wholesale_price' => 15.00,
            'price' => 15.00,
            'bulk_threshold' => 100,
            'bulk_price' => 15.00,
            'moq' => 10,
            'stock' => 500,
            'status' => 'published',
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'title' => 'M / White',
            'size' => 'M',
            'color_name' => 'White',
            'stock' => 500,
            'sku' => 'TEST-TEE-001-M',
        ]);
    }

    public function test_shipping_settings_returns_aramex_disabled_by_default(): void
    {
        $response = $this->getJson('/api/v1/shipping/settings');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_aramex_enabled' => false,
                    'aramex_status' => 'disabled',
                ],
            ]);
    }

    public function test_admin_can_update_aramex_shipping_setting(): void
    {
        $token = $this->admin->createToken('admin-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/v1/admin/settings/shipping', [
                'is_aramex_enabled' => true,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_aramex_enabled' => true,
                    'aramex_status' => 'enabled',
                ],
            ]);

        $this->assertTrue(SystemSetting::isAramexEnabled());

        // Toggle back to disabled
        $toggleBack = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/v1/admin/settings/shipping', [
                'is_aramex_enabled' => false,
            ]);

        $toggleBack->assertStatus(200)
            ->assertJson([
                'data' => [
                    'is_aramex_enabled' => false,
                    'aramex_status' => 'disabled',
                ],
            ]);

        $this->assertFalse(SystemSetting::isAramexEnabled());
    }

    public function test_customer_cannot_update_shipping_settings(): void
    {
        $token = $this->customer->createToken('customer-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/v1/admin/settings/shipping', [
                'is_aramex_enabled' => true,
            ]);

        $response->assertStatus(403);
    }

    public function test_order_creation_rejects_aramex_when_disabled(): void
    {
        $token = $this->customer->createToken('customer-token')->plainTextToken;

        $payload = [
            'email' => $this->customer->email,
            'shipping_method' => 'ARAMEX',
            'payment_method' => 'proforma_invoice',
            'shipping_name' => 'Demo Customer',
            'shipping_phone' => '+971501234567',
            'shipping_address1' => 'Business Bay Tower',
            'shipping_city' => 'Dubai',
            'shipping_country' => 'AE',
            'shipping_postal_code' => '00000',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'quantity' => 20,
                    'unit_price' => 15.00,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['shipping_method']);
    }

    public function test_order_creation_accepts_manual_when_aramex_is_disabled(): void
    {
        $token = $this->customer->createToken('customer-token')->plainTextToken;

        $payload = [
            'email' => $this->customer->email,
            'shipping_method' => 'DISCUSS DIRECTLY',
            'payment_method' => 'proforma_invoice',
            'shipping_name' => 'Demo Customer',
            'shipping_phone' => '+971501234567',
            'shipping_address1' => 'Business Bay Tower',
            'shipping_city' => 'Dubai',
            'shipping_country' => 'AE',
            'shipping_postal_code' => '00000',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'quantity' => 20,
                    'unit_price' => 15.00,
                ],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $this->customer->id,
            'shipping_method' => 'DISCUSS DIRECTLY',
        ]);
    }
}
