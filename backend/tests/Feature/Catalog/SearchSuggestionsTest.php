<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_search_suggestions(): void
    {
        Product::factory()->create(['name' => 'Cotton Hoodie', 'status' => 'published']);
        Category::factory()->create(['name' => 'Hoodies', 'slug' => 'hoodies']);
        Brand::factory()->create(['name' => 'H&M', 'slug' => 'hm']);

        $response = $this->getJson('/api/v1/search/suggestions?q=Hoo');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'products',
                    'categories',
                    'brands',
                ],
            ]);

        $this->assertNotEmpty($response->json('data.products'));
        $this->assertNotEmpty($response->json('data.categories'));
    }

    public function test_empty_search_query_returns_empty_arrays(): void
    {
        $response = $this->getJson('/api/v1/search/suggestions');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'products' => [],
                    'categories' => [],
                    'brands' => [],
                ],
            ]);
    }
}
