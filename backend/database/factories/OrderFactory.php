<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 50, 500);
        $shipping = $subtotal > 150 ? 0.00 : 15.00;
        $tax = round($subtotal * 0.05, 2);
        $total = round($subtotal + $shipping + $tax, 2);

        return [
            'order_number' => 'AYN-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
            'user_id' => User::factory(),
            'status' => fake()->randomElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
            'payment_status' => fake()->randomElement(['pending', 'paid', 'refunded']),
            'fulfillment_status' => fake()->randomElement(['unfulfilled', 'processing', 'shipped', 'delivered']),
            'currency' => 'USD',
            'subtotal' => $subtotal,
            'shipping_cost' => $shipping,
            'tax_amount' => $tax,
            'discount_amount' => 0.00,
            'total_amount' => $total,
            'email' => fake()->safeEmail(),
            'shipping_name' => fake()->name(),
            'shipping_phone' => fake()->phoneNumber(),
            'shipping_address1' => fake()->streetAddress(),
            'shipping_city' => fake()->city(),
            'shipping_region' => fake()->state(),
            'shipping_postal_code' => fake()->postcode(),
            'shipping_country_code' => 'US',
            'payment_method' => fake()->randomElement(['card', 'transfer', 'cod']),
            'placed_at' => now(),
        ];
    }
}
