<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_active_brands_with_product_counts(): void
    {
        $b1 = Brand::factory()->create(['name' => 'Nike', 'slug' => 'nike', 'is_active' => true]);
        $b2 = Brand::factory()->create(['name' => 'Inactive Brand', 'is_active' => false]);

        Product::factory()->create(['brand_id' => $b1->id]);

        $response = $this->getJson('/api/v1/brands');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Nike', $data[0]['name']);
        $this->assertEquals(1, $data[0]['products_count']);
    }

    public function test_can_fetch_brand_by_slug(): void
    {
        Brand::factory()->create(['name' => 'Zara', 'slug' => 'zara']);

        $response = $this->getJson('/api/v1/brands/zara');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Zara',
                    'slug' => 'zara',
                ],
            ]);
    }
}
