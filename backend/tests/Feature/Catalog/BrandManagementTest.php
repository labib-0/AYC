<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BrandManagementTest extends TestCase
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

    public function test_guest_or_customer_only_receives_active_brands_even_with_all_param(): void
    {
        Brand::factory()->create(['name' => 'Active Brand', 'slug' => 'active-brand', 'is_active' => true]);
        Brand::factory()->create(['name' => 'Inactive Brand', 'slug' => 'inactive-brand', 'is_active' => false]);

        // Guest with ?all=true
        $guestRes = $this->getJson('/api/v1/brands?all=true');
        $guestRes->assertStatus(200);
        $this->assertCount(1, $guestRes->json('data'));
        $this->assertEquals('active-brand', $guestRes->json('data.0.slug'));

        // Customer with ?all=true
        Sanctum::actingAs($this->customer);
        $custRes = $this->getJson('/api/v1/brands?all=true');
        $custRes->assertStatus(200);
        $this->assertCount(1, $custRes->json('data'));
        $this->assertEquals('active-brand', $custRes->json('data.0.slug'));
    }

    public function test_admin_can_view_all_brands_when_requested(): void
    {
        Brand::factory()->create(['name' => 'Active Brand', 'slug' => 'active-brand', 'is_active' => true]);
        Brand::factory()->create(['name' => 'Inactive Brand', 'slug' => 'inactive-brand', 'is_active' => false]);

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/v1/brands?all=true');
        $res->assertStatus(200);
        $this->assertCount(2, $res->json('data'));
    }

    public function test_admin_can_create_brand_with_auto_generated_slug(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->postJson('/api/v1/brands', [
            'name' => 'Loro Piana Fabrics',
            'website' => 'https://loropiana.com',
            'logo_url' => '/brands/loro-piana.png',
            'sort_order' => 12,
        ]);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Loro Piana Fabrics',
                    'slug' => 'loro-piana-fabrics',
                    'sort_order' => 12,
                    'is_active' => true,
                ],
            ]);

        $this->assertDatabaseHas('brands', [
            'name' => 'Loro Piana Fabrics',
            'slug' => 'loro-piana-fabrics',
        ]);
    }

    public function test_safe_delete_blocks_deletion_when_brand_has_products(): void
    {
        Sanctum::actingAs($this->admin);

        $brand = Brand::factory()->create(['name' => 'Nike', 'slug' => 'nike']);
        Product::factory()->create(['brand_id' => $brand->id]);

        $res = $this->deleteJson("/api/v1/brands/{$brand->id}");
        $res->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertDatabaseHas('brands', ['id' => $brand->id]);
    }

    public function test_clean_brand_without_products_can_be_deleted(): void
    {
        Sanctum::actingAs($this->admin);

        $brand = Brand::factory()->create(['name' => 'Temporary Test Brand', 'slug' => 'temp-test-brand']);

        $res = $this->deleteJson("/api/v1/brands/{$brand->id}");
        $res->assertStatus(200);

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
    }

    public function test_customer_cannot_modify_brands(): void
    {
        Sanctum::actingAs($this->customer);

        $createRes = $this->postJson('/api/v1/brands', ['name' => 'Hacked Brand']);
        $createRes->assertStatus(403);

        $brand = Brand::factory()->create(['name' => 'Valid Brand', 'slug' => 'valid-brand']);
        $deleteRes = $this->deleteJson("/api/v1/brands/{$brand->id}");
        $deleteRes->assertStatus(403);
    }
}
