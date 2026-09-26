<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_fetch_product_by_slug_and_id(): void
    {
        $brand = Brand::factory()->create(['name' => 'Ayaan Lux']);
        $product = Product::factory()->create([
            'brand_id' => $brand->id,
            'name' => 'Luxury Knit Sweater',
            'slug' => 'luxury-knit-sweater',
            'status' => 'published',
        ]);

        ProductVariant::factory()->count(3)->create(['product_id' => $product->id]);
        ProductImage::factory()->count(2)->create(['product_id' => $product->id]);

        // By slug
        $responseSlug = $this->getJson('/api/v1/products/luxury-knit-sweater');
        $responseSlug->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => (string) $product->id,
                    'slug' => 'luxury-knit-sweater',
                    'name' => 'Luxury Knit Sweater',
                    'brand' => 'Ayaan Lux',
                ],
            ]);

        $this->assertCount(3, $responseSlug->json('data.variants'));
        $this->assertCount(2, $responseSlug->json('data.images'));

        // By ID
        $responseId = $this->getJson('/api/v1/products/' . $product->id);
        $responseId->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => (string) $product->id,
                ],
            ]);

        // By /slug/{slug} alias
        $responseAlias = $this->getJson('/api/v1/products/slug/luxury-knit-sweater');
        $responseAlias->assertStatus(200);
    }

    public function test_nonexistent_product_returns_404(): void
    {
        $response = $this->getJson('/api/v1/products/non-existent-product-12345');
        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Product not found',
            ]);
    }
}
