<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\HomepageFeaturedProduct;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductDeletionResilienceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private Brand $brand;
    private Category $category;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Customer User',
            'email' => 'customer@ayaan.test',
            'role' => 'customer',
        ]);

        $this->brand = Brand::create(['name' => 'Alpha Brand', 'slug' => 'alpha-brand']);
        $this->category = Category::create(['name' => 'Denim', 'slug' => 'denim']);
        $this->warehouse = Warehouse::create([
            'name' => 'Central Hub',
            'code' => 'HUB-01',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * TEST A: Product with no dependencies deletes cleanly and frees slug, sku, and product_id
     */
    public function test_product_without_dependencies_can_be_deleted_successfully(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Test Jacket',
            'slug' => 'test-jacket',
            'sku' => 'JKT-001',
            'product_id' => 'AYC-JKT-001',
            'wholesale_price' => 50.00,
            'stock' => 10,
            'moq' => 5,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);

        $trashed = Product::withTrashed()->find($product->id);
        $this->assertNotNull($trashed->deleted_at);
        $this->assertStringContainsString('-deleted-', $trashed->slug);
        $this->assertStringContainsString('-del-', $trashed->sku);
        $this->assertStringContainsString('-del-', $trashed->product_id);

        // Immediate recreation with identical identifiers must succeed
        $recreated = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Recreated Jacket',
            'slug' => 'test-jacket',
            'sku' => 'JKT-001',
            'product_id' => 'AYC-JKT-001',
            'wholesale_price' => 55.00,
            'stock' => 12,
            'moq' => 5,
            'status' => 'published',
        ]);
        $this->assertEquals('test-jacket', $recreated->slug);
        $this->assertEquals('JKT-001', $recreated->sku);
        $this->assertEquals('AYC-JKT-001', $recreated->product_id);
    }

    /**
     * TEST B: Product with inventory deletes cleanly without orphaned blocks
     */
    public function test_product_with_inventory_deletes_cleanly(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Inventory Product',
            'slug' => 'inv-product',
            'sku' => 'INV-001',
            'wholesale_price' => 30.00,
            'stock' => 100,
            'moq' => 10,
            'status' => 'published',
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);

        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    /**
     * TEST C: Product referenced by historical orders preserves historical order records
     */
    public function test_product_referenced_by_orders_preserves_historical_records(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Historical Order Shirt',
            'slug' => 'hist-shirt',
            'sku' => 'HIST-001',
            'wholesale_price' => 20.00,
            'stock' => 50,
            'moq' => 10,
            'status' => 'published',
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'email' => $this->customer->email,
            'order_number' => 'ORD-TEST-001',
            'status' => 'completed',
            'total_amount' => 200.00,
            'currency' => 'USD',
        ]);

        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => 'Historical Order Shirt',
            'product_slug' => 'hist-shirt',
            'sku' => 'HIST-001',
            'quantity' => 10,
            'unit_price' => 20.00,
            'line_total' => 200.00,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);

        // Verify product is soft deleted
        $this->assertSoftDeleted('products', ['id' => $product->id]);

        // Historical order and order item MUST remain completely preserved
        $freshItem = OrderItem::find($orderItem->id);
        $this->assertNotNull($freshItem);
        $this->assertEquals(200.00, (float) $freshItem->line_total);
        $this->assertEquals('HIST-001', $freshItem->sku);
        $this->assertEquals('Historical Order Shirt', $freshItem->product_name);
        $this->assertEquals($order->id, $freshItem->order_id);
    }

    /**
     * TEST D: Product in featured list and cart items cleans up non-historical transient links
     */
    public function test_product_with_featured_and_cart_items_cleans_up_transient_data(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Featured Product',
            'slug' => 'featured-product',
            'sku' => 'FEAT-001',
            'wholesale_price' => 45.00,
            'stock' => 20,
            'moq' => 5,
            'status' => 'published',
        ]);

        HomepageFeaturedProduct::create([
            'product_id' => $product->id,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $cart = Cart::create(['user_id' => $this->customer->id]);
        CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_price' => 45.00,
        ]);

        $this->assertEquals(1, HomepageFeaturedProduct::where('product_id', $product->id)->count());
        $this->assertEquals(1, CartItem::where('product_id', $product->id)->count());

        $response = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/{$product->id}");
        $response->assertStatus(200);

        // Featured products and cart items must be cleanly removed
        $this->assertEquals(0, HomepageFeaturedProduct::where('product_id', $product->id)->count());
        $this->assertEquals(0, CartItem::where('product_id', $product->id)->count());
    }

    /**
     * TEST E: Unauthorized customer cannot delete product
     */
    public function test_unauthorized_user_cannot_delete_product(): void
    {
        $product = Product::create([
            'brand_id' => $this->brand->id,
            'name' => 'Protected Product',
            'slug' => 'prot-product',
            'sku' => 'PROT-001',
            'wholesale_price' => 15.00,
            'stock' => 10,
            'moq' => 1,
        ]);

        // Customer user fails with 403
        $response = $this->actingAs($this->customer, 'sanctum')->deleteJson("/api/v1/products/{$product->id}");
        $response->assertStatus(403);

        // Unauthenticated fails with 401 or 403
        $responseUnauth = $this->deleteJson("/api/v1/products/{$product->id}");
        $this->assertTrue(in_array($responseUnauth->status(), [401, 403]));
    }

    /**
     * TEST F: Nonexistent product returns 404
     */
    public function test_nonexistent_product_returns_404(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/9999999");
        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'Product not found or already deleted',
        ]);
    }

    /**
     * TEST G: Client-side draft identifiers return 200 OK without database errors
     */
    public function test_client_side_draft_identifier_returns_200_ok(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/draft_local_new");
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $responseCustom = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/products/draft_abc_123");
        $responseCustom->assertStatus(200);
        $responseCustom->assertJson([
            'success' => true,
        ]);
    }
}
