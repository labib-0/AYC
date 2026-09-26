<?php

namespace Tests\Feature\Order;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WholesalePricingAndOrderManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected User $admin;
    protected Brand $brand;
    protected Category $category;
    protected Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create([
            'email' => 'customer@ayaan-demo.local',
            'role' => 'customer',
            'b2b_approval_status' => 'approved',
            'company_name' => 'First Retail LLC',
        ]);

        $this->otherCustomer = User::factory()->create([
            'email' => 'other-customer@ayaan-demo.local',
            'role' => 'customer',
            'company_name' => 'Second Retail Inc',
        ]);

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaan-demo.local',
            'role' => 'admin',
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Signature',
            'slug' => 'ayaan-signature',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Shirts',
            'slug' => 'shirts',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'code' => 'WH-TEST-01',
            'name' => 'Main Logistics Hub',
            'is_active' => true,
        ]);
    }

    /**
     * SECTION 31: Wholesale Pricing Tests
     */
    public function test_wholesale_pricing_tiers_and_bulk_thresholds_resolution(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Tiered Wholesale Shirt',
            'slug' => 'tiered-wholesale-shirt',
            'sku' => 'TWS-01',
            'wholesale_price' => 50.00, // Standard price for quantity < bulk_threshold
            'bulk_threshold' => 50,
            'bulk_price' => 40.00, // Bulk price for quantity >= 50
            'full_stock_price' => 35.00, // Full stock price
            'cost_price' => 20.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'TWS-01-M',
            'title' => 'Medium',
            'size' => 'M',
            'color' => 'White',
            'stock' => 100,
        ]);

        // 1. Below bulk threshold (MOQ: 10) -> uses wholesale_price ($50.00)
        $this->assertEquals(50.00, $product->getUnitPriceForQuantity(10));
        $this->assertEquals(50.00, $product->getUnitPriceForQuantity(49));

        // 2. At or above bulk threshold (50) -> uses bulk_price ($40.00)
        $this->assertEquals(40.00, $product->getUnitPriceForQuantity(50));
        $this->assertEquals(40.00, $product->getUnitPriceForQuantity(80));

        // 3. Exactly full stock (100) -> uses full_stock_price ($35.00)
        $this->assertEquals(35.00, $product->getUnitPriceForQuantity(100));
    }

    /**
     * SECTION 31 & 5: MOQ Tests
     */
    public function test_moq_enforcement_rejects_quantities_below_minimum(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'High MOQ Jacket',
            'slug' => 'high-moq-jacket',
            'sku' => 'HMJ-01',
            'wholesale_price' => 100.00,
            'moq' => 25,
            'status' => 'published',
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'HMJ-01-L',
            'title' => 'Size L',
            'size' => 'L',
            'stock' => 200,
        ]);

        // Attempting to add 10 to cart (below MOQ of 25) must fail
        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'L',
            'quantity' => 10,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        // Exactly MOQ of 25 succeeds
        $validResponse = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'L',
            'quantity' => 25,
        ]);

        $validResponse->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    /**
     * SECTION 32: Cart Operations and Ownership Isolation
     */
    public function test_cart_operations_and_customer_ownership_isolation(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Cart Test Tee',
            'slug' => 'cart-test-tee',
            'sku' => 'CTT-01',
            'wholesale_price' => 25.00,
            'moq' => 5,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'CTT-01-S',
            'title' => 'Size S',
            'size' => 'S',
            'stock' => 50,
        ]);

        // Customer A adds item to cart
        $addRes = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'size' => 'S',
            'quantity' => 5,
        ]);
        $addRes->assertStatus(200);

        // Customer A retrieves cart
        $cartA = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/cart');
        $cartA->assertStatus(200)
            ->assertJsonPath('data.total_items', 5);
        $this->assertEquals(125.00, (float) $cartA->json('data.subtotal'));

        // Customer B retrieves their own cart -> must be empty (isolation)
        $cartB = $this->actingAs($this->otherCustomer, 'sanctum')->getJson('/api/v1/cart');
        $cartB->assertStatus(200)
            ->assertJsonPath('data.total_items', 0);

        // Customer A updates quantity
        $itemId = $cartA->json('data.items.0.id');
        $updateRes = $this->actingAs($this->customer, 'sanctum')->putJson("/api/v1/cart/{$itemId}", [
            'quantity' => 10,
        ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.total_items', 10);

        // Customer A removes item
        $deleteRes = $this->actingAs($this->customer, 'sanctum')->deleteJson("/api/v1/cart/{$itemId}");
        $deleteRes->assertStatus(200)
            ->assertJsonPath('data.total_items', 0);
    }

    /**
     * SECTION 33: Wishlist Tests
     */
    public function test_wishlist_uniqueness_and_ownership(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Wishlist Item',
            'slug' => 'wishlist-item',
            'sku' => 'WLI-01',
            'wholesale_price' => 30.00,
            'status' => 'published',
        ]);

        // Customer A adds to wishlist
        $res1 = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/wishlist', [
            'product_id' => $product->id,
        ]);
        $res1->assertStatus(201);

        // Customer A adds the same product again -> idempotent (duplicate prevention)
        $res2 = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/wishlist', [
            'product_id' => $product->id,
        ]);
        $res2->assertStatus(201);
        $this->assertCount(1, $this->customer->wishlist->items);

        // Customer B cannot see Customer A's wishlist items
        $otherWishlist = $this->actingAs($this->otherCustomer, 'sanctum')->getJson('/api/v1/wishlist');
        $otherWishlist->assertStatus(200)
            ->assertJsonPath('data.items', []);

        // Customer A removes item
        $delRes = $this->actingAs($this->customer, 'sanctum')->deleteJson("/api/v1/wishlist/{$product->id}");
        $delRes->assertStatus(200);
        $this->assertCount(0, $this->customer->fresh()->wishlist->items);
    }

    /**
     * SECTION 34: Promotion & Coupon Tests
     */
    public function test_coupon_validation_and_discount_safety(): void
    {
        Coupon::create([
            'code' => 'WHOLESALE10',
            'discount_type' => 'percentage',
            'discount_value' => 10.00,
            'min_spend' => 100.00,
            'max_discount' => 50.00,
            'is_active' => true,
        ]);

        Coupon::create([
            'code' => 'FLAT50',
            'discount_type' => 'fixed',
            'discount_value' => 50.00,
            'min_spend' => 200.00,
            'is_active' => true,
        ]);

        Coupon::create([
            'code' => 'EXPIRED20',
            'discount_type' => 'percentage',
            'discount_value' => 20.00,
            'expires_at' => now()->subDay(),
            'is_active' => true,
        ]);

        // 1. Valid percentage coupon with min spend met
        $res1 = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'WHOLESALE10',
            'subtotal' => 200.00,
        ]);
        $res1->assertStatus(200)
            ->assertJsonPath('data.isValid', true);
        $this->assertEquals(20.00, (float) $res1->json('data.discountAmount'));

        // 2. Percentage coupon hits max discount cap ($50)
        $resCap = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'WHOLESALE10',
            'subtotal' => 1000.00,
        ]);
        $resCap->assertStatus(200);
        $this->assertEquals(50.00, (float) $resCap->json('data.discountAmount'));

        // 3. Min spend not met
        $resMin = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'WHOLESALE10',
            'subtotal' => 50.00,
        ]);
        $resMin->assertStatus(422);

        // 4. Expired coupon
        $resExp = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'EXPIRED20',
            'subtotal' => 500.00,
        ]);
        $resExp->assertStatus(422);

        // 5. Fixed coupon validation
        $resFixed = $this->postJson('/api/v1/coupons/validate', [
            'code' => 'FLAT50',
            'subtotal' => 300.00,
        ]);
        $resFixed->assertStatus(200);
        $this->assertEquals(50.00, (float) $resFixed->json('data.discountAmount'));
    }

    /**
     * SECTION 28 & 27: Checkout Validation Endpoint
     */
    public function test_checkout_preview_validation_endpoint(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Checkout Preview Product',
            'slug' => 'checkout-preview-product',
            'sku' => 'CPP-01',
            'wholesale_price' => 30.00,
            'moq' => 5,
            'status' => 'published',
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'CPP-01-M',
            'title' => 'Size M',
            'size' => 'M',
            'stock' => 50,
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/checkout/validate', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'size' => 'M',
                    'quantity' => 10,
                ],
            ],
            'shipping_method' => 'discuss_directly',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'subtotal',
                    'discount_amount',
                    'shipping_cost',
                    'tax_amount',
                    'total_amount',
                    'lines',
                ],
            ]);
        $this->assertEquals(300.00, (float) $response->json('data.subtotal'));
        $this->assertEquals(0.00, (float) $response->json('data.shipping_cost'));
        $this->assertEquals(315.00, (float) $response->json('data.total_amount')); // 300 + 5% tax (15)
    }

    /**
     * SECTION 35: Order Creation Transaction & Inventory Deduction
     */
    public function test_order_creation_transaction_and_inventory_deduction(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Order Purchase Denim',
            'slug' => 'order-purchase-denim',
            'sku' => 'OPD-01',
            'wholesale_price' => 60.00,
            'cost_price' => 28.00,
            'moq' => 5,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'OPD-01-32',
            'title' => 'Size 32',
            'size' => '32',
            'color' => 'Indigo',
            'stock' => 40,
        ]);

        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 40,
            'reserved_quantity' => 0,
        ]);

        // Place order for quantity 10
        $orderResponse = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => '32',
                    'quantity' => 10,
                ],
            ],
            'shipping_name' => 'Elena Rostova',
            'shipping_phone' => '+15553928172',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '97477',
            'shipping_country_code' => 'US',
            'payment_method' => 'card',
        ]);

        $orderResponse->assertStatus(201)
            ->assertJsonPath('success', true);

        // Verify variant stock decremented: 40 - 10 = 30
        $variant->refresh();
        $this->assertEquals(30, $variant->stock);

        // Verify warehouse inventory decremented: 40 - 10 = 30
        $inventory->refresh();
        $this->assertEquals(30, $inventory->quantity);
    }

    /**
     * SECTION 36: Critical Historical Financial Snapshot Immutability (NON-NEGOTIABLE)
     */
    public function test_critical_historical_financial_snapshot_immutability(): void
    {
        // 1. Create product: buying_price (cost_price) = $30, selling price (wholesale_price) = $50
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Financial Snapshot Polo',
            'slug' => 'financial-snapshot-polo',
            'sku' => 'FSP-01',
            'wholesale_price' => 50.00,
            'cost_price' => 30.00,
            'moq' => 5,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'FSP-01-L',
            'title' => 'Size L',
            'size' => 'L',
            'stock' => 100,
        ]);

        Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        // 2. Customer purchases quantity 10
        $orderRes = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'L',
                    'quantity' => 10,
                ],
            ],
            'shipping_name' => 'Elena Rostova',
            'shipping_phone' => '+15553928172',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '97477',
            'payment_method' => 'card',
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');

        // 3. Verify order item in DB: buying_price_at_sale = 30.00
        $orderItem = OrderItem::where('order_id', $orderId)->first();
        $this->assertEquals(30.00, (float) $orderItem->buying_price_at_sale);
        $this->assertEquals(50.00, (float) $orderItem->unit_price);
        $this->assertEquals(10, $orderItem->quantity);

        // 4. Admin changes product buying_price (cost_price) from $30 -> $35
        $product->update([
            'cost_price' => 35.00,
            'wholesale_price' => 65.00,
        ]);

        // 5. Reload original order from database
        $reloadedOrderItem = OrderItem::where('order_id', $orderId)->first();

        // 6. Verify: buying_price_at_sale STILL equals $30.00!
        $this->assertEquals(30.00, (float) $reloadedOrderItem->buying_price_at_sale);
        $this->assertEquals(50.00, (float) $reloadedOrderItem->unit_price);

        // 7. Verify historical profit basis: Revenue ($500) - Cost ($300) = $200!
        $historicalRevenue = (float) $reloadedOrderItem->unit_price * $reloadedOrderItem->quantity;
        $historicalCost = (float) $reloadedOrderItem->buying_price_at_sale * $reloadedOrderItem->quantity;
        $historicalProfit = $historicalRevenue - $historicalCost;
        $this->assertEquals(200.00, $historicalProfit);

        // 8. Verify Customer API does NOT expose buying_price_at_sale
        $customerView = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$orderId}");
        $customerView->assertStatus(200);
        $this->assertArrayNotHasKey('buying_price_at_sale', $customerView->json('data.items.0'));
        $this->assertArrayNotHasKey('gross_profit', $customerView->json('data.items.0'));

        // 9. Verify Admin API DOES expose buying_price_at_sale and gross_profit
        $adminView = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/orders/{$orderId}");
        $adminView->assertStatus(200);
        $this->assertEquals(30.00, $adminView->json('data.items.0.buying_price_at_sale'));
        $this->assertEquals(200.00, $adminView->json('data.items.0.gross_profit'));
    }

    /**
     * SECTION 37: Transaction Rollback on Failure
     */
    public function test_order_creation_transaction_rollback_on_failure(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Rollback Product',
            'slug' => 'rollback-product',
            'sku' => 'RBP-01',
            'wholesale_price' => 40.00,
            'moq' => 5,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'RBP-01-M',
            'title' => 'Size M',
            'size' => 'M',
            'stock' => 50,
        ]);

        // Request with insufficient stock on second line to trigger failure
        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'M',
                    'quantity' => 10,
                ],
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'M',
                    'quantity' => 9999, // Exceeds stock, will fail validation
                ],
            ],
            'shipping_name' => 'Elena Rostova',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '97477',
            'payment_method' => 'card',
        ]);

        $response->assertStatus(422);

        // Verify NO order created
        $this->assertEquals(0, Order::count());
        $this->assertEquals(0, OrderItem::count());

        // Verify stock was NOT deducted
        $variant->refresh();
        $this->assertEquals(50, $variant->stock);
    }

    /**
     * SECTION 25: Order Cancellation Restores Stock
     */
    public function test_order_cancellation_restores_inventory(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Cancellable Order Product',
            'slug' => 'cancellable-order-product',
            'sku' => 'COP-01',
            'wholesale_price' => 50.00,
            'moq' => 5,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'COP-01-S',
            'title' => 'Size S',
            'size' => 'S',
            'stock' => 30,
        ]);

        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 30,
            'reserved_quantity' => 0,
        ]);

        // Place order for 10
        $orderRes = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', [
            'items' => [
                ['product_id' => $product->id, 'variant_id' => $variant->id, 'size' => 'S', 'quantity' => 10],
            ],
            'shipping_name' => 'Elena',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '97477',
            'payment_method' => 'bank_transfer', // will be status: pending
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');

        $variant->refresh();
        $this->assertEquals(20, $variant->stock);
        $inventory->refresh();
        $this->assertEquals(20, $inventory->quantity);

        // Cancel order
        $cancelRes = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$orderId}/cancel", [
            'reason' => 'Changed purchase schedule',
        ]);
        $cancelRes->assertStatus(200);

        // Verify inventory restored to 30
        $variant->refresh();
        $this->assertEquals(30, $variant->stock);
        $inventory->refresh();
        $this->assertEquals(30, $inventory->quantity);
    }

    /**
     * SECTION 23 & 24: Customer and Admin Order Access Isolation
     */
    public function test_customer_order_ownership_and_admin_access(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Access Product',
            'slug' => 'access-product',
            'sku' => 'ACC-01',
            'wholesale_price' => 40.00,
            'moq' => 1,
            'status' => 'published',
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'ACC-01-M',
            'title' => 'Size M',
            'size' => 'M',
            'stock' => 50,
        ]);

        // Customer A places order
        $orderRes = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'size' => 'M', 'quantity' => 5]],
            'shipping_name' => 'Elena',
            'shipping_address1' => '742 Evergreen Terrace',
            'shipping_city' => 'Springfield',
            'shipping_postal_code' => '97477',
            'payment_method' => 'card',
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');

        // Customer A can view their own order
        $viewA = $this->actingAs($this->customer, 'sanctum')->getJson("/api/v1/orders/{$orderId}");
        $viewA->assertStatus(200);

        // Customer B cannot view Customer A's order -> 403 Forbidden
        $viewB = $this->actingAs($this->otherCustomer, 'sanctum')->getJson("/api/v1/orders/{$orderId}");
        $viewB->assertStatus(403);

        // Admin CAN view Customer A's order
        $viewAdmin = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/orders/{$orderId}");
        $viewAdmin->assertStatus(200);

        // Unauthenticated guest cannot view Customer A's order -> 401 Unauthorized
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/v1/orders/{$orderId}")->assertStatus(401);
    }
}

