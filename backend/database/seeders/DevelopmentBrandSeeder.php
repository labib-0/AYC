<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class DevelopmentBrandSeeder extends Seeder
{
    /**
     * Run the development brand database seeds.
     */
    public function run(): void
    {
        $brands = [
            [
                'name' => 'Ayaan Private Label',
                'slug' => 'ayaan',
                'website' => 'https://ayaanclothing.com',
                'logo_url' => '/logo.png',
                'sort_order' => 1,
            ],
            [
                'name' => 'Aura Atelier',
                'slug' => 'aura-atelier',
                'website' => 'https://aura-atelier.example',
                'logo_url' => '/brands/generic.png',
                'sort_order' => 2,
            ],
            [
                'name' => 'North Peak Outerwear',
                'slug' => 'north-peak',
                'website' => 'https://northpeak.example',
                'logo_url' => '/brands/the-north-face.svg',
                'sort_order' => 3,
            ],
            [
                'name' => 'Luxe Knitwear Co.',
                'slug' => 'luxe-knitwear',
                'website' => 'https://luxeknitwear.example',
                'logo_url' => '/brands/generic.png',
                'sort_order' => 4,
            ],
            [
                'name' => 'Urban Stride',
                'slug' => 'urban-stride',
                'website' => 'https://urbanstride.example',
                'logo_url' => '/brands/nike.svg',
                'sort_order' => 5,
            ],
            [
                'name' => 'Terra Forma Denim',
                'slug' => 'terra-forma',
                'website' => 'https://terraforma.example',
                'logo_url' => '/brands/levis.svg',
                'sort_order' => 6,
            ],
            [
                'name' => 'Oasis Linen & Silk',
                'slug' => 'oasis-linen',
                'website' => 'https://oasislinen.example',
                'logo_url' => '/brands/generic.png',
                'sort_order' => 7,
            ],
            [
                'name' => 'Ventus Sportswear',
                'slug' => 'ventus-sport',
                'website' => 'https://ventussport.example',
                'logo_url' => '/brands/puma.svg',
                'sort_order' => 8,
            ],
            [
                'name' => 'Summit & Ridge',
                'slug' => 'summit-ridge',
                'website' => 'https://summitridge.example',
                'logo_url' => '/brands/columbia.svg',
                'sort_order' => 9,
            ],
            [
                'name' => 'Cotton Craft',
                'slug' => 'cotton-craft',
                'website' => 'https://cottoncraft.example',
                'logo_url' => '/brands/uniqlo.svg',
                'sort_order' => 10,
            ],
            [
                'name' => 'Riviera Beachwear',
                'slug' => 'riviera-beach',
                'website' => 'https://rivierabeach.example',
                'logo_url' => '/brands/generic.png',
                'sort_order' => 11,
            ],
            [
                'name' => 'Tailor & Thread',
                'slug' => 'tailor-thread',
                'website' => 'https://tailorthread.example',
                'logo_url' => '/brands/zara.svg',
                'sort_order' => 12,
            ],
        ];

        foreach ($brands as $data) {
            Brand::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'website' => $data['website'],
                    'logo_url' => $data['logo_url'],
                    'sort_order' => $data['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
