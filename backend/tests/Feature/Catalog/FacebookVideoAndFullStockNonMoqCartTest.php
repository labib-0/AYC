<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Order\OrderCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacebookVideoAndFullStockNonMoqCartTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $buyer;
    private Brand $brand;
    private Category $category;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Store Admin',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->buyer = User::factory()->create([
            'name' => 'Wholesale Retailer',
            'email' => 'buyer@ayaan-test.com',
            'role' => 'customer',
        ]);

        $this->brand = Brand::create(['name' => 'Ayaan Garments', 'slug' => 'ayaan-garments']);
        $this->category = Category::create(['name' => 'Apparel', 'slug' => 'apparel']);
        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka Central Hub',
            'code' => 'DHK-01',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    private function createProductWithStock(int $moq, int $stock, ?float $fullStockPrice = 15.00, ?int $bulkThreshold = 500, ?float $bulkPrice = 18.00): Product
    {
        $product = Product::create([
            'product_id' => 'AYC-' . uniqid(),
            'name' => 'Premium Twill Shirt',
            'slug' => 'premium-twill-shirt-' . uniqid(),
            'sku' => 'AYN-TSH-' . uniqid(),
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'bulk_threshold' => $bulkThreshold,
            'bulk_price' => $bulkPrice,
            'bulk_pricing_enabled' => (bool) ($bulkThreshold && $bulkPrice),
            'full_stock_price' => $fullStockPrice,
            'moq' => $moq,
            'status' => 'published',
            'color_name' => 'Navy',
            'warehouse_id' => $this->warehouse->id,
            'stock' => $stock,
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Navy / Assorted',
            'sku' => $product->sku . '-AST',
            'size' => 'Assorted',
            'color' => 'Navy',
            'wholesale_price' => 20.00,
            'stock' => $stock,
            'is_active' => true,
        ]);

        return $product->fresh(['variants']);
    }

    // ==================================================
    // FACEBOOK VIDEO TESTS (TEST 1 - TEST 8)
    // ==================================================

    /**
     * TEST 1: Create product with YouTube video.
     * Existing YouTube behavior continues working without regression.
     */
    public function test_test_1_create_product_with_youtube_video_works(): void
    {
        $payload = [
            'product_id' => 'AYC-YT-101',
            'name' => 'YouTube Showcase Jacket',
            'slug' => 'youtube-showcase-jacket',
            'sku' => 'AYN-YT-101',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 35.00,
            'full_stock_price' => 25.00,
            'moq' => 50,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertEquals('youtube', $res->json('data.videoProvider'));
        $this->assertEquals('dQw4w9WgXcQ', $res->json('data.youtubeVideoId'));
        $this->assertEquals('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', $res->json('data.videoEmbedUrl'));
    }

    /**
     * TEST 2: Create product with Facebook video URL.
     * Save succeeds, returns videoProvider 'facebook', normalized canonical URL and embed URL.
     */
    public function test_test_2_create_product_with_facebook_video_url_succeeds(): void
    {
        $fbUrl = 'https://www.facebook.com/ayaanapparel/videos/1029384756';
        $payload = [
            'product_id' => 'AYC-FB-101',
            'name' => 'Facebook Showcase Shirt',
            'slug' => 'facebook-showcase-shirt',
            'sku' => 'AYN-FB-101',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 50,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => $fbUrl,
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $this->assertEquals('facebook', $res->json('data.videoProvider'));
        $this->assertEquals($fbUrl, $res->json('data.facebookVideoUrl'));
        $expectedEmbed = 'https://www.facebook.com/plugins/video.php?href=' . urlencode($fbUrl) . '&show_text=false&t=0';
        $this->assertEquals($expectedEmbed, $res->json('data.videoEmbedUrl'));
        $this->assertEquals($expectedEmbed, $res->json('data.facebookEmbedUrl'));
    }

    /**
     * TEST 3: Product Detail Facebook video selected.
     * Embedded Facebook video info renders cleanly on public Product Detail API.
     */
    public function test_test_3_product_detail_returns_embedded_facebook_video_data(): void
    {
        $fbUrl = 'https://fb.watch/sampleReel123/';
        $product = Product::create([
            'name' => 'FB Watch Jacket',
            'slug' => 'fb-watch-jacket',
            'sku' => 'AYN-FBW-01',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 45.00,
            'full_stock_price' => 35.00,
            'moq' => 20,
            'video_url' => $fbUrl,
            'status' => 'published',
        ]);

        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertOk();
        $this->assertEquals('facebook', $res->json('data.videoProvider'));
        $this->assertEquals($fbUrl, $res->json('data.facebookVideoUrl'));
        $this->assertStringContainsString('facebook.com/plugins/video.php', $res->json('data.videoEmbedUrl'));
        $this->assertStringContainsString(urlencode($fbUrl), $res->json('data.videoEmbedUrl'));
    }

    /**
     * TEST 4: Edit Facebook URL.
     * Updated Facebook URL is validated, saved, and new embed URL is generated.
     */
    public function test_test_4_edit_facebook_video_url_updates_embed(): void
    {
        $product = Product::create([
            'name' => 'Initial FB Product',
            'slug' => 'initial-fb-product',
            'sku' => 'AYN-IFB-01',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 20.00,
            'moq' => 20,
            'video_url' => 'https://www.facebook.com/reel/1234567890',
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
        ]);

        $newFbUrl = 'https://www.facebook.com/ayaanapparel/videos/9988776655';
        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'video_url' => $newFbUrl,
        ]);
        $res->assertOk();
        $this->assertEquals('facebook', $res->json('data.videoProvider'));
        $this->assertEquals($newFbUrl, $res->json('data.facebookVideoUrl'));
        $this->assertStringContainsString(urlencode($newFbUrl), $res->json('data.videoEmbedUrl'));
    }

    /**
     * TEST 5: Delete Facebook video.
     * Setting video_url to null removes the video cleanly.
     */
    public function test_test_5_delete_facebook_video_removes_cleanly(): void
    {
        $product = Product::create([
            'name' => 'Delete FB Video Product',
            'slug' => 'delete-fb-video-product',
            'sku' => 'AYN-DFB-01',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 20.00,
            'moq' => 20,
            'video_url' => 'https://www.facebook.com/reel/1234567890',
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'video_url' => null,
        ]);
        $res->assertOk();
        $this->assertNull($res->json('data.videoProvider'));
        $this->assertEmpty($res->json('data.videoUrl'));
        $this->assertNull($res->json('data.videoEmbedUrl'));
    }

    /**
     * TEST 6: Invalid Facebook URL.
     * Malformed or non-video Facebook URLs are rejected.
     */
    public function test_test_6_invalid_facebook_url_is_rejected(): void
    {
        $payload = [
            'product_id' => 'AYC-FB-INV',
            'name' => 'Invalid FB URL Product',
            'slug' => 'invalid-fb-url-product',
            'sku' => 'AYN-FBI-01',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'full_stock_price' => 20.00,
            'moq' => 20,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => 'https://facebook.com/just-a-profile-without-video',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['video_url']);
    }

    /**
     * TEST 7: Unsupported external iframe domain, javascript:, data: protocols.
     * Rejected securely with 422.
     */
    public function test_test_7_unsupported_external_domain_or_insecure_protocols_rejected(): void
    {
        $insecureUrls = [
            'javascript:alert(1)',
            'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
            'https://evil-site.com/video/embed',
            'https://vimeo.com/1234567',
        ];

        foreach ($insecureUrls as $badUrl) {
            $payload = [
                'product_id' => 'AYC-SEC-' . uniqid(),
                'name' => 'Security Test Product',
                'slug' => 'security-test-product-' . uniqid(),
                'sku' => 'AYN-SEC-' . uniqid(),
                'brand_id' => $this->brand->id,
                'wholesale_price' => 30.00,
                'full_stock_price' => 20.00,
                'moq' => 20,
                'warehouse_id' => $this->warehouse->id,
                'video_url' => $badUrl,
            ];

            $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
            $res->assertStatus(422);
            $res->assertJsonValidationErrors(['video_url']);
        }
    }

    /**
     * TEST 8: Multiple images + YouTube / Facebook video.
     * Images and video coexist; media ordering preserved; Offer sheet only uses real images.
     */
    public function test_test_8_multiple_images_and_facebook_video_preserve_ordering_and_offer_sheet(): void
    {
        $fbUrl = 'https://www.facebook.com/reel/9876543210';
        $product = Product::create([
            'name' => 'Multi Media Product',
            'slug' => 'multi-media-product',
            'sku' => 'AYN-MMP-01',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 25.00,
            'full_stock_price' => 20.00,
            'moq' => 20,
            'video_url' => $fbUrl,
            'status' => 'published',
            'warehouse_id' => $this->warehouse->id,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://cdn.ayaan.test/images/img1.jpg',
            'sort_order' => 1,
            'is_primary' => true,
        ]);
        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://cdn.ayaan.test/images/img2.jpg',
            'sort_order' => 2,
            'is_primary' => false,
        ]);

        $res = $this->getJson("/api/v1/products/{$product->slug}");
        $res->assertOk();
        $this->assertCount(2, $res->json('data.images'));
        $this->assertEquals('facebook', $res->json('data.videoProvider'));
        $this->assertEquals($fbUrl, $res->json('data.facebookVideoUrl'));

        // Commercial doc / offer sheet gallery check: only contains image URLs, no fake video poster
        $order = Order::create([
            'order_number' => 'ORD-MEDIA-001',
            'user_id' => $this->buyer->id,
            'email' => 'buyer@ayaan-test.com',
            'shipping_name' => 'John Doe',
            'shipping_address1' => '123 Business Way',
            'shipping_city' => 'Dhaka',
            'shipping_postal_code' => '1212',
            'total_amount' => 500.00,
            'subtotal' => 500.00,
            'currency' => 'USD',
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 20,
            'unit_price' => 25.00,
            'line_total' => 500.00,
        ]);

        $doc = $order->getCommercialDocument('offer_sheet');
        $this->assertIsArray($doc['product_gallery']);
        $this->assertContains('https://cdn.ayaan.test/images/img1.jpg', $doc['product_gallery']);
        $this->assertContains('https://cdn.ayaan.test/images/img2.jpg', $doc['product_gallery']);
        $this->assertNotContains($fbUrl, $doc['product_gallery']);
    }

    // ==================================================
    // FULL STOCK TESTS (TEST 9 - TEST 16)
    // ==================================================

    /**
     * TEST 9: MOQ 100, Available 1,500, Full Stock 1,500
     * Add to cart succeeds (exact multiple).
     */
    public function test_test_9_moq_100_available_1500_full_stock_1500_succeeds(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1500, fullStockPrice: 15.00);

        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 1500,
            'pricing_mode' => 'full_stock',
        ]);

        $res->assertOk();
        $this->assertEquals(1500, $res->json('data.items.0.quantity'));
        $this->assertEquals('full_stock', $res->json('data.items.0.pricing_mode'));
        $this->assertEquals(15.00, (float) $res->json('data.items.0.unit_price'));
        $this->assertEquals(22500.00, (float) $res->json('data.items.0.line_total'));
    }

    /**
     * TEST 10: MOQ 100, Available 1,550, Full Stock 1,550
     * Available stock is NOT an MOQ multiple (1550 % 100 = 50).
     * Add to cart MUST SUCCEED with exact available quantity 1,550.
     */
    public function test_test_10_moq_100_available_1550_full_stock_1550_succeeds_even_when_not_moq_multiple(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1550, fullStockPrice: 15.00);

        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 1550,
            'pricing_mode' => 'full_stock',
        ]);

        $res->assertOk();
        $this->assertEquals(1550, $res->json('data.items.0.quantity'));
        $this->assertEquals('full_stock', $res->json('data.items.0.pricing_mode'));
        $this->assertEquals(15.00, (float) $res->json('data.items.0.unit_price'));
        $this->assertEquals(23250.00, (float) $res->json('data.items.0.line_total'));
        $this->assertEquals(23250.00, (float) $res->json('data.subtotal'));
    }

    /**
     * TEST 11: MOQ 100, Available 1,575, Full Stock 1,575
     * Add to cart MUST SUCCEED with exact available quantity 1,575.
     */
    public function test_test_11_moq_100_available_1575_full_stock_1575_succeeds(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1575, fullStockPrice: 15.00);

        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 1575,
            'pricing_mode' => 'full_stock',
        ]);

        $res->assertOk();
        $this->assertEquals(1575, $res->json('data.items.0.quantity'));
        $this->assertEquals('full_stock', $res->json('data.items.0.pricing_mode'));
        $this->assertEquals(15.00, (float) $res->json('data.items.0.unit_price'));
        $this->assertEquals(23625.00, (float) $res->json('data.items.0.line_total'));
    }

    /**
     * TEST 12: Full Stock quantity greater than current availability
     * Requested quantity 1,576 when 1,575 available -> rejected (422).
     */
    public function test_test_12_full_stock_quantity_greater_than_available_rejected(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1575, fullStockPrice: 15.00);

        $res = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 1576,
            'pricing_mode' => 'full_stock',
        ]);

        $res->assertStatus(422);
        $this->assertEquals('INSUFFICIENT_STOCK', $res->json('error_code'));
    }

    /**
     * TEST 13: Stock changes after selection
     * Selected 1,550, but stock reduces to 1,450. Backend revalidation detects stale quantity.
     */
    public function test_test_13_stock_reduction_after_selection_triggers_stale_inventory_error(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1550, fullStockPrice: 15.00);

        // 1. Add 1,550 to cart
        $cartRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 1550,
            'pricing_mode' => 'full_stock',
        ]);
        $cartRes->assertOk();

        // 2. Another order reduces stock from 1,550 to 1,450
        $product->variants()->first()->update(['stock' => 1450]);
        $product->update(['stock' => 1450]);

        // 3. Cart revalidate detects the stale inventory
        $revalRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart/revalidate');
        $revalRes->assertOk();
        $this->assertFalse($revalRes->json('is_valid'));
        $violations = $revalRes->json('violations');
        $this->assertNotEmpty($violations);
        $this->assertContains($violations[0]['error_code'], ['STALE_INVENTORY', 'INSUFFICIENT_STOCK']);
        $this->assertEquals(1450, $violations[0]['available_quantity']);
    }

    /**
     * TEST 14: Standard quantity still obeys MOQ.
     * Quantity 150 with MOQ 100 is rejected because standard requires multiple of MOQ.
     * Quantity 50 with MOQ 100 is rejected because below MOQ.
     */
    public function test_test_14_standard_quantity_still_strictly_obeys_moq(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1550, fullStockPrice: 15.00);

        // Below MOQ (50 < 100) -> 422 BELOW_MOQ
        $resBelow = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 50,
        ]);
        $resBelow->assertStatus(422);
        $this->assertEquals('BELOW_MOQ', $resBelow->json('error_code'));

        // Not an MOQ multiple (150 % 100 !== 0) -> 422 INVALID_MOQ_MULTIPLE
        $resMultiple = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 150,
        ]);
        $resMultiple->assertStatus(422);
        $this->assertEquals('INVALID_MOQ_MULTIPLE', $resMultiple->json('error_code'));
    }

    /**
     * TEST 15: Bulk quantity still follows Bulk rules.
     * Bulk threshold 500 with MOQ 100.
     * Quantity 500 -> gets bulk price $18.00.
     * Non-multiple bulk like 550 -> rejected by MOQ multiple rule.
     */
    public function test_test_15_bulk_quantity_still_follows_bulk_and_moq_rules(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1550, fullStockPrice: 15.00, bulkThreshold: 500, bulkPrice: 18.00);

        // Valid bulk: 500 pcs (>= 500 and 500 % 100 === 0)
        $res500 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 500,
            'pricing_mode' => 'bulk',
        ]);
        $res500->assertOk();
        $this->assertEquals(18.00, (float) $res500->json('data.items.0.unit_price'));

        // Clear cart
        $this->actingAs($this->buyer, 'sanctum')->deleteJson('/api/v1/cart');

        // Non-multiple bulk: 550 pcs (550 % 100 !== 0) -> rejected by generic MOQ multiple rule
        $res550 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 550,
            'pricing_mode' => 'bulk',
        ]);
        $res550->assertStatus(422);
        $this->assertEquals('INVALID_MOQ_MULTIPLE', $res550->json('error_code'));
    }

    /**
     * TEST 16: Full Stock order deducts exact stock quantity.
     * Available 1,550. Full Stock sale 1,550.
     * After successful checkout/order: Available becomes 0.
     */
    public function test_test_16_full_stock_order_deducts_exact_stock_quantity(): void
    {
        $product = $this->createProductWithStock(moq: 100, stock: 1550, fullStockPrice: 15.00);

        // 1. Add 1,550 to cart in full_stock mode
        $cartRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 1550,
            'pricing_mode' => 'full_stock',
        ]);
        $cartRes->assertOk();

        // 2. Place Order
        $orderRes = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', [
            'email' => 'buyer@ayaan-test.com',
            'shipping_name' => 'John Doe',
            'shipping_address1' => '123 Business Way',
            'shipping_city' => 'Dhaka',
            'shipping_postal_code' => '1212',
            'shipping_country_code' => 'BD',
            'shipping_method' => 'air_express',
            'payment_method' => 'bank_transfer',
        ]);

        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');
        $order = Order::find($orderId);
        $this->assertNotNull($order);
        $this->assertEquals(1550, $order->items->first()->quantity);

        // 3. Verify exact inventory deduction
        $freshProduct = $product->fresh(['variants']);
        $this->assertEquals(0, $freshProduct->variants()->sum('stock'));
        $this->assertEquals(0, $freshProduct->getTotalAvailableStock());
    }
}
