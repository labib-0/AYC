<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    public function definition(): array
    {
        $size = fake()->randomElement(['S', 'M', 'L', 'XL', '2XL']);
        $color = fake()->safeColorName();

        return [
            'product_id' => Product::factory(),
            'sku' => 'AYN-VAR-' . strtoupper(fake()->unique()->lexify('??????')),
            'title' => "Variant {$size} - {$color}",
            'size' => $size,
            'color' => $color,
            'option_summary' => "Size: {$size}, Color: {$color}",
            'price' => null,
            'stock' => fake()->numberBetween(10, 200),
            'is_default' => false,
            'is_active' => true,
        ];
    }
}
