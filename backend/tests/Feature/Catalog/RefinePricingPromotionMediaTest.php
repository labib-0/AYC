<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RefinePricingPromotionMediaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
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

        $this->brand = Brand::create(['name' => 'Ayaan Wholesale', 'slug' => 'ayaan-wholesale']);
        $this->category = Category::create(['name' => 'Hoodies', 'slug' => 'hoodies']);
        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka WH',
            'code' => 'WH-DHK',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * TEST: Pricing B2B tiers & derived MOQ without manufacturing cost.
     */
    public function test_pricing_and_b2b_volume_tiers_persist_cleanly(): void
    {
        $payload = [
            'product_id' => 'AYC-HOD-001',
            'name' => 'Heavyweight Oversized Hoodie',
            'slug' => 'heavyweight-oversized-hoodie',
            'sku' => 'AYN-HOD-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 25.00,
            'bulk_threshold' => 100,
            'bulk_price' => 20.02,
            'full_stock_price' => 17.50,
            'warehouse_id' => $this->warehouse->id,
            'msrp_price' => 226.00,
            'status' => 'published',
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'M', 'quantity' => 10],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 15],
            ],
            // Note: cost_price (manufacturing cost) is completely omitted
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $productId = $response->json('data.id');
        $product = Product::find($productId);

        $this->assertEquals(25.00, (float) $product->wholesale_price);
        $this->assertEquals(100, (int) $product->bulk_threshold);
        $this->assertEquals(20.02, (float) $product->bulk_price);
        $this->assertEquals(226.00, (float) $product->msrp_price);
        $this->assertEquals(25, (int) $product->moq); // 10 + 15 = 25 derived MOQ
    }

    /**
     * TEST: Promotional badges with independent scheduling (days duration vs until changed).
     */
    public function test_promotional_badge_scheduling_and_expiration(): void
    {
        // 1. Create with New Arrival (7 days duration) & Hot Sale (Until Changed = null end date)
        $payload = [
            'product_id' => 'AYC-BLS-001',
            'name' => 'Scheduled Promo Blouse',
            'slug' => 'scheduled-promo-blouse',
            'sku' => 'AYN-BLS-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'warehouse_id' => $this->warehouse->id,
            'is_new' => true,
            'new_duration_days' => 7,
            'is_hot' => true,
            'hot_until' => null, // Until I change it
            'is_featured' => false,
            'package_allocations' => [
                ['color' => 'Navy', 'size' => 'M', 'quantity' => 20],
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);

        $productId = $res->json('data.id');
        $product = Product::find($productId);

        $this->assertTrue($product->is_new);
        $this->assertNotNull($product->new_until);
        $this->assertTrue($product->isNewActive());

        $this->assertTrue($product->is_hot);
        $this->assertNull($product->hot_until);
        $this->assertTrue($product->isHotActive());

        // 2. Simulate time passing: 8 days later
        Carbon::setTestNow(now()->addDays(8));

        $product->refresh();
        // New Arrival has expired (active is now false)
        $this->assertFalse($product->isNewActive());
        // Hot Sale remains active indefinitely
        $this->assertTrue($product->isHotActive());

        // API response for public storefront reflects computed active state
        $getRes = $this->getJson("/api/v1/products/{$productId}");
        $getRes->assertStatus(200);
        $this->assertFalse($getRes->json('data.isNew'));
        $this->assertTrue($getRes->json('data.isHot'));

        // Reset Carbon test now
        Carbon::setTestNow();
    }

    /**
     * TEST: Video URL handling for YouTube, Vimeo, and Direct MP4.
     */
    public function test_video_url_support_and_validation(): void
    {
        // 1. YouTube watch URL
        $ytPayload = [
            'product_id' => 'AYC-YT-001',
            'name' => 'YouTube Showcase Blouse',
            'slug' => 'youtube-showcase-blouse',
            'sku' => 'AYN-YT-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'package_allocations' => [['color' => 'Navy', 'size' => 'M', 'quantity' => 10]],
        ];
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $ytPayload);
        $res1->assertStatus(201);
        $this->assertEquals('youtube', $res1->json('data.videoProvider'));
        $this->assertEquals('dQw4w9WgXcQ', $res1->json('data.youtubeVideoId'));

        // 2. Vimeo URL
        $vimeoPayload = [
            'product_id' => 'AYC-VIM-001',
            'name' => 'Vimeo Showcase Blouse',
            'slug' => 'vimeo-showcase-blouse',
            'sku' => 'AYN-VIM-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => 'https://vimeo.com/76979871',
            'package_allocations' => [['color' => 'Navy', 'size' => 'M', 'quantity' => 10]],
        ];
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $vimeoPayload);
        $res2->assertStatus(201);
        $this->assertEquals('vimeo', $res2->json('data.videoProvider'));
        $this->assertEquals('76979871', $res2->json('data.vimeoVideoId'));
        $this->assertEquals('https://player.vimeo.com/video/76979871', $res2->json('data.videoEmbedUrl'));

        // 3. Direct MP4 URL
        $mp4Payload = [
            'product_id' => 'AYC-MP4-001',
            'name' => 'Direct MP4 Blouse',
            'slug' => 'direct-mp4-blouse',
            'sku' => 'AYN-MP4-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => 'https://cdn.example.com/videos/product-preview.mp4',
            'package_allocations' => [['color' => 'Navy', 'size' => 'M', 'quantity' => 10]],
        ];
        $res3 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $mp4Payload);
        $res3->assertStatus(201);
        $this->assertEquals('direct', $res3->json('data.videoProvider'));

        // 4. Invalid Video URL rejection
        $invalidPayload = [
            'product_id' => 'AYC-INV-001',
            'name' => 'Invalid Video Blouse',
            'slug' => 'invalid-video-blouse',
            'sku' => 'AYN-INV-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'bulk_threshold' => 100,
            'bulk_price' => 25.00,
            'full_stock_price' => 20.00,
            'warehouse_id' => $this->warehouse->id,
            'video_url' => 'https://random-unsupported-site.com/watch?id=123',
            'package_allocations' => [['color' => 'Navy', 'size' => 'M', 'quantity' => 10]],
        ];
        $res4 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $invalidPayload);
        $res4->assertStatus(422);
    }
}
