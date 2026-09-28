<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductPricingTier;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WholesalePackageAssortmentTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $admin;
    private Warehouse $warehouse;
    private Product $packageProduct;
    private array $variants = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'name' => 'Wholesale Buyer',
            'email' => 'buyer@wholesale.test',
            'role' => 'customer',
            'b2b_approval_status' => 'approved',
            'b2b_payment_terms' => 'net_30',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Store Admin',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $brand = Brand::create(['name' => 'Ayaan Export', 'slug' => 'ayaan-export', 'logo_url' => '/brands/ayaan.png']);
        $category = Category::create(['name' => 'Tops', 'slug' => 'tops']);
        $this->warehouse = Warehouse::create([
            'name' => 'Main Warehouse',
            'code' => 'WH-MAIN',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        // 1. Create Product with 3-Price Model:
        // MOQ = 10, Standard Price = $28.00
        // Bulk Threshold = 200, Bulk Price = $22.40
        // Full Stock Price = $20.00
        $this->packageProduct = Product::create([
            'brand_id' => $brand->id,
            'name' => 'Core Wholesale Assorted Heavyweight Tee',
            'slug' => 'core-wholesale-assorted-heavyweight-tee',
            'sku' => 'AYN-PKG-001',
            'wholesale_price' => 28.00,
            'bulk_threshold' => 200,
            'bulk_price' => 22.40,
            'full_stock_price' => 20.00,
            'msrp_price' => 45.00,
            'cost_price' => 12.00,
            'moq' => 10,
            'status' => 'published',
            'color_name' => 'Assorted',
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);
        $this->packageProduct->categories()->attach($category->id);

        // 2. Create Variants: Colors [Black, Blue] x Sizes [XS, S, M, L, XL] -> 10 variants
        // Each variant has stock 71 -> Total stock = 10 * 71 = 710 pcs
        $colors = ['Black', 'Blue'];
        $sizes = ['XS', 'S', 'M', 'L', 'XL'];

        foreach ($colors as $color) {
            foreach ($sizes as $size) {
                $variant = ProductVariant::create([
                    'product_id' => $this->packageProduct->id,
                    'sku' => "AYN-PKG-001-{$color}-{$size}",
                    'title' => "Color: {$color} / Size: {$size}",
                    'color' => $color,
                    'size' => $size,
                    'stock' => 71, // Total stock = 710 pcs
                ]);
                $this->variants["{$color}-{$size}"] = $variant;
            }
        }

        // 3. Create Predefined Package Allocation (Base MOQ = 10 pcs)
        // Black: XS:1, S:1, M:1, L:1, XL:1 -> Total 5
        // Blue:  XS:1, S:1, M:1, L:1, XL:1 -> Total 5
        // Sum = 10 pcs
        foreach ($colors as $color) {
            foreach ($sizes as $size) {
                $variant = $this->variants["{$color}-{$size}"];
                ProductPackageAllocation::create([
                    'product_id' => $this->packageProduct->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 1,
                ]);
            }
        }
    }

    public function test_three_tier_pricing_resolution(): void
    {
        // 1. Standard Price (MOQ to Bulk Threshold - 1: 10 to 199 pcs) -> $28.00
        $this->assertEquals(28.00, $this->packageProduct->getUnitPriceForQuantity(10));
        $this->assertEquals(28.00, $this->packageProduct->getUnitPriceForQuantity(50));
        $this->assertEquals(28.00, $this->packageProduct->getUnitPriceForQuantity(199));

        // 2. Bulk Price (200+ pcs) -> $22.40
        $this->assertEquals(22.40, $this->packageProduct->getUnitPriceForQuantity(200));
        $this->assertEquals(22.40, $this->packageProduct->getUnitPriceForQuantity(210));
        $this->assertEquals(22.40, $this->packageProduct->getUnitPriceForQuantity(500));

        // 3. Full-Stock Price (Exact available stock = 710 pcs or explicit full_stock mode at eligible quantity) -> $20.00
        $this->assertEquals(20.00, $this->packageProduct->getUnitPriceForQuantity(710));
        $this->assertEquals(20.00, $this->packageProduct->getUnitPriceForQuantity(710, 'full_stock'));
        $this->assertEquals(20.00, $this->packageProduct->getResolvedFullStockPrice());
    }

    public function test_full_stock_price_resolution_never_worse_than_applicable_tier(): void
    {
        // Case 1: Available stock = 150 (<= bulk threshold of 200) -> falls back to standard MOQ price $28.00
        $this->assertEquals(28.00, $this->packageProduct->getResolvedFullStockPrice(150));

        // Case 1b: Available stock = 710 (> bulk threshold of 200), configured full_stock_price = $20.00 -> $20.00
        $this->assertEquals(20.00, $this->packageProduct->getResolvedFullStockPrice(710));

        // Case 2: Available stock = 150 (< bulk threshold of 200), configured full_stock_price = $30.00 (higher than standard $28.00)
        // Must auto-adjust to standard tier $28.00 (never worse)
        $this->packageProduct->full_stock_price = 30.00;
        $this->assertEquals(28.00, $this->packageProduct->getResolvedFullStockPrice(150));

        // Case 3: Available stock = 710 (>= bulk threshold of 200), configured full_stock_price = $25.00 (higher than bulk $22.40)
        // Must auto-adjust to bulk tier $22.40 (never worse)
        $this->assertEquals(22.40, $this->packageProduct->getResolvedFullStockPrice(710));

        // Case 4: No configured full stock price (null), available stock = 150 (< 200) -> standard $28.00
        $this->packageProduct->full_stock_price = null;
        $this->assertEquals(28.00, $this->packageProduct->getResolvedFullStockPrice(150));

        // Case 5: No configured full stock price (null), available stock = 710 (>= 200) -> bulk $22.40
        $this->assertEquals(22.40, $this->packageProduct->getResolvedFullStockPrice(710));

        // Reset for subsequent tests
        $this->packageProduct->full_stock_price = 20.00;
    }

    public function test_package_breakdown_scales_proportionally_and_sum_equals_quantity(): void
    {
        // 1. At MOQ (10 pcs): SUM === 10
        $breakdown10 = $this->packageProduct->getPackageBreakdownForQuantity(10);
        $this->assertCount(10, $breakdown10);
        $total10 = array_sum(array_column($breakdown10, 'quantity'));
        $this->assertEquals(10, $total10);

        // 2. At 20 pcs: SUM === 20, each cell doubled to 2
        $breakdown20 = $this->packageProduct->getPackageBreakdownForQuantity(20);
        $total20 = array_sum(array_column($breakdown20, 'quantity'));
        $this->assertEquals(20, $total20);
        $this->assertEquals(2, $breakdown20[0]['quantity']);

        // 3. At Bulk (200 pcs): SUM === 200, each cell scaled to 20
        $breakdown200 = $this->packageProduct->getPackageBreakdownForQuantity(200);
        $total200 = array_sum(array_column($breakdown200, 'quantity'));
        $this->assertEquals(200, $total200);
        $this->assertEquals(20, $breakdown200[0]['quantity']);

        // 4. At Full Stock (710 pcs) with isFullStock=true: uses live variant stocks
        $breakdownFull = $this->packageProduct->getPackageBreakdownForQuantity(710, true);
        $totalFull = array_sum(array_column($breakdownFull, 'quantity'));
        $this->assertEquals(710, $totalFull);
        $this->assertEquals(71, $breakdownFull[0]['quantity']);
    }

    public function test_cart_enforces_moq_and_multiples(): void
    {
        // 1. Adding less than MOQ (5 < 10) -> Rejected 422
        $resBelow = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $this->packageProduct->id,
            'quantity' => 5,
        ]);
        $resBelow->assertStatus(422);

        // 2. Adding valid MOQ multiple (20 pcs) -> Succeeded with Standard Price ($28.00)
        $res20 = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $this->packageProduct->id,
            'quantity' => 20,
        ]);
        $res20->assertOk()
            ->assertJsonPath('data.items.0.quantity', 20)
            ->assertJsonPath('data.items.0.unit_price', 28)
            ->assertJsonPath('data.items.0.line_total', 560);

        // 3. Updating to Bulk Quantity (200 pcs) -> Succeeded with Bulk Price ($22.40)
        $res200 = $this->actingAs($this->buyer, 'sanctum')->putJson('/api/v1/cart/items', [
            'product_id' => $this->packageProduct->id,
            'quantity' => 200,
        ]);
        $res200->assertOk()
            ->assertJsonPath('data.items.0.quantity', 200)
            ->assertJsonPath('data.items.0.unit_price', 22.4)
            ->assertJsonPath('data.items.0.line_total', 4480);
    }

    public function test_checkout_calculates_final_amount_and_preserves_package_snapshot(): void
    {
        // 1. Add 200 pcs (Bulk tier -> $22.40/pc -> $4,480.00 subtotal)
        $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $this->packageProduct->id,
            'quantity' => 200,
        ]);

        // 2. Checkout
        $orderPayload = [
            'shipping_name' => 'Wholesale Logistics Hub',
            'email' => 'buyer@wholesale.test',
            'shipping_phone' => '+1 555-9000',
            'shipping_address1' => '500 Freight Way',
            'shipping_city' => 'Newark',
            'shipping_region' => 'NJ',
            'shipping_postal_code' => '07102',
            'shipping_country_code' => 'US',
            'payment_method' => 'net_30',
        ];

        $resOrder = $this->actingAs($this->buyer, 'sanctum')->postJson('/api/v1/orders', $orderPayload);
        $resOrder->assertStatus(201)
            ->assertJsonPath('data.subtotal', 4480) // 200 * 22.40
            ->assertJsonPath('data.items.0.quantity', 200)
            ->assertJsonPath('data.items.0.unit_price', 22.4);

        $orderId = $resOrder->json('data.id');
        $order = Order::with('items')->find($orderId);
        $this->assertNotNull($order);
        $this->assertEquals(4480.00, (float) $order->subtotal);

        // Historical Package Snapshot verification
        $orderItem = $order->items->first();
        $this->assertNotNull($orderItem->package_breakdown);
        $this->assertEquals(200, array_sum(array_column($orderItem->package_breakdown, 'quantity')));

        // Stock deduction check: 20 pcs deducted from each variant
        $firstVariant = ProductVariant::find($this->variants['Black-XS']->id);
        $this->assertEquals(51, $firstVariant->stock); // 71 - 20 = 51
    }

    public function test_youtube_video_id_and_embed_url_extraction(): void
    {
        $this->assertEquals('dQw4w9WgXcQ', $this->packageProduct->getYoutubeVideoId());
        $this->assertEquals('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', $this->packageProduct->getYoutubeEmbedUrl());

        // Test youtu.be format
        $this->packageProduct->video_url = 'https://youtu.be/9bZkp7q19f0';
        $this->assertEquals('9bZkp7q19f0', $this->packageProduct->getYoutubeVideoId());
        $this->assertEquals('https://www.youtube-nocookie.com/embed/9bZkp7q19f0', $this->packageProduct->getYoutubeEmbedUrl());

        // Test null when empty
        $this->packageProduct->video_url = null;
        $this->assertNull($this->packageProduct->getYoutubeVideoId());
        $this->assertNull($this->packageProduct->getYoutubeEmbedUrl());
    }

    public function test_admin_inline_brand_creation_and_package_matrix_validation(): void
    {
        // 1. Invalid package matrix (allocations sum = 8, MOQ = 10) -> Rejected 422
        $invalidPayload = [
            'name' => 'New B2B Cargo Jogger',
            'slug' => 'new-b2b-cargo-jogger',
            'sku' => 'AYN-JOG-001',
            'new_brand_name' => 'Alpha Industrial',
            'new_brand_logo' => '/brands/alpha.png',
            'wholesale_price' => 35.00,
            'bulk_threshold' => 100,
            'bulk_price' => 28.00,
            'full_stock_price' => 25.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'M', 'quantity' => 4],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 4],
                // sum = 8 !== 10
            ],
        ];

        $resInvalid = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $invalidPayload);
        $resInvalid->assertStatus(422);

        // 2. Valid package matrix (allocations sum = 10, MOQ = 10) -> Succeeded 201
        $validPayload = [
            'product_id' => 'AYC-JOG-001',
            'name' => 'New B2B Cargo Jogger',
            'slug' => 'new-b2b-cargo-jogger',
            'sku' => 'AYN-JOG-001',
            'new_brand_name' => 'Alpha Industrial',
            'new_brand_logo' => '/brands/alpha.png',
            'wholesale_price' => 35.00,
            'bulk_threshold' => 100,
            'bulk_price' => 28.00,
            'full_stock_price' => 25.00,
            'moq' => 10,
            'warehouse_id' => $this->warehouse->id,
            'variants' => [
                ['color' => 'Black', 'size' => 'M', 'stock' => 100],
                ['color' => 'Black', 'size' => 'L', 'stock' => 100],
            ],
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'M', 'quantity' => 5],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 5],
                // sum = 10 === 10
            ],
        ];

        $resValid = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $validPayload);
        $resValid->assertStatus(201)
            ->assertJsonPath('data.name', 'New B2B Cargo Jogger')
            ->assertJsonPath('data.brand', 'Alpha Industrial')
            ->assertJsonPath('data.bulkThreshold', 100)
            ->assertJsonPath('data.bulkPrice', 28)
            ->assertJsonPath('data.fullStockPrice', 25);

        // Brand is now in database
        $createdBrand = Brand::where('name', 'Alpha Industrial')->first();
        $this->assertNotNull($createdBrand);
        $this->assertEquals('/brands/alpha.png', $createdBrand->logo_url);
    }
}
