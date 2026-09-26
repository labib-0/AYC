<?php

namespace Tests\Feature\Wishlist;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_retrieve_wishlist(): void
    {
        $user = User::factory()->create();

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

    public function test_authenticated_user_can_add_product_to_wishlist(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['name' => 'Cashmere Scarf']);

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
                                'name' => 'Cashmere Scarf',
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_duplicate_wishlist_item_is_prevented(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wishlist', ['product_id' => $product->id]);

        $response->assertStatus(201);
        $this->assertEquals(1, $response->json('data.items_count'));
    }

    public function test_authenticated_user_can_remove_product_from_wishlist(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

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

    public function test_unauthenticated_user_cannot_access_wishlist(): void
    {
        $response = $this->getJson('/api/v1/wishlist');
        $response->assertStatus(401);
    }
}
