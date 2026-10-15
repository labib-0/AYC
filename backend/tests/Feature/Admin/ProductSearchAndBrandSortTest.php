<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSearchAndBrandSortTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'role' => 'customer',
            'is_super_admin' => false,
        ]);
    }

    /**
     * Test 1: Searching by brand name returns all products associated with that brand,
     * even when brand name does not appear in product title, description, SKU, or supplier.
     */
    public function test_admin_product_search_by_brand_name(): void
    {
        $leeBrand = Brand::factory()->create(['name' => 'LEE', 'slug' => 'lee', 'is_active' => true]);
        $zaraBrand = Brand::factory()->create(['name' => 'Zara', 'slug' => 'zara', 'is_active' => true]);

        $leeProduct = Product::factory()->create([
            'name' => 'Denim Rider Jacket',
            'sku' => 'DNM-JKT-001',
            'brand_id' => $leeBrand->id,
            'status' => 'published',
        ]);

        $zaraProduct = Product::factory()->create([
            'name' => 'Classic Cotton Chino',
            'sku' => 'CHN-COT-002',
            'brand_id' => $zaraBrand->id,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=LEE&isAdmin=true&all=true');

        $response->assertStatus(200);
        $data = $response->json('data');

        $ids = array_column($data, 'id');
        $this->assertContains($leeProduct->id, $ids);
        $this->assertNotContains($zaraProduct->id, $ids);
    }

    /**
     * Test 2: Searching by exact SKU returns the correct product.
     */
    public function test_admin_product_search_by_exact_sku(): void
    {
        $p1 = Product::factory()->create([
            'name' => 'Oversized Hoodie',
            'sku' => 'AYN-OVS-HD-100',
            'status' => 'published',
        ]);

        $p2 = Product::factory()->create([
            'name' => 'Slim Fit Denim',
            'sku' => 'AYN-SLM-DN-200',
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=AYN-OVS-HD-100&isAdmin=true&all=true');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($p1->id, $data[0]['id']);
    }

    /**
     * Test 3: Searching by partial SKU returns expected matches.
     */
    public function test_admin_product_search_by_partial_sku(): void
    {
        $p1 = Product::factory()->create([
            'name' => 'Oversized Hoodie',
            'sku' => 'AYN-PARTIAL-101',
            'status' => 'published',
        ]);

        $p2 = Product::factory()->create([
            'name' => 'Basic T-Shirt',
            'sku' => 'TSH-SIMPLE-202',
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=PARTIAL&isAdmin=true&all=true');

        $response->assertStatus(200);
        $data = $response->json('data');

        $ids = array_column($data, 'id');
        $this->assertContains($p1->id, $ids);
        $this->assertNotContains($p2->id, $ids);
    }

    /**
     * Test 4: Searching by variant SKU returns the parent product.
     */
    public function test_admin_product_search_by_variant_sku(): void
    {
        $parent = Product::factory()->create([
            'name' => 'Varsity Bomber Jacket',
            'sku' => 'VRS-JKT-BASE',
            'status' => 'published',
        ]);

        ProductVariant::create([
            'product_id' => $parent->id,
            'sku' => 'VRS-VAR-BLK-XL',
            'title' => 'Black / XL',
            'price' => 1200,
            'stock' => 50,
            'is_active' => true,
        ]);

        $other = Product::factory()->create([
            'name' => 'Linen Casual Shirt',
            'sku' => 'LIN-CSL-100',
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=VAR-BLK-XL&isAdmin=true&all=true');

        $response->assertStatus(200);
        $data = $response->json('data');

        $ids = array_column($data, 'id');
        $this->assertContains($parent->id, $ids);
        $this->assertNotContains($other->id, $ids);
    }

    /**
     * Test 5: Searching by Product ID and internal supplier name works for Admins.
     */
    public function test_admin_product_search_by_product_id_and_supplier(): void
    {
        $supplier = Supplier::create([
            'name' => 'Dhaka Textile Mills Ltd',
            'code' => 'SUP-DTM-01',
            'is_active' => true,
        ]);

        $p1 = Product::factory()->create([
            'name' => 'Flannel Plaid Shirt',
            'product_id' => 'PRD-FLN-777',
            'supplier_id' => $supplier->id,
            'supplier_name' => 'Dhaka Textile Mills Ltd',
            'status' => 'published',
        ]);

        // Search by product_id
        $resProdId = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=PRD-FLN-777&isAdmin=true&all=true');
        $resProdId->assertStatus(200);
        $this->assertContains($p1->id, array_column($resProdId->json('data'), 'id'));

        // Search by numeric primary key
        $resNumericId = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/products?search={$p1->id}&isAdmin=true&all=true");
        $resNumericId->assertStatus(200);
        $this->assertContains($p1->id, array_column($resNumericId->json('data'), 'id'));

        // Search by supplier name
        $resSupplier = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=Dhaka+Textile&isAdmin=true&all=true');
        $resSupplier->assertStatus(200);
        $this->assertContains($p1->id, array_column($resSupplier->json('data'), 'id'));
    }

    /**
     * Test 6: Empty search query restores the complete unfiltered catalog.
     */
    public function test_empty_search_restores_complete_catalog(): void
    {
        Product::factory()->count(3)->create(['status' => 'published']);

        $resEmpty = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=&isAdmin=true&all=true');

        $resEmpty->assertStatus(200);
        $this->assertCount(3, $resEmpty->json('data'));
    }

    /**
     * Test 7: Search works cleanly in combination with status and category filters.
     */
    public function test_search_works_with_existing_filters(): void
    {
        $category = Category::factory()->create(['name' => 'Denim', 'slug' => 'denim']);

        $publishedDenim = Product::factory()->create([
            'name' => 'Selvedge Heavyweight Jeans',
            'sku' => 'SLV-001',
            'status' => 'published',
        ]);
        $publishedDenim->categories()->attach($category->id);

        $draftDenim = Product::factory()->create([
            'name' => 'Selvedge Regular Jeans',
            'sku' => 'SLV-002',
            'status' => 'draft',
        ]);
        $draftDenim->categories()->attach($category->id);

        // Search "Selvedge" + status=published
        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/products?search=Selvedge&status=published&category=denim&isAdmin=true&all=true');

        $res->assertStatus(200);
        $ids = array_column($res->json('data'), 'id');
        $this->assertContains($publishedDenim->id, $ids);
        $this->assertNotContains($draftDenim->id, $ids);
    }

    /**
     * Test 8: Non-admin search does not leak internal supplier names or unpublished products.
     */
    public function test_non_admin_search_does_not_expose_draft_or_supplier(): void
    {
        $supplier = Supplier::create([
            'name' => 'Secret Mill Ltd',
            'code' => 'SUP-SEC-99',
            'is_active' => true,
        ]);

        Product::factory()->create([
            'name' => 'Draft Secret Garment',
            'supplier_name' => 'Secret Mill Ltd',
            'supplier_id' => $supplier->id,
            'status' => 'draft',
        ]);

        // Customer searches by supplier name
        $response = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/products?search=Secret+Mill');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    /**
     * Test 9: Brand listing endpoint supports alphabetical sorting with original casing preserved.
     */
    public function test_brand_index_supports_alphabetical_sorting(): void
    {
        Brand::factory()->create(['name' => 'zara', 'sort_order' => 1, 'is_active' => true]);
        Brand::factory()->create(['name' => 'Armani', 'sort_order' => 2, 'is_active' => true]);
        Brand::factory()->create(['name' => 'adidas', 'sort_order' => 3, 'is_active' => true]);
        Brand::factory()->create(['name' => 'Nike', 'sort_order' => 4, 'is_active' => true]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/brands?sort=alphabetical&all=true');

        $response->assertStatus(200);
        $names = array_column($response->json('data'), 'name');

        // Case-insensitive alphabetical order: adidas, Armani, Nike, zara
        $this->assertEquals(['adidas', 'Armani', 'Nike', 'zara'], $names);
    }

    /**
     * Test 10: Homepage brand search endpoint returns results in case-insensitive alphabetical order.
     */
    public function test_homepage_brand_search_is_alphabetical(): void
    {
        Brand::factory()->create(['name' => 'Zara Man', 'is_active' => true]);
        Brand::factory()->create(['name' => 'Aura Atelier', 'is_active' => true]);
        Brand::factory()->create(['name' => 'benetton', 'is_active' => true]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/homepage/search-brands');

        $response->assertStatus(200);
        $items = $response->json('data.items');
        $names = array_column($items, 'name');

        $this->assertEquals(['Aura Atelier', 'benetton', 'Zara Man'], $names);
    }
}
