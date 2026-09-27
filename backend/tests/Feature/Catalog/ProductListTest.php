<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductListTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_products_with_pagination(): void
    {
        Product::factory()->count(15)->create(['status' => 'published']);

        $response = $this->getJson('/api/v1/products?per_page=10');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'sku',
                        'brand',
                        'wholesalePrice',
                        'images',
                        'stock',
                        'variants',
                    ],
                ],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJson([
                'success' => true,
                'meta' => [
                    'current_page' => 1,
                    'per_page' => 10,
                    'total' => 15,
                    'last_page' => 2,
                ],
            ]);

        $this->assertCount(10, $response->json('data'));
    }

    public function test_can_filter_products_by_category(): void
    {
        $category1 = Category::factory()->create(['slug' => 'sweaters', 'name' => 'Sweaters']);
        $category2 = Category::factory()->create(['slug' => 'hoodies', 'name' => 'Hoodies']);

        $p1 = Product::factory()->create(['name' => 'Merino Wool Sweater', 'status' => 'published']);
        $p1->categories()->sync([$category1->id]);

        $p2 = Product::factory()->create(['name' => 'Fleece Zip Hoodie', 'status' => 'published']);
        $p2->categories()->sync([$category2->id]);

        $response = $this->getJson('/api/v1/products?category=sweaters');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($p1->id, $data[0]['id']);
    }

    public function test_can_filter_products_by_brand(): void
    {
        $nike = Brand::factory()->create(['slug' => 'nike', 'name' => 'Nike']);
        $zara = Brand::factory()->create(['slug' => 'zara', 'name' => 'Zara']);

        $p1 = Product::factory()->create(['brand_id' => $nike->id, 'name' => 'Nike Air Hoodie', 'status' => 'published']);
        $p2 = Product::factory()->create(['brand_id' => $zara->id, 'name' => 'Zara Knit Top', 'status' => 'published']);

        $response = $this->getJson('/api/v1/products?brand=nike');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($p1->id, $data[0]['id']);
    }

    public function test_can_filter_products_by_all_five_audiences_independently(): void
    {
        $audiences = ['MEN', 'WOMEN', 'BOYS', 'GIRLS', 'UNISEX'];
        $created = [];

        foreach ($audiences as $aud) {
            $created[$aud] = Product::factory()->create(['audience' => $aud, 'name' => "{$aud} Core Product", 'status' => 'published']);
        }

        foreach ($audiences as $aud) {
            $response = $this->getJson("/api/v1/products?audience={$aud}");
            $response->assertStatus(200);
            $data = $response->json('data');
            $this->assertGreaterThanOrEqual(1, count($data));
            $this->assertEquals($aud, $data[0]['audience']);
        }
    }

    public function test_can_filter_products_by_combined_audience_category_and_brand(): void
    {
        $nike = Brand::factory()->create(['slug' => 'nike', 'name' => 'Nike']);
        $adidas = Brand::factory()->create(['slug' => 'adidas', 'name' => 'Adidas']);

        $sweaters = Category::factory()->create(['slug' => 'sweaters', 'name' => 'Sweaters']);
        $hoodies = Category::factory()->create(['slug' => 'hoodies', 'name' => 'Hoodies']);

        // P1: MEN + Sweaters + Nike (The exact match)
        $p1 = Product::factory()->create(['brand_id' => $nike->id, 'audience' => 'MEN', 'name' => 'Men Nike Sweater', 'status' => 'published']);
        $p1->categories()->sync([$sweaters->id]);

        // P2: MEN + Hoodies + Nike
        $p2 = Product::factory()->create(['brand_id' => $nike->id, 'audience' => 'MEN', 'name' => 'Men Nike Hoodie', 'status' => 'published']);
        $p2->categories()->sync([$hoodies->id]);

        // P3: WOMEN + Sweaters + Nike
        $p3 = Product::factory()->create(['brand_id' => $nike->id, 'audience' => 'WOMEN', 'name' => 'Women Nike Sweater', 'status' => 'published']);
        $p3->categories()->sync([$sweaters->id]);

        // P4: MEN + Sweaters + Adidas
        $p4 = Product::factory()->create(['brand_id' => $adidas->id, 'audience' => 'MEN', 'name' => 'Men Adidas Sweater', 'status' => 'published']);
        $p4->categories()->sync([$sweaters->id]);

        // 1. Query: Audience=MEN + Category=sweaters + Brand=nike -> ONLY P1
        $resAll = $this->getJson('/api/v1/products?audience=MEN&category=sweaters&brand=nike');
        $resAll->assertStatus(200);
        $dataAll = $resAll->json('data');
        $this->assertCount(1, $dataAll);
        $this->assertEquals($p1->id, $dataAll[0]['id']);

        // 2. Query: Audience=MEN + Category=sweaters -> P1 and P4
        $resAudCat = $this->getJson('/api/v1/products?audience=MEN&category=sweaters');
        $resAudCat->assertStatus(200);
        $idsAudCat = collect($resAudCat->json('data'))->pluck('id')->all();
        $this->assertContains((string) $p1->id, array_map('strval', $idsAudCat));
        $this->assertContains((string) $p4->id, array_map('strval', $idsAudCat));
        $this->assertNotContains((string) $p2->id, array_map('strval', $idsAudCat));
        $this->assertNotContains((string) $p3->id, array_map('strval', $idsAudCat));

        // 3. Query: Category=sweaters + Brand=nike -> P1 and P3
        $resCatBrand = $this->getJson('/api/v1/products?category=sweaters&brand=nike');
        $resCatBrand->assertStatus(200);
        $idsCatBrand = collect($resCatBrand->json('data'))->pluck('id')->all();
        $this->assertContains((string) $p1->id, array_map('strval', $idsCatBrand));
        $this->assertContains((string) $p3->id, array_map('strval', $idsCatBrand));
        $this->assertNotContains((string) $p4->id, array_map('strval', $idsCatBrand));
    }

    public function test_can_filter_products_by_price_range(): void
    {
        $cheap = Product::factory()->create(['wholesale_price' => 30.00, 'status' => 'published']);
        $mid = Product::factory()->create(['wholesale_price' => 75.00, 'status' => 'published']);
        $expensive = Product::factory()->create(['wholesale_price' => 180.00, 'status' => 'published']);

        $response = $this->getJson('/api/v1/products?price_min=50&price_max=100');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($mid->id, $data[0]['id']);
    }

    public function test_can_filter_products_by_color_and_size(): void
    {
        $p1 = Product::factory()->create(['color_name' => 'Midnight Blue', 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $p1->id, 'size' => 'XL', 'color' => 'Midnight Blue']);

        $p2 = Product::factory()->create(['color_name' => 'Ruby Red', 'status' => 'published']);
        ProductVariant::factory()->create(['product_id' => $p2->id, 'size' => 'S', 'color' => 'Ruby Red']);

        $colorResponse = $this->getJson('/api/v1/products?color=Midnight');
        $colorResponse->assertStatus(200);
        $this->assertEquals($p1->id, $colorResponse->json('data.0.id'));

        $sizeResponse = $this->getJson('/api/v1/products?size=XL');
        $sizeResponse->assertStatus(200);
        $this->assertEquals($p1->id, $sizeResponse->json('data.0.id'));
    }

    public function test_can_filter_featured_and_hot_products(): void
    {
        $feat = Product::factory()->create(['is_featured' => true, 'is_hot' => false, 'status' => 'published']);
        $hot = Product::factory()->create(['is_featured' => false, 'is_hot' => true, 'status' => 'published']);

        $featResponse = $this->getJson('/api/v1/products?is_featured=true');
        $featResponse->assertStatus(200);
        $this->assertEquals($feat->id, $featResponse->json('data.0.id'));

        $hotResponse = $this->getJson('/api/v1/products?is_hot=true');
        $hotResponse->assertStatus(200);
        $this->assertEquals($hot->id, $hotResponse->json('data.0.id'));
    }

    public function test_can_sort_products(): void
    {
        $low = Product::factory()->create(['wholesale_price' => 20.00, 'status' => 'published']);
        $high = Product::factory()->create(['wholesale_price' => 200.00, 'status' => 'published']);

        $response = $this->getJson('/api/v1/products?sort=price_desc');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals($high->id, $data[0]['id']);

        $responseAsc = $this->getJson('/api/v1/products?sort=price_asc');
        $this->assertEquals($low->id, $responseAsc->json('data.0.id'));
    }

    public function test_can_search_products(): void
    {
        $p1 = Product::factory()->create(['name' => 'Premium Merino Wool Cardigan', 'status' => 'published']);
        $p2 = Product::factory()->create(['name' => 'Cotton Graphic Tee', 'status' => 'published']);

        $response = $this->getJson('/api/v1/products?q=Cardigan');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($p1->id, $data[0]['id']);
    }

    public function test_admin_can_create_update_delete_product(): void
    {
        $admin = User::factory()->admin()->create(['is_super_admin' => true]);
        $warehouse = Warehouse::create([
            'name' => 'Test Hub',
            'code' => 'WH-HUB',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);

        // Create
        $createResponse = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'New B2B Jacket',
            'slug' => 'new-b2b-jacket',
            'sku' => 'AYN-JKT-999',
            'wholesale_price' => 85.00,
            'bulk_threshold' => 100,
            'bulk_price' => 75.00,
            'full_stock_price' => 65.00,
            'moq' => 10,
            'warehouse_id' => $warehouse->id,
            'status' => 'published',
        ]);

        $createResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'New B2B Jacket',
                    'sku' => 'AYN-JKT-999',
                ],
            ]);

        $prodId = $createResponse->json('data.id');

        // Update
        $updateResponse = $this->actingAs($admin, 'sanctum')->putJson("/api/v1/products/{$prodId}", [
            'name' => 'Updated B2B Jacket',
            'wholesale_price' => 90.00,
        ]);

        $updateResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Updated B2B Jacket',
                    'wholesalePrice' => 90.00,
                ],
            ]);

        // Delete
        $deleteResponse = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/products/{$prodId}");
        $deleteResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSoftDeleted('products', ['id' => $prodId]);
    }

    public function test_non_admin_cannot_create_product(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $response = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Unauthorized Product',
            'slug' => 'unauth-prod',
            'sku' => 'UNAUTH-001',
            'wholesale_price' => 50.00,
        ]);

        $response->assertStatus(403);
    }
}
