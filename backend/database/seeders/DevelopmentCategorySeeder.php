<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class DevelopmentCategorySeeder extends Seeder
{
    /**
     * Run the development category database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'T-Shirts',
                'slug' => 't-shirts',
                'image_url' => 'https://images.pexels.com/photos/7658459/pexels-photo-7658459.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Heavyweight, oversized, and organic cotton basic & graphic tees',
                'accent_color' => '#3B82F6',
                'sort_order' => 1,
            ],
            [
                'name' => 'Polo Shirts',
                'slug' => 'polo-shirts',
                'image_url' => 'https://images.pexels.com/photos/8217415/pexels-photo-8217415.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Piqué combed cotton athletic & corporate polos with ribbed collars',
                'accent_color' => '#0284C7',
                'sort_order' => 2,
            ],
            [
                'name' => 'Shirts',
                'slug' => 'shirts',
                'image_url' => 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Oxford cotton button-down, linen resort, and formal business shirts',
                'accent_color' => '#14B8A6',
                'sort_order' => 3,
            ],
            [
                'name' => 'Hoodies',
                'slug' => 'hoodies',
                'image_url' => 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'French terry fleece, tech bonded, and heavyweight streetwear hoodies',
                'accent_color' => '#10B981',
                'sort_order' => 4,
            ],
            [
                'name' => 'Sweaters',
                'slug' => 'sweaters',
                'image_url' => 'https://images.pexels.com/photos/15694151/pexels-photo-15694151.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Merino wool, cashmere, and cable-knit winter pullovers',
                'accent_color' => '#8B5CF6',
                'sort_order' => 5,
            ],
            [
                'name' => 'Jeans',
                'slug' => 'pants',
                'image_url' => 'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Selvedge raw denim, tapered fit, and stretch washed jeans',
                'accent_color' => '#6366F1',
                'sort_order' => 6,
            ],
            [
                'name' => 'Trousers',
                'slug' => 'trousers',
                'image_url' => 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Executive tailored wool chinos, pleated trousers, and joggers',
                'accent_color' => '#F59E0B',
                'sort_order' => 7,
            ],
            [
                'name' => 'Jackets',
                'slug' => 'jackets',
                'image_url' => 'https://images.pexels.com/photos/19490409/pexels-photo-19490409.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Denim trucker jackets, bomber jackets, and insulated winter outerwear',
                'accent_color' => '#475569',
                'sort_order' => 8,
            ],
            [
                'name' => 'Blouse',
                'slug' => 'blouse',
                'image_url' => 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&q=80&w=800',
                'description' => 'Mulberry silk, chiffon, and formal executive tops',
                'accent_color' => '#A855F7',
                'sort_order' => 9,
            ],
            [
                'name' => 'Tops',
                'slug' => 'tops',
                'image_url' => 'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Ribbed knit, linen casual, and summer sleeveless tops',
                'accent_color' => '#64748B',
                'sort_order' => 10,
            ],
            [
                'name' => 'Sportswear',
                'slug' => 'activewear',
                'image_url' => 'https://images.pexels.com/photos/37451174/pexels-photo-37451174.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Dry-fit moisture wicking athletic apparel and training garments',
                'accent_color' => '#DC2626',
                'sort_order' => 11,
            ],
            [
                'name' => 'Beachwear',
                'slug' => 'beachwear',
                'image_url' => 'https://images.pexels.com/photos/2215609/pexels-photo-2215609.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Quick-dry swim trunks, board shorts, and resort cover-ups',
                'accent_color' => '#06B6D4',
                'sort_order' => 12,
            ],
            [
                'name' => 'Knitwear',
                'slug' => 'knitwear',
                'image_url' => 'https://images.pexels.com/photos/35145462/pexels-photo-35145462.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                'description' => 'Structured cardigans, fine gauge knit vests, and woven knitwear',
                'accent_color' => '#D97706',
                'sort_order' => 13,
            ],
            [
                'name' => 'Socks',
                'slug' => 'socks',
                'image_url' => 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=800',
                'description' => 'Cushioned athletic crew, ankle, and compression thermal socks',
                'accent_color' => '#F97316',
                'sort_order' => 14,
            ],
        ];

        foreach ($categories as $data) {
            Category::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'image_url' => $data['image_url'],
                    'description' => $data['description'],
                    'accent_color' => $data['accent_color'],
                    'sort_order' => $data['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
