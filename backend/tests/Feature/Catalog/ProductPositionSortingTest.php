<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductPositionSortingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected Brand $brand;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'is_super_admin' => true]);
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->brand = Brand::factory()->create(['name' => 'Test Brand']);
        $this->category = Category::factory()->create(['name' => 'Test Category']);
    }

    /**
     * Helper to create N sequential products with 1-based sort_order (1 to N).
     *
     * @return Product[]
     */
    protected function createSequentialProducts(int $count): array
    {
        $products = [];
        for ($i = 1; $i <= $count; $i++) {
            $products[] = Product::create([
                'name' => "Product {$i}",
                'slug' => "product-{$i}",
                'sku' => "SKU-" . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'product_id' => "PID-" . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'brand_id' => $this->brand->id,
                'category_id' => $this->category->id,
                'wholesale_price' => 20.00,
                'stock' => 100,
                'moq' => 1,
                'status' => 'published',
                'sort_order' => $i,
                'is_pinned' => false,
                'is_featured' => false,
            ]);
        }
        return $products;
    }

    /**
     * Case 1: Move a product from position 12 to position 3.
     */
    public function test_move_product_from_position_12_to_position_3(): void
    {
        $products = $this->createSequentialProducts(15);
        $targetProduct = $products[11]; // Product 12 (0-indexed 11, pos 12)

        Sanctum::actingAs($this->admin);

        $res = $this->putJson("/api/v1/products/{$targetProduct->id}/position", [
            'position' => 3,
        ]);

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('data.previous_position', 12);
        $res->assertJsonPath('data.current_position', 3);

        // Verification:
        // Product 12 is now position 3
        $this->assertEquals(3, $targetProduct->fresh()->sort_order);

        // Products 1 and 2 remain at positions 1 and 2
        $this->assertEquals(1, $products[0]->fresh()->sort_order);
        $this->assertEquals(2, $products[1]->fresh()->sort_order);

        // Products 3 to 11 shifted to 4 to 12
        $this->assertEquals(4, $products[2]->fresh()->sort_order); // Product 3 -> pos 4
        $this->assertEquals(5, $products[3]->fresh()->sort_order); // Product 4 -> pos 5
        $this->assertEquals(12, $products[10]->fresh()->sort_order); // Product 11 -> pos 12

        // Products 13 to 15 remain unchanged
        $this->assertEquals(13, $products[12]->fresh()->sort_order);
        $this->assertEquals(14, $products[13]->fresh()->sort_order);
        $this->assertEquals(15, $products[14]->fresh()->sort_order);

        // Verify index ordering
        $listRes = $this->getJson('/api/v1/products?sort=manual&isAdmin=true&all=true');
        $listRes->assertStatus(200);
        $items = $listRes->json('data');
        $this->assertEquals($targetProduct->id, $items[2]['id']); // 3rd item (index 2)
    }

    /**
     * Case 2: Move a product from position 3 to position 12.
     */
    public function test_move_product_from_position_3_to_position_12(): void
    {
        $products = $this->createSequentialProducts(15);
        $targetProduct = $products[2]; // Product 3 (pos 3)

        Sanctum::actingAs($this->admin);

        $res = $this->putJson("/api/v1/products/{$targetProduct->id}/position", [
            'position' => 12,
        ]);

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('data.previous_position', 3);
        $res->assertJsonPath('data.current_position', 12);

        // Verification:
        // Product 3 is now position 12
        $this->assertEquals(12, $targetProduct->fresh()->sort_order);

        // Products 1 and 2 remain at positions 1 and 2
        $this->assertEquals(1, $products[0]->fresh()->sort_order);
        $this->assertEquals(2, $products[1]->fresh()->sort_order);

        // Products 4 to 12 shifted to 3 to 11
        $this->assertEquals(3, $products[3]->fresh()->sort_order); // Product 4 -> pos 3
        $this->assertEquals(11, $products[11]->fresh()->sort_order); // Product 12 -> pos 11

        // Products 13 to 15 remain unchanged
        $this->assertEquals(13, $products[12]->fresh()->sort_order);
        $this->assertEquals(14, $products[13]->fresh()->sort_order);
        $this->assertEquals(15, $products[14]->fresh()->sort_order);
    }

    /**
     * Case 3: Move the first product to the last position.
     */
    public function test_move_first_product_to_last_position(): void
    {
        $products = $this->createSequentialProducts(5);
        $firstProduct = $products[0]; // Product 1 (pos 1)

        Sanctum::actingAs($this->admin);

        $res = $this->putJson("/api/v1/products/{$firstProduct->id}/position", [
            'position' => 5,
        ]);

        $res->assertStatus(200);
        $this->assertEquals(5, $firstProduct->fresh()->sort_order);

        // Products 2 to 5 shifted to 1 to 4
        $this->assertEquals(1, $products[1]->fresh()->sort_order);
        $this->assertEquals(2, $products[2]->fresh()->sort_order);
        $this->assertEquals(3, $products[3]->fresh()->sort_order);
        $this->assertEquals(4, $products[4]->fresh()->sort_order);
    }

    /**
     * Case 4: Move the last product to the first position.
     */
    public function test_move_last_product_to_first_position(): void
    {
        $products = $this->createSequentialProducts(5);
        $lastProduct = $products[4]; // Product 5 (pos 5)

        Sanctum::actingAs($this->admin);

        $res = $this->putJson("/api/v1/products/{$lastProduct->id}/position", [
            'position' => 1,
        ]);

        $res->assertStatus(200);
        $this->assertEquals(1, $lastProduct->fresh()->sort_order);

        // Products 1 to 4 shifted to 2 to 5
        $this->assertEquals(2, $products[0]->fresh()->sort_order);
        $this->assertEquals(3, $products[1]->fresh()->sort_order);
        $this->assertEquals(4, $products[2]->fresh()->sort_order);
        $this->assertEquals(5, $products[3]->fresh()->sort_order);
    }

    /**
     * Case 5: Move a product to its existing position.
     */
    public function test_move_product_to_existing_position(): void
    {
        $products = $this->createSequentialProducts(5);
        $product3 = $products[2]; // Product 3 (pos 3)

        Sanctum::actingAs($this->admin);

        $res = $this->putJson("/api/v1/products/{$product3->id}/position", [
            'position' => 3,
        ]);

        $res->assertStatus(200);
        $this->assertEquals(3, $product3->fresh()->sort_order);
        $this->assertStringContainsString('already at position 3', $res->json('message'));
    }

    /**
     * Case 6: Submit empty, negative, zero, or out-of-range position.
     */
    public function test_submit_invalid_positions_rejected(): void
    {
        $products = $this->createSequentialProducts(5);
        $target = $products[0];

        Sanctum::actingAs($this->admin);

        // Empty position
        $resEmpty = $this->putJson("/api/v1/products/{$target->id}/position", []);
        $resEmpty->assertStatus(422);

        // Negative position
        $resNeg = $this->putJson("/api/v1/products/{$target->id}/position", ['position' => -1]);
        $resNeg->assertStatus(422);

        // Zero position
        $resZero = $this->putJson("/api/v1/products/{$target->id}/position", ['position' => 0]);
        $resZero->assertStatus(422);

        // Out of range (> total count of 5)
        $resOut = $this->putJson("/api/v1/products/{$target->id}/position", ['position' => 6]);
        $resOut->assertStatus(422);

        // Non-integer position
        $resStr = $this->putJson("/api/v1/products/{$target->id}/position", ['position' => 'three']);
        $resStr->assertStatus(422);
    }

    /**
     * Case 7: Missing product returns 404.
     */
    public function test_missing_product_returns_404(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->putJson('/api/v1/products/999999/position', ['position' => 1]);
        $res->assertStatus(404);
    }

    /**
     * Case 8: Unauthorized non-admin user is rejected with 403.
     */
    public function test_unauthorized_user_cannot_change_position(): void
    {
        $products = $this->createSequentialProducts(3);
        Sanctum::actingAs($this->customer);

        $res = $this->putJson("/api/v1/products/{$products[0]->id}/position", ['position' => 2]);
        $res->assertStatus(403);
    }

    /**
     * Case 9: Pinned products ordering scope is strictly respected.
     */
    public function test_pinned_and_unpinned_ordering_scope(): void
    {
        $pinned1 = Product::create([
            'name' => 'Pinned 1',
            'slug' => 'pinned-1',
            'sku' => 'PIN-1',
            'product_id' => 'PID-P1',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 20.00,
            'stock' => 10,
            'moq' => 1,
            'status' => 'published',
            'sort_order' => 1,
            'is_pinned' => true,
            'is_featured' => true,
            'pinned_order' => 1,
            'featured_sort_order' => 1,
        ]);
        $pinned2 = Product::create([
            'name' => 'Pinned 2',
            'slug' => 'pinned-2',
            'sku' => 'PIN-2',
            'product_id' => 'PID-P2',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 20.00,
            'stock' => 10,
            'moq' => 1,
            'status' => 'published',
            'sort_order' => 2,
            'is_pinned' => true,
            'is_featured' => true,
            'pinned_order' => 2,
            'featured_sort_order' => 2,
        ]);
        $unpinned1 = Product::create([
            'name' => 'Unpinned 1',
            'slug' => 'unpinned-1',
            'sku' => 'UNP-1',
            'product_id' => 'PID-U1',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'wholesale_price' => 20.00,
            'stock' => 10,
            'moq' => 1,
            'status' => 'published',
            'sort_order' => 3,
            'is_pinned' => false,
            'is_featured' => false,
        ]);

        Sanctum::actingAs($this->admin);

        // Unpinned product cannot jump into pinned group (positions 1..2)
        $resIllegal = $this->putJson("/api/v1/products/{$unpinned1->id}/position", ['position' => 1]);
        $resIllegal->assertStatus(422);

        // Pinned product cannot jump into unpinned group (> 2)
        $resIllegalPinned = $this->putJson("/api/v1/products/{$pinned1->id}/position", ['position' => 3]);
        $resIllegalPinned->assertStatus(422);

        // Pinned products can reorder within pinned group (pos 1 to pos 2)
        $resPinnedSwap = $this->putJson("/api/v1/products/{$pinned1->id}/position", ['position' => 2]);
        $resPinnedSwap->assertStatus(200);
        $this->assertEquals(2, $pinned1->fresh()->sort_order);
        $this->assertEquals(1, $pinned2->fresh()->sort_order);
    }
}

