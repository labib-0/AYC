<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerManagementTest extends TestCase
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
            'name' => 'System Admin',
            'email' => 'admin@ayaan.local',
            'role' => User::ROLE_ADMIN,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'John Wholesale Buyer',
            'email' => 'john.buyer@example.com',
            'phone' => '+1 555-4433',
            'company_name' => 'Empire Imports LLC',
            'tax_id' => 'US-EIN-12345678',
            'role' => User::ROLE_CUSTOMER,
        ]);

        $brand = Brand::create(['name' => 'Ayaan Core', 'slug' => 'ayaan-core']);
        $category = Category::create(['name' => 'Apparel', 'slug' => 'apparel']);

        $this->product = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Heavyweight Pique Polo',
            'slug' => 'heavyweight-pique-polo',
            'sku' => 'AYN-POLO-001',
            'wholesale_price' => 15.00,
            'msrp_price' => 35.00,
            'status' => 'published',
        ]);
        $this->product->categories()->attach($category->id);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'sku' => 'AYN-POLO-001-NVY-M',
            'title' => 'Navy / M',
            'size' => 'M',
            'color' => 'Navy',
            'stock' => 300,
        ]);
    }

    public function test_admin_can_list_customers_strictly_excluding_admins_and_obsolete_b2b_fields(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers');

        $response->assertStatus(200);
        $data = $response->json('data.data');

        $this->assertCount(1, $data);
        $first = $data[0];

        $this->assertEquals('John Wholesale Buyer', $first['name']);
        $this->assertEquals('john.buyer@example.com', $first['email']);
        $this->assertEquals('customer', $first['role']);
        $this->assertEquals('Empire Imports LLC', $first['company_name']);

        // Obsolete B2B fields must NOT be exposed in customer list
        $this->assertArrayNotHasKey('b2b_approval_status', $first);
        $this->assertArrayNotHasKey('b2b_payment_terms', $first);
        $this->assertArrayNotHasKey('b2b_credit_limit', $first);
    }

    public function test_admin_can_search_customers_by_name_email_phone_company(): void
    {
        User::factory()->create([
            'name' => 'Alice Smith',
            'email' => 'alice@company.com',
            'phone' => '+44 7700 900077',
            'company_name' => 'British Textile Ltd',
            'role' => User::ROLE_CUSTOMER,
        ]);

        // Search by company
        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers?search=Empire');
        $res->assertStatus(200);
        $this->assertCount(1, $res->json('data.data'));
        $this->assertEquals('Empire Imports LLC', $res->json('data.data.0.company_name'));

        // Search by phone
        $resPhone = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers?search=7700');
        $resPhone->assertStatus(200);
        $this->assertCount(1, $resPhone->json('data.data'));
        $this->assertEquals('Alice Smith', $resPhone->json('data.data.0.name'));
    }

    public function test_admin_can_view_customer_detail_with_orders_spending_and_purchased_products(): void
    {
        // Create an order for this customer
        $order = Order::create([
            'order_number' => 'ORD-TEST-9901',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'total_amount' => 1500.00,
            'subtotal' => 1500.00,
            'status' => 'processing',
            'payment_status' => 'paid',
            'payment_method' => 'wire_transfer',
            'currency' => 'USD',
            'shipping_name' => 'John Wholesale Buyer',
            'shipping_company' => 'Empire Imports LLC',
            'shipping_address1' => '100 Broadway',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'sku' => $this->variant->sku,
            'quantity' => 100,
            'unit_price' => 15.00,
            'line_total' => 1500.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$this->customer->id}");

        $response->assertStatus(200);
        $detail = $response->json('data');

        $this->assertEquals($this->customer->id, $detail['id']);
        $this->assertEquals('customer', $detail['role']);
        $this->assertEquals('US-EIN-12345678', $detail['tax_id']);
        $this->assertEquals(1, $detail['orders_count']);
        $this->assertEquals(1500.00, $detail['total_spent']);

        // Check recent orders
        $this->assertCount(1, $detail['recent_orders']);
        $this->assertEquals('ORD-TEST-9901', $detail['recent_orders'][0]['order_number']);

        // Check purchased products breakdown
        $this->assertArrayHasKey('purchased_products', $detail);
        $this->assertCount(1, $detail['purchased_products']);
        $purchased = $detail['purchased_products'][0];
        $this->assertEquals('Heavyweight Pique Polo', $purchased['product_name']);
        $this->assertEquals('AYN-POLO-001-NVY-M', $purchased['sku']);
        $this->assertEquals(100, $purchased['quantity']);
        $this->assertEquals(15.00, $purchased['unit_price']);
        $this->assertEquals(1500.00, $purchased['line_total']);
        $this->assertEquals('ORD-TEST-9901', $purchased['order_number']);
    }

    public function test_customer_role_is_strictly_read_only_and_cannot_be_mutated(): void
    {
        // 1. Attempting to change role to admin must fail validation with 422
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/customers/{$this->customer->id}", [
                'name' => 'John Buyer Renamed',
                'role' => 'admin', // Attempted role elevation
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        // 2. Updating legitimate identity attributes succeeds
        $validUpdate = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/customers/{$this->customer->id}", [
                'name' => 'John Buyer Renamed',
                'company_name' => 'Empire Global Sourcing Corp',
            ]);

        $validUpdate->assertStatus(200);
        $data = $validUpdate->json('data');

        $this->assertEquals('John Buyer Renamed', $data['name']);
        $this->assertEquals('Empire Global Sourcing Corp', $data['company_name']);
        $this->assertEquals('customer', $data['role']);

        $this->assertDatabaseHas('users', [
            'id' => $this->customer->id,
            'name' => 'John Buyer Renamed',
            'role' => 'customer',
        ]);
    }

    public function test_admin_can_soft_delete_customer_while_preserving_orders(): void
    {
        // Create an order for this customer
        $order = Order::create([
            'order_number' => 'ORD-PRESERVE-01',
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'total_amount' => 500.00,
            'status' => 'completed',
            'payment_status' => 'paid',
            'currency' => 'USD',
            'shipping_name' => 'John Buyer',
            'shipping_address1' => '100 Broadway',
            'shipping_city' => 'New York',
            'shipping_postal_code' => '10001',
            'shipping_country_code' => 'US',
        ]);

        $deleteResponse = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/customers/{$this->customer->id}");

        $deleteResponse->assertStatus(200);

        // Verify soft-deleted
        $this->assertSoftDeleted('users', [
            'id' => $this->customer->id,
        ]);

        // Verify order remains intact
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_number' => 'ORD-PRESERVE-01',
            'user_id' => $this->customer->id,
        ]);
    }

    public function test_customer_cannot_access_customer_management_endpoints(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/customers');

        $response->assertStatus(403);
    }
}
