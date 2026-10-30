<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\HomepageFeaturedProduct;
use App\Models\Product;
use App\Models\User;
use App\Services\Cache\CatalogCacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Authoritative test suite for Storefront Featured Products ordering.
 *
 * Requirement: the storefront Featured Products section must present products
 * in the same relative sequence as the Admin → Catalog → Products manual order
 * (products.sort_order ASC). The canonical sort_order field is the single source
 * of truth for both the admin catalog list and the public storefront.
 */
class StorefrontFeaturedProductsOrderingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Brand $brand;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role'           => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::factory()->create(['name' => 'Test Brand', 'slug' => 'test-brand']);
        $this->category = Category::factory()->create(['name' => 'Apparel', 'slug' => 'apparel']);

        // Flush all catalog caches before each test so we always hit live data
        Cache::flush();
        CatalogCacheService::bumpFeaturedVersion();
    }

    /**
     * Helper: create a published, storefront-visible product with an explicit sort_order.
     */
    protected function makeProduct(string $name, int $sortOrder, array $overrides = []): Product
    {
        static $seq = 1;
        $n = $seq++;

        return Product::create(array_merge([
            'name'                    => $name,
            'slug'                    => 'prod-' . $n . '-' . str_replace(' ', '-', strtolower($name)),
            'sku'                     => 'SKU-' . str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'brand_id'                => $this->brand->id,
            'wholesale_price'         => 20.00,
            'stock'                   => 100,
            'moq'                     => 1,
            'status'                  => 'published',
            'is_hidden_from_storefront' => false,
            'sort_order'              => $sortOrder,
            'is_pinned'               => false,
            'is_featured'             => false,
            'created_at'              => now()->subSeconds(9999 - $sortOrder), // default: older = lower sort_order
        ], $overrides));
    }

    /**
     * Query the storefront featured endpoint and return the ordered list of IDs.
     */
    protected function getFeaturedIds(int $limit = 50, int $offset = 0, array $params = []): array
    {
        $query = array_merge(['limit' => $limit, 'offset' => $offset], $params);
        $response = $this->getJson('/api/v1/products/featured?' . http_build_query($query));
        $response->assertStatus(200);
        return collect($response->json('data'))->pluck('id')->all();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 1: Baby Romper at position 1 appears before Ladies Jacket at position 2
    // ──────────────────────────────────────────────────────────────────────────

    public function test_lower_sort_order_product_appears_before_higher_sort_order_product(): void
    {
        $romper = $this->makeProduct('Baby Romper', 1);
        $jacket = $this->makeProduct('Ladies Jacket', 2);

        $ids = $this->getFeaturedIds();

        $romperIdx = array_search($romper->id, $ids);
        $jacketIdx = array_search($jacket->id, $ids);

        $this->assertNotFalse($romperIdx, 'Baby Romper must be in featured list');
        $this->assertNotFalse($jacketIdx, 'Ladies Jacket must be in featured list');
        $this->assertLessThan($jacketIdx, $romperIdx, 'Baby Romper (pos 1) must appear before Ladies Jacket (pos 2)');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 2: Mens Jacket at position 10 does not appear before products at positions 1–9
    // ──────────────────────────────────────────────────────────────────────────

    public function test_product_at_position_10_does_not_precede_products_at_positions_1_through_9(): void
    {
        $products = [];
        for ($i = 1; $i <= 10; $i++) {
            $products[$i] = $this->makeProduct("Product {$i}", $i);
        }
        $mensJacket = $products[10];

        $ids = $this->getFeaturedIds();
        $jacketsIdx = array_search($mensJacket->id, $ids);

        for ($i = 1; $i <= 9; $i++) {
            $idx = array_search($products[$i]->id, $ids);
            $this->assertLessThan(
                $jacketsIdx,
                $idx,
                "Product at position {$i} must appear before Mens Jacket (pos 10)"
            );
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 3: Featured-only filtering preserves the relative order of selected products
    // ──────────────────────────────────────────────────────────────────────────

    public function test_featured_filtering_preserves_relative_admin_sort_order(): void
    {
        // Admin positions: 1, 2, 4, 5, 10 (sparse set — 3, 6, 7, 8, 9 not created for simplicity)
        $p1  = $this->makeProduct('Romper',        1);
        $p2  = $this->makeProduct('Ladies Jacket',  2);
        $p4  = $this->makeProduct('Sherpa Jacket',  4);
        $p5  = $this->makeProduct('Zara Kid',       5);
        $p10 = $this->makeProduct('Mens Jacket',   10);

        $ids = $this->getFeaturedIds();

        $positions = array_map(fn($p) => array_search($p->id, $ids), [$p1, $p2, $p4, $p5, $p10]);
        [$i1, $i2, $i4, $i5, $i10] = $positions;

        $this->assertLessThan($i2,  $i1,  'pos 1 before pos 2');
        $this->assertLessThan($i4,  $i2,  'pos 2 before pos 4');
        $this->assertLessThan($i5,  $i4,  'pos 4 before pos 5');
        $this->assertLessThan($i10, $i5,  'pos 5 before pos 10');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: Unpublished products remain excluded
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unpublished_products_are_excluded_from_featured(): void
    {
        $published = $this->makeProduct('Published Product', 1);
        $draft     = $this->makeProduct('Draft Product',     2, ['status' => 'draft']);

        $ids = $this->getFeaturedIds();

        $this->assertContains($published->id, $ids, 'Published product must be included');
        $this->assertNotContains($draft->id, $ids, 'Draft product must be excluded');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: Hidden products remain excluded
    // ──────────────────────────────────────────────────────────────────────────

    public function test_hidden_from_storefront_products_are_excluded(): void
    {
        $visible = $this->makeProduct('Visible Product', 1);
        $hidden  = $this->makeProduct('Hidden Product',  2, ['is_hidden_from_storefront' => true]);

        $ids = $this->getFeaturedIds();

        $this->assertContains($visible->id, $ids);
        $this->assertNotContains($hidden->id, $ids);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 6: Changing a product's position via API updates the storefront ordering
    // ──────────────────────────────────────────────────────────────────────────

    public function test_changing_product_position_via_api_updates_storefront_ordering(): void
    {
        // Initially: A(1), B(2), C(3)
        $a = $this->makeProduct('Product A', 1);
        $b = $this->makeProduct('Product B', 2);
        $c = $this->makeProduct('Product C', 3);

        // Verify initial storefront order: A, B, C
        $idsBefore = $this->getFeaturedIds();
        $this->assertEquals([$a->id, $b->id, $c->id], $idsBefore, 'Initial order must be A(1), B(2), C(3)');

        // Move C from position 3 to position 1 via admin API
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$c->id}/position", ['position' => 1])
            ->assertStatus(200);

        // Cache must be invalidated (bumpFeaturedVersion is called inside updatePosition)
        // Re-query the storefront
        $idsAfter = $this->getFeaturedIds();

        // Expected new order: C(1), A(2), B(3)
        $this->assertEquals([$c->id, $a->id, $b->id], $idsAfter, 'After moving C to pos 1, order must be C, A, B');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 7: Refreshing homepage does not restore the previous stale order
    // ──────────────────────────────────────────────────────────────────────────

    public function test_re_querying_featured_endpoint_after_position_change_returns_new_order(): void
    {
        $a = $this->makeProduct('Alpha', 1);
        $b = $this->makeProduct('Beta',  2);

        $idsBefore = $this->getFeaturedIds();
        $this->assertEquals([$a->id, $b->id], $idsBefore);

        // Move B to position 1
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/products/{$b->id}/position", ['position' => 1])
            ->assertStatus(200);

        // Must NOT return old order; cache was bumped by the updatePosition endpoint
        $idsAfter = $this->getFeaturedIds();
        $this->assertEquals([$b->id, $a->id], $idsAfter, 'Second query must reflect new position after cache bump');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 8: Catalog cache does not return stale ordering after bump
    // ──────────────────────────────────────────────────────────────────────────

    public function test_cache_version_bump_invalidates_stale_featured_order(): void
    {
        $first  = $this->makeProduct('First',  1);
        $second = $this->makeProduct('Second', 2);

        // Warm the cache via a first request
        $this->getFeaturedIds();

        // Manually update sort_order in DB (simulating a background reorder) and bump cache version
        Product::where('id', $first->id)->update(['sort_order' => 2]);
        Product::where('id', $second->id)->update(['sort_order' => 1]);
        CatalogCacheService::bumpFeaturedVersion();

        // Next request must pick up new order from DB, not stale cache
        $idsAfter = $this->getFeaturedIds();
        $this->assertEquals([$second->id, $first->id], $idsAfter, 'Bumped cache version must return updated order');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 9: Admin Serial No. values (sort_order) remain unchanged after the storefront fix
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_sort_order_values_are_preserved_after_featured_query(): void
    {
        $p1 = $this->makeProduct('Product 1', 1);
        $p2 = $this->makeProduct('Product 2', 2);
        $p3 = $this->makeProduct('Product 3', 3);

        // Query storefront — must NOT mutate any product records
        $this->getFeaturedIds();

        $this->assertEquals(1, $p1->fresh()->sort_order, 'sort_order of product 1 must remain 1');
        $this->assertEquals(2, $p2->fresh()->sort_order, 'sort_order of product 2 must remain 2');
        $this->assertEquals(3, $p3->fresh()->sort_order, 'sort_order of product 3 must remain 3');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 10: Existing drag-and-drop / Move Up / Down / Sort modal continue to work
    //          (verifies that product.reorder and product.position endpoints still
    //           correctly update sort_order, which the storefront then reflects)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_drag_and_drop_reorder_is_reflected_in_storefront_featured(): void
    {
        $a = $this->makeProduct('A', 1);
        $b = $this->makeProduct('B', 2);
        $c = $this->makeProduct('C', 3);

        // Simulate drag-and-drop reorder: B, A, C  (via PUT /api/v1/products/reorder)
        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/products/reorder', [
                'orders' => [
                    ['id' => $b->id, 'sort_order' => 1],
                    ['id' => $a->id, 'sort_order' => 2],
                    ['id' => $c->id, 'sort_order' => 3],
                ],
            ])
            ->assertStatus(200);

        $idsAfter = $this->getFeaturedIds();
        $this->assertEquals([$b->id, $a->id, $c->id], $idsAfter, 'Drag-and-drop reorder must be reflected in storefront order');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 11: Storefront ordering uses products.sort_order, NOT created_at
    //          (Demonstrates the root-cause fix: products uploaded later but
    //           assigned lower sort_order appear FIRST, not last)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_storefront_order_uses_sort_order_not_created_at(): void
    {
        // Create products where created_at is INVERSE of sort_order:
        // P3 was uploaded most recently but has the highest sort_order (3).
        // P1 was uploaded oldest but has the lowest sort_order (1).
        // Correct behavior: storefront shows P1, P2, P3 (by sort_order).
        // Incorrect behavior (pre-fix): storefront shows P3, P2, P1 (by created_at DESC).

        $p1 = $this->makeProduct('Old Upload, Position 1', 1, [
            'created_at' => now()->subHours(10), // oldest upload
        ]);
        $p2 = $this->makeProduct('Medium Upload, Position 2', 2, [
            'created_at' => now()->subHours(5),  // middle upload
        ]);
        $p3 = $this->makeProduct('New Upload, Position 3', 3, [
            'created_at' => now()->subHours(1),  // newest upload
        ]);

        $ids = $this->getFeaturedIds();

        $i1 = array_search($p1->id, $ids);
        $i2 = array_search($p2->id, $ids);
        $i3 = array_search($p3->id, $ids);

        $this->assertLessThan($i2, $i1, 'P1 (sort_order 1) must precede P2 (sort_order 2) regardless of upload date');
        $this->assertLessThan($i3, $i2, 'P2 (sort_order 2) must precede P3 (sort_order 3) regardless of upload date');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 12: Full sequence matches the expected admin manual order for 10 products
    //          (mirrors the production scenario described in the user request)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_full_sequence_matches_admin_manual_order_for_ten_products(): void
    {
        $names = [
            1  => 'Baby Long Sleeve Cotton Romper',
            2  => 'Ladies Jacket',
            3  => 'Ladies denim jacket',
            4  => 'MENS SHERPA JACKETS',
            5  => 'Zara Kid',
            6  => "Levi's Men's T-Shirt",
            7  => 'Ladies Long Tunic',
            8  => "Men's Twill Long Pants",
            9  => "Ladies' Thong Panties",
            10 => 'Mens Jacket',
        ];

        $products = [];
        foreach ($names as $pos => $name) {
            // created_at is intentionally reverse of sort_order to prove ordering uses sort_order
            $products[$pos] = $this->makeProduct($name, $pos, [
                'created_at' => now()->subSeconds(10 - $pos), // pos 1 = oldest, pos 10 = newest
            ]);
        }

        $ids = $this->getFeaturedIds(10);

        // Must exactly match admin manual sequence
        $expectedIds = array_values(array_map(fn($p) => $p->id, $products));
        $this->assertEquals($expectedIds, $ids, 'Storefront order must exactly match the 10-product admin manual sequence');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 13: Pinned products respect sort_order — same as non-pinned
    // ──────────────────────────────────────────────────────────────────────────

    public function test_pinned_products_follow_sort_order_not_pinned_order(): void
    {
        // Create products: pinned products have higher sort_order than non-pinned
        // Old behavior would put pinned first; new behavior uses sort_order only.
        $unpinned = $this->makeProduct('Unpinned First',  1, [
            'is_pinned'   => false,
            'is_featured' => false,
        ]);
        $pinned = $this->makeProduct('Pinned Second', 2, [
            'is_pinned'           => true,
            'is_featured'         => true,
            'pinned_order'        => 1,
            'featured_sort_order' => 1,
        ]);
        HomepageFeaturedProduct::create([
            'product_id' => $pinned->id,
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        $ids = $this->getFeaturedIds();

        $unpinnedIdx = array_search($unpinned->id, $ids);
        $pinnedIdx   = array_search($pinned->id, $ids);

        // Unpinned has sort_order 1 → must appear before pinned with sort_order 2
        $this->assertLessThan(
            $pinnedIdx,
            $unpinnedIdx,
            'Unpinned product with lower sort_order must appear before pinned product with higher sort_order'
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 14: Pagination preserves sort_order continuity across pages
    // ──────────────────────────────────────────────────────────────────────────

    public function test_pagination_preserves_sort_order_continuity(): void
    {
        // Create 10 products with sort_order 1..10
        $products = [];
        for ($i = 1; $i <= 10; $i++) {
            $products[$i] = $this->makeProduct("Product {$i}", $i);
        }

        // Page 1: first 5
        $page1Ids = $this->getFeaturedIds(limit: 5, offset: 0);
        // Page 2: next 5
        $page2Ids = $this->getFeaturedIds(limit: 5, offset: 5);

        $this->assertCount(5, $page1Ids);
        $this->assertCount(5, $page2Ids);

        // Verify continuity: page 1 items are positions 1-5, page 2 items are positions 6-10
        for ($i = 1; $i <= 5; $i++) {
            $this->assertEquals(
                $products[$i]->id,
                $page1Ids[$i - 1],
                "Page 1 item {$i} must be product at admin position {$i}"
            );
        }
        for ($i = 6; $i <= 10; $i++) {
            $this->assertEquals(
                $products[$i]->id,
                $page2Ids[$i - 6],
                "Page 2 item " . ($i - 5) . " must be product at admin position {$i}"
            );
        }
    }
}

