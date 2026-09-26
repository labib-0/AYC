<?php

namespace Tests\Feature\Seeder;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Quote;
use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\DevelopmentDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DevelopmentSeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test master DevelopmentDemoSeeder populates all entities correctly
     * and strictly conforms to B2B platform constraints.
     */
    public function test_development_demo_seeder_populates_full_environment(): void
    {
        // 1. Run seeder
        $this->seed(DevelopmentDemoSeeder::class);

        // 2. Exactly TWO roles: admin and customer (zero invalid roles)
        $invalidRoles = User::whereNotIn('role', [User::ROLE_ADMIN, User::ROLE_CUSTOMER])->count();
        $this->assertEquals(0, $invalidRoles, 'Found forbidden user roles in database.');

        $adminCount = User::where('role', User::ROLE_ADMIN)->count();
        $customerCount = User::where('role', User::ROLE_CUSTOMER)->count();
        $this->assertGreaterThanOrEqual(1, $adminCount, 'Admin user should be seeded.');
        $this->assertGreaterThanOrEqual(5, $customerCount, 'At least 5 customer users should be seeded.');

        // 3. Admin & Customer Credentials
        $admin = User::where('email', 'admin@ayaan-demo.local')->first();
        $this->assertNotNull($admin);
        $this->assertEquals(User::ROLE_ADMIN, $admin->role);
        $this->assertTrue($admin->is_demo);

        $customer = User::where('email', 'customer@ayaan-demo.local')->first();
        $this->assertNotNull($customer);
        $this->assertEquals(User::ROLE_CUSTOMER, $customer->role);
        $this->assertTrue($customer->is_demo);

        // 4. Single Warehouse Constraint (Uttara only)
        $warehouses = Warehouse::all();
        $this->assertCount(1, $warehouses, 'Only a single warehouse must exist.');
        $this->assertEquals('WH-UTTARA-01', $warehouses->first()->code);
        $this->assertStringContainsString('Uttara', $warehouses->first()->name);

        // 5. Products Volume & Design Type Constraints
        $products = Product::all();
        $this->assertGreaterThanOrEqual(30, $products->count(), 'At least 30 products should be seeded.');

        foreach ($products as $prod) {
            $this->assertContains(
                $prod->design_type,
                [Product::DESIGN_TYPE_ORIGINAL, Product::DESIGN_TYPE_MASTER_COPY],
                "Product {$prod->sku} has invalid design_type {$prod->design_type}."
            );
            $this->assertNotEquals('REPLICA', $prod->design_type);
            $this->assertNotEquals('MC', $prod->design_type);

            $this->assertContains(
                $prod->audience,
                ['MEN', 'WOMEN', 'BOYS', 'GIRLS', 'UNISEX'],
                "Product {$prod->sku} has invalid audience {$prod->audience}."
            );

            // Verify variants and tiers
            $this->assertGreaterThan(0, $prod->variants()->count());
            $this->assertGreaterThanOrEqual(3, $prod->pricingTiers()->count());
        }

        // 6. Orders & Shipping Method Constraints
        $orders = Order::all();
        $this->assertGreaterThanOrEqual(15, $orders->count(), 'At least 15 orders should be seeded.');

        foreach ($orders as $order) {
            $shippingMethod = $order->shipping_method;
            $this->assertContains(
                $shippingMethod,
                ['ARAMEX', 'DISCUSS DIRECTLY'],
                "Order {$order->order_number} has invalid shipping method: {$shippingMethod}"
            );
            $this->assertNotContains($shippingMethod, ['Air Express', 'Ocean Cargo', 'Overland Truck']);

            // Verify buying_price_at_sale is preserved on items
            foreach ($order->items as $item) {
                $this->assertNotNull($item->buying_price_at_sale);
                $this->assertGreaterThan(0, (float) $item->buying_price_at_sale);
            }
        }

        // 7. RFQs & Messages
        $rfqs = Quote::all();
        $this->assertGreaterThanOrEqual(8, $rfqs->count(), 'At least 8 RFQs should be seeded.');
        $totalMessages = \DB::table('rfq_messages')->count();
        $this->assertGreaterThan(0, $totalMessages, 'RFQs must have persistent message threads.');

        // 8. Quotations & Pubali Bank Details
        $quotations = Quotation::all();
        $this->assertGreaterThanOrEqual(5, $quotations->count(), 'At least 5 quotations should be seeded.');
        $sentQuotation = Quotation::whereNotNull('admin_notes')->first();
        $this->assertNotNull($sentQuotation);
        $this->assertStringContainsString('Pubali Bank', $sentQuotation->admin_notes);
        $this->assertStringContainsString('1788-901-044316', $sentQuotation->admin_notes);
    }

    /**
     * Test demo:clear removes only demo data and respects production safety.
     */
    public function test_demo_clear_purges_only_demo_records_and_protects_production(): void
    {
        // 1. Seed demo data
        $this->seed(DevelopmentDemoSeeder::class);

        // 2. Create a non-demo customer user and order
        $realUser = User::create([
            'name' => 'Real Production Buyer',
            'email' => 'real.buyer@acme-corp.com',
            'password' => bcrypt('SecurePass@999'),
            'role' => User::ROLE_CUSTOMER,
            'is_demo' => false,
        ]);

        $realOrder = Order::create([
            'order_number' => 'ORD-REAL-2026-9999',
            'user_id' => $realUser->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'fulfillment_status' => 'pending',
            'currency' => 'USD',
            'subtotal' => 1200.00,
            'total_amount' => 1200.00,
            'email' => $realUser->email,
            'shipping_name' => $realUser->name,
            'shipping_phone' => '+1 (555) 123-4567',
            'shipping_address1' => '100 Main St',
            'shipping_city' => 'New York',
            'shipping_country_code' => 'US',
            'shipping_postal_code' => '10001',
            'shipping_method' => 'ARAMEX',
            'is_demo' => false,
        ]);

        // 3. Run demo:clear command
        Artisan::call('demo:clear', ['--force' => true]);

        // 4. Verify demo data was purged
        $this->assertEquals(0, User::where('is_demo', true)->count());
        $this->assertEquals(0, Order::where('is_demo', true)->count());
        $this->assertEquals(0, Product::where('is_demo', true)->count());
        $this->assertEquals(0, Quote::where('is_demo', true)->count());
        $this->assertEquals(0, Quotation::where('is_demo', true)->count());

        // 5. Verify non-demo real user and real order remain completely untouched
        $this->assertDatabaseHas('users', ['id' => $realUser->id, 'email' => 'real.buyer@acme-corp.com']);
        $this->assertDatabaseHas('orders', ['id' => $realOrder->id, 'order_number' => 'ORD-REAL-2026-9999']);
    }

    /**
     * Test authentication works for seeded admin and customer accounts via API.
     */
    public function test_api_authentication_with_seeded_credentials(): void
    {
        $this->seed(DevelopmentDemoSeeder::class);

        // 1. Admin login
        $adminRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@ayaan-demo.local',
            'password' => 'Admin@12345',
        ]);
        $adminRes->assertOk();
        $adminRes->assertJsonStructure(['data' => ['user', 'token']]);
        $this->assertEquals('admin', $adminRes->json('data.user.role'));

        // 2. Customer login
        $custRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@ayaan-demo.local',
            'password' => 'Customer@12345',
        ]);
        $custRes->assertOk();
        $custRes->assertJsonStructure(['data' => ['user', 'token']]);
        $this->assertEquals('customer', $custRes->json('data.user.role'));
    }

    /**
     * Test sales and profit analytics endpoint produces non-zero analytics with seeded data.
     */
    public function test_analytics_produces_non_zero_historical_metrics(): void
    {
        $this->seed(DevelopmentDemoSeeder::class);

        $admin = User::where('email', 'admin@ayaan-demo.local')->first();
        $token = $admin->createToken('admin-test')->plainTextToken;

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/v1/admin/analytics/sales-profit?period=daily');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertNotNull($data);
        $this->assertArrayHasKey('summary', $data);
        $this->assertGreaterThan(0, $data['summary']['total_sales']);
        $this->assertGreaterThan(0, $data['summary']['gross_profit']);
        $this->assertGreaterThan(0, $data['summary']['units_sold']);
    }
}
