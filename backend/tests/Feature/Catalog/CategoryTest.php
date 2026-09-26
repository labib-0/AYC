<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_active_categories_with_product_counts(): void
    {
        $cat1 = Category::factory()->create(['name' => 'Sweaters', 'slug' => 'sweaters', 'is_active' => true]);
        $cat2 = Category::factory()->create(['name' => 'Inactive Category', 'is_active' => false]);

        $product = Product::factory()->create();
        $product->categories()->sync([$cat1->id]);

        $response = $this->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Sweaters', $data[0]['name']);
        $this->assertEquals(1, $data[0]['products_count']);
    }

    public function test_can_fetch_category_by_slug(): void
    {
        $cat = Category::factory()->create(['name' => 'Hoodies', 'slug' => 'hoodies']);

        $response = $this->getJson('/api/v1/categories/hoodies');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Hoodies',
                    'slug' => 'hoodies',
                ],
            ]);
    }
}
