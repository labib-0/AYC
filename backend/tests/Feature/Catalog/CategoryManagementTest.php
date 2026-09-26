<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->customer = User::factory()->create(['role' => 'customer']);
    }

    public function test_guest_or_customer_only_receives_active_categories_even_with_all_param(): void
    {
        Category::factory()->create(['name' => 'Active Sweaters', 'slug' => 'active-sweaters', 'is_active' => true]);
        Category::factory()->create(['name' => 'Inactive Jackets', 'slug' => 'inactive-jackets', 'is_active' => false]);

        // Guest with ?all=true
        $guestRes = $this->getJson('/api/v1/categories?all=true');
        $guestRes->assertStatus(200);
        $this->assertCount(1, $guestRes->json('data'));
        $this->assertEquals('active-sweaters', $guestRes->json('data.0.slug'));

        // Customer with ?all=true
        Sanctum::actingAs($this->customer);
        $custRes = $this->getJson('/api/v1/categories?all=true');
        $custRes->assertStatus(200);
        $this->assertCount(1, $custRes->json('data'));
        $this->assertEquals('active-sweaters', $custRes->json('data.0.slug'));
    }

    public function test_admin_can_view_all_categories_when_requested(): void
    {
        Category::factory()->create(['name' => 'Active Cat', 'slug' => 'active-cat', 'is_active' => true]);
        Category::factory()->create(['name' => 'Inactive Cat', 'slug' => 'inactive-cat', 'is_active' => false]);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/v1/categories?all=true');
        $res->assertStatus(200);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_admin_can_create_category_with_auto_generated_slug(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->postJson('/api/v1/categories', [
            'name' => 'Vintage Corduroy Pants',
            'description' => 'Heavyweight ribbed corduroy trousers',
            'image_url' => 'https://example.com/corduroy.jpg',
            'sort_order' => 5,
        ]);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Vintage Corduroy Pants',
                    'slug' => 'vintage-corduroy-pants',
                    'sort_order' => 5,
                    'is_active' => true,
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'name' => 'Vintage Corduroy Pants',
            'slug' => 'vintage-corduroy-pants',
        ]);
    }

    public function test_circular_parent_hierarchy_is_prevented(): void
    {
        Sanctum::actingAs($this->admin);

        $parent = Category::factory()->create(['name' => 'Apparel', 'slug' => 'apparel']);
        $child = Category::factory()->create(['name' => 'Men', 'slug' => 'men', 'parent_id' => $parent->id]);

        // Attempt to make parent its own parent
        $selfRes = $this->putJson("/api/v1/categories/{$parent->id}", [
            'parent_id' => $parent->id,
        ]);
        $selfRes->assertStatus(422);

        // Attempt to make parent's parent its own child (circular)
        $circRes = $this->putJson("/api/v1/categories/{$parent->id}", [
            'parent_id' => $child->id,
        ]);
        $circRes->assertStatus(422);
    }

    public function test_safe_delete_blocks_deletion_when_category_has_products(): void
    {
        Sanctum::actingAs($this->admin);

        $cat = Category::factory()->create(['name' => 'Sweaters', 'slug' => 'sweaters']);
        $product = Product::factory()->create();
        $product->categories()->sync([$cat->id]);

        $res = $this->deleteJson("/api/v1/categories/{$cat->id}");
        $res->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertDatabaseHas('categories', ['id' => $cat->id]);
    }

    public function test_safe_delete_blocks_deletion_when_category_has_children(): void
    {
        Sanctum::actingAs($this->admin);

        $parent = Category::factory()->create(['name' => 'Outerwear', 'slug' => 'outerwear']);
        Category::factory()->create(['name' => 'Parkas', 'slug' => 'parkas', 'parent_id' => $parent->id]);

        $res = $this->deleteJson("/api/v1/categories/{$parent->id}");
        $res->assertStatus(422);

        $this->assertDatabaseHas('categories', ['id' => $parent->id]);
    }

    public function test_clean_category_without_products_or_children_can_be_deleted(): void
    {
        Sanctum::actingAs($this->admin);

        $cat = Category::factory()->create(['name' => 'Temporary Test Cat', 'slug' => 'temp-test-cat']);

        $res = $this->deleteJson("/api/v1/categories/{$cat->id}");
        $res->assertStatus(200);

        $this->assertDatabaseMissing('categories', ['id' => $cat->id]);
    }

    public function test_customer_cannot_modify_categories(): void
    {
        Sanctum::actingAs($this->customer);

        $createRes = $this->postJson('/api/v1/categories', ['name' => 'Hacked Cat']);
        $createRes->assertStatus(403);

        $cat = Category::factory()->create(['name' => 'Valid Cat', 'slug' => 'valid-cat']);
        $deleteRes = $this->deleteJson("/api/v1/categories/{$cat->id}");
        $deleteRes->assertStatus(403);
    }
}
