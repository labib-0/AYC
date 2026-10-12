<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatalogPersistentReorderingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'is_super_admin' => true]);
        $this->customer = User::factory()->create(['role' => 'customer']);
    }

    public function test_admin_can_reorder_categories_persistently(): void
    {
        $cat1 = Category::factory()->create(['name' => 'Cat One', 'slug' => 'cat-one', 'sort_order' => 0]);
        $cat2 = Category::factory()->create(['name' => 'Cat Two', 'slug' => 'cat-two', 'sort_order' => 1]);
        $cat3 = Category::factory()->create(['name' => 'Cat Three', 'slug' => 'cat-three', 'sort_order' => 2]);

        Sanctum::actingAs($this->admin);

        // Move Cat Three to first, Cat One to second, Cat Two to third
        $res = $this->putJson('/api/v1/categories/reorder', [
            'orders' => [
                ['id' => $cat3->id, 'sort_order' => 0],
                ['id' => $cat1->id, 'sort_order' => 1],
                ['id' => $cat2->id, 'sort_order' => 2],
            ],
        ]);

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);

        // Verify database persistence
        $this->assertEquals(0, $cat3->fresh()->sort_order);
        $this->assertEquals(1, $cat1->fresh()->sort_order);
        $this->assertEquals(2, $cat2->fresh()->sort_order);

        // Verify index returns in authoritative sort_order
        $indexRes = $this->getJson('/api/v1/categories?all=true');
        $indexRes->assertStatus(200);
        $data = $indexRes->json('data');
        $this->assertEquals($cat3->id, $data[0]['id']);
        $this->assertEquals($cat1->id, $data[1]['id']);
        $this->assertEquals($cat2->id, $data[2]['id']);
    }

    public function test_admin_can_reorder_brands_persistently(): void
    {
        $b1 = Brand::factory()->create(['name' => 'Brand A', 'slug' => 'brand-a', 'sort_order' => 0]);
        $b2 = Brand::factory()->create(['name' => 'Brand B', 'slug' => 'brand-b', 'sort_order' => 1]);

        Sanctum::actingAs($this->admin);

        $res = $this->putJson('/api/v1/brands/reorder', [
            'orders' => [
                ['id' => $b2->id, 'sort_order' => 0],
                ['id' => $b1->id, 'sort_order' => 1],
            ],
        ]);

        $res->assertStatus(200);
        $this->assertEquals(0, $b2->fresh()->sort_order);
        $this->assertEquals(1, $b1->fresh()->sort_order);

        $indexRes = $this->getJson('/api/v1/brands?all=true');
        $indexRes->assertStatus(200);
        $data = $indexRes->json('data');
        $this->assertEquals($b2->id, $data[0]['id']);
        $this->assertEquals($b1->id, $data[1]['id']);
    }

    public function test_admin_can_reorder_products_persistently_without_modifying_business_data(): void
    {
        $p1 = Product::factory()->create([
            'name' => 'Product Alpha',
            'slug' => 'product-alpha',
            'wholesale_price' => 25.50,
            'stock' => 100,
            'moq' => 10,
            'status' => 'published',
            'sort_order' => 0,
        ]);
        $p2 = Product::factory()->create([
            'name' => 'Product Beta',
            'slug' => 'product-beta',
            'wholesale_price' => 45.00,
            'stock' => 250,
            'moq' => 20,
            'status' => 'published',
            'sort_order' => 1,
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->putJson('/api/v1/products/reorder', [
            'orders' => [
                ['id' => $p2->id, 'sort_order' => 0],
                ['id' => $p1->id, 'sort_order' => 1],
            ],
        ]);

        $res->assertStatus(200);
        $this->assertEquals(0, $p2->fresh()->sort_order);
        $this->assertEquals(1, $p1->fresh()->sort_order);

        // Crucial: Business data remains untouched
        $p1Fresh = $p1->fresh();
        $this->assertEquals('25.50', $p1Fresh->wholesale_price);
        $this->assertEquals(100, $p1Fresh->stock);
        $this->assertEquals(10, $p1Fresh->moq);
        $this->assertEquals('published', $p1Fresh->status);

        // Check index with sort=manual
        $listRes = $this->getJson('/api/v1/products?sort=manual&isAdmin=true');
        $listRes->assertStatus(200);
        $items = $listRes->json('data');
        $this->assertEquals($p2->id, $items[0]['id']);
        $this->assertEquals($p1->id, $items[1]['id']);
    }

    public function test_unauthorized_user_cannot_reorder_categories_or_brands_or_products(): void
    {
        Sanctum::actingAs($this->customer);

        $resCat = $this->putJson('/api/v1/categories/reorder', ['orders' => []]);
        $resCat->assertStatus(403);

        $resBrand = $this->putJson('/api/v1/brands/reorder', ['orders' => []]);
        $resBrand->assertStatus(403);

        $resProd = $this->putJson('/api/v1/products/reorder', ['orders' => []]);
        $resProd->assertStatus(403);
    }
}
