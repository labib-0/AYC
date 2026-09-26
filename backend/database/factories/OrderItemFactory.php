<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    public function definition(): array
    {
        $qty = fake()->numberBetween(1, 5);
        $price = fake()->randomFloat(2, 20, 100);

        return [
            'order_id' => Order::factory(),
            'product_id' => Product::factory(),
            'product_name' => fake()->words(3, true),
            'product_slug' => fake()->slug(),
            'sku' => 'AYN-' . strtoupper(fake()->lexify('??????')),
            'size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            'unit_price' => $price,
            'quantity' => $qty,
            'line_total' => round($price * $qty, 2),
        ];
    }
}
