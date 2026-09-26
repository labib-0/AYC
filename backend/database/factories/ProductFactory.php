<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);
        $wholesalePrice = fake()->randomFloat(2, 20, 200);

        return [
            'brand_id' => Brand::factory(),
            'name' => ucwords($name),
            'slug' => Str::slug($name) . '-' . fake()->unique()->numberBetween(100, 999),
            'sku' => 'AYN-' . strtoupper(fake()->unique()->lexify('???-???')),
            'short_description' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'material' => '100% Cotton',
            'color_name' => fake()->safeColorName(),
            'color_hex' => fake()->hexColor(),
            'audience' => fake()->randomElement(['MEN', 'WOMEN', 'BOYS', 'GIRLS', 'UNISEX']),
            'product_type' => 'Apparel',
            'collection_season' => '2026 Core Collection',
            'wholesale_price' => $wholesalePrice,
            'msrp_price' => $wholesalePrice * 1.6,
            'cost_price' => $wholesalePrice * 0.6,
            'moq' => 1,
            'status' => 'published',
            'is_featured' => fake()->boolean(20),
            'is_hot' => fake()->boolean(20),
            'is_new' => fake()->boolean(20),
            'is_limited_deal' => false,
            'is_best_deal' => false,
            'weight_grams' => fake()->numberBetween(150, 600),
        ];
    }

    public function featured(): static
    {
        return $this->state(fn () => ['is_featured' => true]);
    }

    public function hot(): static
    {
        return $this->state(fn () => ['is_hot' => true]);
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => 'draft']);
    }
}
