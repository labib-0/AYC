<?php

namespace Database\Factories;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Brand>
 */
class BrandFactory extends Factory
{
    protected $model = Brand::class;

    public function definition(): array
    {
        $name = fake()->unique()->company();
        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'logo_url' => 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=400',
            'website' => fake()->url(),
            'is_active' => true,
        ];
    }
}
