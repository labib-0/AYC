<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);
        return [
            'name' => ucwords($name),
            'slug' => Str::slug($name),
            'description' => fake()->sentence(),
            'image_url' => 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800',
            'accent_color' => fake()->hexColor(),
            'sort_order' => fake()->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
