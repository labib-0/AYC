<?php

namespace Tests\Feature\Documents;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Services\Documents\DocumentHelper;
use App\Services\Documents\OfferSheetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfferSheetGalleryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaanclothing.com',
            'role' => 'admin',
        ]);

        $this->customer = User::factory()->create([
            'email' => 'buyer@example.com',
            'role' => 'customer',
            'company_name' => 'Nordic Retail Group',
        ]);
    }

    /**
     * Test 1: Product with 1 image -> returns exactly 1 image
     */
    public function test_product_with_single_image(): void
    {
        $product = Product::factory()->create();
        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/solo.jpg',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        $gallery = DocumentHelper::getProductGallery($product, 'https://ayaanclothing.com/storage/products/solo.jpg');

        $this->assertCount(1, $gallery);
        $this->assertEquals('https://ayaanclothing.com/storage/products/solo.jpg', $gallery[0]);
    }

    /**
     * Test 2: Product with 3+ unique images -> returns all images in exact sort order with primary first
     */
    public function test_product_with_multiple_images_authoritative_order(): void
    {
        $product = Product::factory()->create();

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/side.jpg',
            'sort_order' => 1,
            'is_primary' => false,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/primary.jpg',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/back.jpg',
            'sort_order' => 2,
            'is_primary' => false,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/detail.jpg',
            'sort_order' => 3,
            'is_primary' => false,
        ]);

        $gallery = DocumentHelper::getProductGallery($product);

        $this->assertCount(4, $gallery);
        $this->assertEquals('https://ayaanclothing.com/storage/products/primary.jpg', $gallery[0], 'Primary image must be first');
        $this->assertEquals('https://ayaanclothing.com/storage/products/side.jpg', $gallery[1]);
        $this->assertEquals('https://ayaanclothing.com/storage/products/back.jpg', $gallery[2]);
        $this->assertEquals('https://ayaanclothing.com/storage/products/detail.jpg', $gallery[3]);
    }

    /**
     * Test 3: Deduplication handles relative vs absolute vs domain URLs for the same image
     */
    public function test_gallery_deduplicates_url_variations(): void
    {
        $product = Product::factory()->create();

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/jacket.jpg',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'products/jacket.jpg',
            'sort_order' => 1,
            'is_primary' => false,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/jacket-back.jpg',
            'sort_order' => 2,
            'is_primary' => false,
        ]);

        // Fallback is also a duplicate variant of the primary image
        $gallery = DocumentHelper::getProductGallery($product, 'http://localhost:8000/storage/products/jacket.jpg');

        $this->assertCount(2, $gallery, 'All variants of jacket.jpg must be deduplicated into 1 + 1 unique jacket-back.jpg');
    }

    /**
     * Test 4: Product with no media returns empty array
     */
    public function test_product_with_no_media_returns_empty_array(): void
    {
        $product = Product::factory()->create();

        $gallery = DocumentHelper::getProductGallery($product, null);

        $this->assertEmpty($gallery, 'Should return empty array when product has no images');
    }

    /**
     * Test 5: OfferSheetService generateForOrder produces authoritative product_gallery
     */
    public function test_offer_sheet_service_generates_order_document_with_gallery(): void
    {
        $product = Product::factory()->create([
            'name' => 'Premium Export Hoodie',
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/hoodie-front.jpg',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        ProductImage::create([
            'product_id' => $product->id,
            'image_url' => 'https://ayaanclothing.com/storage/products/hoodie-back.jpg',
            'sort_order' => 1,
            'is_primary' => false,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'shipping_name' => 'John Doe',
            'email' => 'buyer@example.com',
            'order_number' => 'ORD-TEST-998877',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku ?: 'AYN-HOD-01',
            'product_image_url' => 'https://ayaanclothing.com/storage/products/hoodie-front.jpg',
            'quantity' => 50,
            'unit_price' => 20.00,
            'line_total' => 1000.00,
        ]);

        $order->load('items');

        $service = new OfferSheetService();
        $doc = $service->generateForOrder($order);

        $this->assertEquals('ORDER_SHEET', $doc['docType']);
        $this->assertNotEmpty($doc['product_gallery']);
        $this->assertCount(2, $doc['product_gallery']);
        $this->assertEquals('https://ayaanclothing.com/storage/products/hoodie-front.jpg', $doc['product_gallery'][0]);
        $this->assertEquals('https://ayaanclothing.com/storage/products/hoodie-back.jpg', $doc['product_gallery'][1]);
    }
}
