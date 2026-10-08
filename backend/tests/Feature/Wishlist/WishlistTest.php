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

    public function test_customer_can_bulk_add_multiple_eligible_wishlist_items_to_cart(): void
    {
        $user = $this->createCustomer();

        $prod1 = $this->createVisibleProduct(['name' => 'Product 1', 'stock' => 100, 'moq' => 10]);
        $prod2 = $this->createVisibleProduct(['name' => 'Product 2', 'stock' => 80, 'moq' => 5]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $prod1->id]);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $prod2->id]);

        $wishlist = Wishlist::where('user_id', $user->id)->first();
        $itemIds = $wishlist->items->pluck('id')->all();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => $itemIds,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'added_count' => 2,
                    'unavailable_count' => 0,
                ],
            ]);

        // Items must remain in wishlist
        $this->assertEquals(2, $wishlist->fresh()->items()->count());

        // Check active cart items and quantities (MOQ respected: 10 + 5 = 15)
        $cart = \App\Models\Cart::where('user_id', $user->id)->first();
        $this->assertNotNull($cart);
        $this->assertEquals(2, $cart->items()->count());
        $this->assertEquals(15, (int) $cart->items()->sum('quantity'));
    }

    public function test_bulk_add_supports_partial_success_and_skips_unavailable_products(): void
    {
        $user = $this->createCustomer();

        $prodAvailable1 = $this->createVisibleProduct(['name' => 'Item A (Available)', 'stock' => 50, 'moq' => 10]);
        $prodAvailable2 = $this->createVisibleProduct(['name' => 'Item B (Available)', 'stock' => 50, 'moq' => 5]);
        $prodSoldOut = $this->createVisibleProduct(['name' => 'Item C (Sold Out)', 'stock' => 50, 'is_sold_out' => true]);
        $prodOutOfStock = $this->createVisibleProduct(['name' => 'Item D (Out of Stock)', 'stock' => 0, 'is_sold_out' => false]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $prodAvailable1->id]);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $prodAvailable2->id]);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $prodSoldOut->id]);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $prodOutOfStock->id]);

        $wishlist = Wishlist::where('user_id', $user->id)->first();
        $itemIds = $wishlist->items->pluck('id')->all();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => $itemIds,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'added_count' => 2,
                    'unavailable_count' => 2,
                ],
            ]);

        $this->assertStringContainsString('2 products added to cart', $response->json('message'));
        $this->assertStringContainsString('2 products are currently unavailable', $response->json('message'));

        // All 4 products must still be in wishlist
        $this->assertEquals(4, $wishlist->fresh()->items()->count());

        // Cart should contain only the 2 available products
        $cart = \App\Models\Cart::where('user_id', $user->id)->first();
        $this->assertEquals(2, $cart->items()->count());
    }

    public function test_backend_authoritative_revalidation_when_stock_depletes(): void
    {
        $user = $this->createCustomer();

        $product = $this->createVisibleProduct(['stock' => 20, 'moq' => 10]);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        $wishlist = Wishlist::where('user_id', $user->id)->first();
        $itemId = $wishlist->items->first()->id;

        // Stock depleted by another customer or admin
        $product->update(['stock' => 0]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => [$itemId],
        ]);

        // Operation should report unavailable and not add to cart
        $response->assertStatus(200)
            ->assertJson([
                'success' => false,
                'data' => [
                    'added_count' => 0,
                    'unavailable_count' => 1,
                ],
            ]);

        $cart = \App\Models\Cart::where('user_id', $user->id)->first();
        $this->assertTrue(!$cart || $cart->items()->count() === 0);
    }

    public function test_inventory_restoration_allows_bulk_add_to_cart(): void
    {
        $user = $this->createCustomer();

        $product = $this->createVisibleProduct(['stock' => 0, 'moq' => 10]);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        $wishlist = Wishlist::where('user_id', $user->id)->first();
        $itemId = $wishlist->items->first()->id;

        // Inventory is replenished
        $product->update(['stock' => 100]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => [$itemId],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'added_count' => 1,
                    'unavailable_count' => 0,
                ],
            ]);

        $cart = \App\Models\Cart::where('user_id', $user->id)->first();
        $this->assertEquals(1, $cart->items()->count());
        $this->assertEquals(10, (int) $cart->items()->first()->quantity);
    }

    public function test_customer_isolation_customer_a_cannot_add_customer_b_wishlist_items(): void
    {
        $customerA = $this->createCustomer(['email' => 'customerA@example.com']);
        $customerB = $this->createCustomer(['email' => 'customerB@example.com']);

        $product = $this->createVisibleProduct(['stock' => 50, 'moq' => 10]);

        // Customer B wishlists the product
        $this->actingAs($customerB, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);
        $wishlistB = Wishlist::where('user_id', $customerB->id)->first();
        $itemBId = $wishlistB->items->first()->id;

        // Customer A attempts to add Customer B's wishlist item ID
        $response = $this->actingAs($customerA, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => [$itemBId],
        ]);

        // Must fail to add to Customer A's cart and report in failed items
        $response->assertStatus(200)
            ->assertJson([
                'success' => false,
                'data' => [
                    'added_count' => 0,
                    'failed' => [
                        [
                            'id' => $itemBId,
                        ],
                    ],
                ],
            ]);

        // Customer A's cart remains empty
        $cartA = \App\Models\Cart::where('user_id', $customerA->id)->first();
        $this->assertTrue(!$cartA || $cartA->items()->count() === 0);
    }

    public function test_adding_existing_cart_item_from_wishlist_increments_quantity(): void
    {
        $user = $this->createCustomer();
        $product = $this->createVisibleProduct(['stock' => 100, 'moq' => 10]);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);
        $wishlist = Wishlist::where('user_id', $user->id)->first();
        $itemId = $wishlist->items->first()->id;

        // First add: adds 10 MOQ units
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => [$itemId],
        ])->assertStatus(200);

        // Second add: should increment to 20 without duplicating rows
        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist/add-selected-to-cart', [
            'wishlist_item_ids' => [$itemId],
        ]);

        $res->assertStatus(200)->assertJson(['success' => true]);

        $cart = \App\Models\Cart::where('user_id', $user->id)->first();
        $this->assertEquals(1, $cart->items()->count());
        $this->assertEquals(20, (int) $cart->items()->first()->quantity);
    }
}

