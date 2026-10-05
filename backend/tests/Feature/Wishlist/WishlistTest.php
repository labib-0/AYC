<?php

namespace Tests\Feature\Wishlist;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private function createCustomer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ], $attributes));
    }

    private function createAdmin(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
        ], $attributes));
    }

    private function createVisibleProduct(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'name' => 'Premium Cotton Polo',
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 25.00,
            'stock' => 100,
            'moq' => 10,
            'is_sold_out' => false,
        ], $attributes));
    }

    public function test_authenticated_customer_can_retrieve_wishlist(): void
    {
        $user = $this->createCustomer();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/wishlist');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'user_id',
                    'items_count',
                    'items',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user_id' => (string) $user->id,
                    'items_count' => 0,
                ],
            ]);
    }

    public function test_in_stock_product_can_be_wishlisted(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct(['stock' => 50]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', [
            'product_id' => $product->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user_id' => (string) $user->id,
                    'items_count' => 1,
                    'items' => [
                        [
                            'product_id' => (string) $product->id,
                            'product' => [
                                'name' => $product->name,
                                'in_stock' => true,
                                'is_sold_out' => false,
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_out_of_stock_product_can_be_wishlisted(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct(['stock' => 0]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', [
            'product_id' => $product->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'items_count' => 1,
                    'items' => [
                        [
                            'product_id' => (string) $product->id,
                            'product' => [
                                'in_stock' => false,
                                'stock' => 0,
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_admin_selected_sold_out_product_can_be_wishlisted(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct([
            'is_sold_out' => true,
            'stock' => 100, // Even if stock > 0, marked SOLD OUT
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', [
            'product_id' => $product->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'items_count' => 1,
                    'items' => [
                        [
                            'product_id' => (string) $product->id,
                            'product' => [
                                'is_sold_out' => true,
                                'isSoldOut' => true,
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_wishlist_product_with_zero_inventory_remains_visible_in_wishlist(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct(['stock' => 0]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/wishlist');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'items_count' => 1,
                    'items' => [
                        [
                            'product_id' => (string) $product->id,
                            'product' => [
                                'name' => $product->name,
                                'in_stock' => false,
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_wishlist_product_becoming_out_of_stock_after_being_wishlisted_remains_in_wishlist(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct(['stock' => 50]);

        // 1. Wishlist while in stock
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        // 2. Product runs out of stock
        $product->update(['stock' => 0]);

        // 3. Must still be present in wishlist
        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/wishlist');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'items_count' => 1,
                    'items' => [
                        [
                            'product_id' => (string) $product->id,
                            'product' => [
                                'name' => $product->name,
                                'in_stock' => false,
                                'stock' => 0,
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_out_of_stock_wishlist_item_cannot_be_added_to_cart(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct(['stock' => 0]);

        // Add to wishlist succeeds
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        // Attempting to add to cart fails
        $cartResponse = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $cartResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'INSUFFICIENT_STOCK',
            ]);
    }

    public function test_sold_out_wishlist_item_cannot_be_purchased_or_added_to_cart(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct([
            'is_sold_out' => true,
            'stock' => 50,
        ]);

        // Add to wishlist succeeds
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        // Attempting to add to cart fails
        $cartResponse = $this->actingAs($user, 'sanctum')->postJson('/api/v1/cart', [
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $cartResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'PRODUCT_SOLD_OUT',
            ]);
    }

    public function test_remove_unavailable_product_from_wishlist_succeeds(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct([
            'is_sold_out' => true,
            'stock' => 0,
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        $deleteResponse = $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/wishlist/{$product->id}");

        $deleteResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'items_count' => 0,
                ],
            ]);
    }

    public function test_duplicate_wishlist_item_is_prevented_and_toggle_works(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct();

        // First add
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);
        // Duplicate add request
        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        $res->assertStatus(201);
        $this->assertEquals(1, $res->json('data.items_count'));

        // Verify database has exactly 1 row
        $wishlist = Wishlist::where('user_id', $user->id)->first();
        $this->assertEquals(1, $wishlist->items()->where('product_id', $product->id)->count());

        // Toggle removes it
        $toggleRes1 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/toggle', ['product_id' => $product->id]);
        $toggleRes1->assertStatus(200);
        $this->assertEquals(0, $toggleRes1->json('data.items_count'));
        $this->assertEquals(0, $wishlist->items()->where('product_id', $product->id)->count());

        // Toggle adds it back
        $toggleRes2 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/toggle', ['product_id' => $product->id]);
        $toggleRes2->assertStatus(200);
        $this->assertEquals(1, $toggleRes2->json('data.items_count'));
        $this->assertEquals(1, $wishlist->items()->where('product_id', $product->id)->count());
    }

    public function test_guest_cannot_access_or_modify_wishlist_api(): void
    {
        $product = $this->createVisibleProduct();

        $this->getJson('/api/v1/wishlist')->assertStatus(401);
        $this->postJson('/api/v1/wishlist', ['product_id' => $product->id])->assertStatus(401);
        $this->postJson('/api/v1/wishlist/toggle', ['product_id' => $product->id])->assertStatus(401);
        $this->deleteJson("/api/v1/wishlist/{$product->id}")->assertStatus(401);
    }

    public function test_admin_cannot_access_customer_wishlist_api(): void
    {
        $admin = $this->createAdmin();
        $product = $this->createVisibleProduct();

        $this->actingAs($admin, 'sanctum')->getJson('/api/v1/wishlist')->assertStatus(403);
        $this->actingAs($admin, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id])->assertStatus(403);
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/wishlist/{$product->id}")->assertStatus(403);
    }

    public function test_archived_or_hidden_product_follows_storefront_visibility(): void
    {
        $user = $this->createCustomer();

        // 1. Draft product cannot be wishlisted
        $draftProduct = Product::factory()->create([
            'status' => 'draft',
            'wholesale_price' => 20.00,
        ]);
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => $draftProduct->id])
            ->assertStatus(404);

        // 2. Hidden product cannot be wishlisted
        $hiddenProduct = Product::factory()->create([
            'status' => 'published',
            'is_hidden_from_storefront' => true,
            'wholesale_price' => 20.00,
        ]);
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => $hiddenProduct->id])
            ->assertStatus(404);

        // 3. Product with no valid price cannot be wishlisted
        $unpricedProduct = Product::factory()->create([
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 0.00,
        ]);
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/wishlist', ['product_id' => $unpricedProduct->id])
            ->assertStatus(404);

        // 4. If an in-stock product was wishlisted and subsequently archived, it is filtered from storefront retrieval
        $visibleProduct = $this->createVisibleProduct();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $visibleProduct->id])->assertStatus(201);

        $visibleProduct->update(['status' => 'archived']);

        $res = $this->actingAs($user, 'sanctum')->getJson('/api/v1/wishlist');
        $res->assertStatus(200);
        $this->assertEquals(0, $res->json('data.items_count'));
    }

    public function test_wishlist_count_includes_unavailable_products(): void
    {
        $user = $this->createCustomer();

        $inStockProduct = $this->createVisibleProduct(['stock' => 50, 'is_sold_out' => false]);
        $soldOutProduct = $this->createVisibleProduct(['stock' => 0, 'is_sold_out' => true]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $inStockProduct->id]);
        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $soldOutProduct->id]);

        $res->assertStatus(201);
        $this->assertEquals(2, $res->json('data.items_count'));

        $getRes = $this->actingAs($user, 'sanctum')->getJson('/api/v1/wishlist');
        $getRes->assertStatus(200);
        $this->assertEquals(2, $getRes->json('data.items_count'));
        $this->assertCount(2, $getRes->json('data.items'));
    }
}
