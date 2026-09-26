<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductPackageAllocation;
use App\Models\ProductPricingTier;
use App\Models\ProductShippingPackageProfile;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class DevelopmentProductSeeder extends Seeder
{
    /**
     * Run the development product & inventory database seeds.
     */
    public function run(): void
    {
        $warehouse = Warehouse::where('code', 'WH-UTTARA-01')->first() 
            ?? Warehouse::create([
                'code' => 'WH-UTTARA-01',
                'name' => 'Uttara Warehouse',
                'address_line_1' => 'House #33, Road #12, Sector #11, Uttara',
                'city' => 'Dhaka',
                'country_code' => 'BD',
                'is_active' => true,
            ]);

        // Define 32 comprehensive fashion export products
        $catalog = [
            // MEN (10)
            [
                'name' => 'Men\'s Luxury Merino Wool Knit Sweater',
                'slug' => 'mens-luxury-merino-wool-knit-sweater',
                'sku' => 'AYN-DEMO-001',
                'brand_slug' => 'ayaan',
                'category_slug' => 'sweaters',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => '100% Australian Merino Wool with ribbed cuffs and tailored fit.',
                'description' => 'Crafted from ultra-fine 19.5-micron Australian Merino wool, this knit sweater delivers superior warmth, breathability, and natural temperature regulation for premium export markets.',
                'material' => '100% Merino Wool',
                'color_name' => 'Charcoal Heather',
                'color_hex' => '#2A2E33',
                'wholesale_price' => 145.00,
                'msrp_price' => 220.00,
                'cost_price' => 65.00,
                'moq' => 5,
                'is_featured' => true,
                'is_hot' => true,
                'is_new' => true,
                'stock_type' => 'normal', // 120 per variant
                'sizes' => ['S', 'M', 'L', 'XL', 'XXL'],
                'images' => [
                    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Men\'s Heavyweight 240GSM Cotton Boxy Tee',
                'slug' => 'mens-heavyweight-240gsm-cotton-boxy-tee',
                'sku' => 'AYN-DEMO-002',
                'brand_slug' => 'urban-stride',
                'category_slug' => 't-shirts',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => '240GSM combed organic cotton with dropped shoulders.',
                'description' => 'Export-grade streetwear heavyweight t-shirt. High-density combed cotton with reinforced double-needle seams to resist washing shrinkage and color fade.',
                'material' => '100% Combed Organic Cotton',
                'color_name' => 'Bone White',
                'color_hex' => '#F4F1EA',
                'wholesale_price' => 28.00,
                'msrp_price' => 55.00,
                'cost_price' => 11.50,
                'moq' => 10,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 200 per variant
                'sizes' => ['S', 'M', 'L', 'XL', 'XXL'],
                'images' => [
                    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Men\'s Tech-Fleece Bonded Pullover Hoodie',
                'slug' => 'mens-tech-fleece-bonded-pullover-hoodie',
                'sku' => 'AYN-DEMO-003',
                'brand_slug' => 'north-peak',
                'category_slug' => 'hoodies',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Double-faced spacer fleece with concealed side zip pockets.',
                'description' => 'Technical lightweight thermal hoodie. Ergonomic paneling allows unrestricted mobility while maintaining heat retention without bulk.',
                'material' => '66% Cotton, 34% Polyester Tech Fleece',
                'color_name' => 'Heather Slate',
                'color_hex' => '#475569',
                'wholesale_price' => 65.00,
                'msrp_price' => 110.00,
                'cost_price' => 32.00,
                'moq' => 10,
                'is_featured' => true,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 80 per variant
                'sizes' => ['S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Men\'s Tailored Wool-Blend Chino Trousers',
                'slug' => 'mens-tailored-wool-blend-chino-trousers',
                'sku' => 'AYN-DEMO-004',
                'brand_slug' => 'tailor-thread',
                'category_slug' => 'trousers',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Pleated slim-straight trousers in stretch wool blend.',
                'description' => 'Executive business trousers engineered with stretch flex yarn, hidden waistband fasteners, and double-welt rear pockets for corporate buyers.',
                'material' => '70% Wool, 28% Polyester, 2% Elastane',
                'color_name' => 'Midnight Navy',
                'color_hex' => '#1E293B',
                'wholesale_price' => 54.00,
                'msrp_price' => 95.00,
                'cost_price' => 24.00,
                'moq' => 10,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 90 per variant
                'sizes' => ['30', '32', '34', '36', '38'],
                'images' => [
                    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Men\'s Raw Selvedge 14oz Denim Jeans',
                'slug' => 'mens-raw-selvedge-14oz-denim-jeans',
                'sku' => 'AYN-DEMO-005',
                'brand_slug' => 'terra-forma',
                'category_slug' => 'pants',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_MASTER_COPY,
                'short_description' => '14oz shuttle-loom red-line selvedge denim.',
                'description' => 'Unwashed Japanese loom selvedge denim designed for authentic wear fade lines. Features copper rivets, button fly, and chain-stitched hems.',
                'material' => '100% Selvedge Cotton Denim',
                'color_name' => 'Raw Indigo',
                'color_hex' => '#0F172A',
                'wholesale_price' => 78.00,
                'msrp_price' => 160.00,
                'cost_price' => 38.00,
                'moq' => 10,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 60 per variant
                'sizes' => ['30', '32', '34', '36'],
                'images' => [
                    'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Men\'s Piqué Combed Cotton Classic Polo',
                'slug' => 'mens-pique-combed-cotton-classic-polo',
                'sku' => 'AYN-DEMO-006',
                'brand_slug' => 'cotton-craft',
                'category_slug' => 'polo-shirts',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Breathable honeycomb piqué knit with mother-of-pearl buttons.',
                'description' => 'Refined executive polo shirt crafted from 100% long-staple combed cotton piqué. Retains collar crispness across repeated laundering cycles.',
                'material' => '100% Combed Cotton Piqué',
                'color_name' => 'Forest Green',
                'color_hex' => '#14532D',
                'wholesale_price' => 32.00,
                'msrp_price' => 65.00,
                'cost_price' => 14.00,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 150 per variant
                'sizes' => ['S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.pexels.com/photos/8217415/pexels-photo-8217415.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Men\'s Sherpa-Lined Corduroy Trucker Jacket',
                'slug' => 'mens-sherpa-lined-corduroy-trucker-jacket',
                'sku' => 'AYN-DEMO-007',
                'brand_slug' => 'summit-ridge',
                'category_slug' => 'jackets',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Heavy wale corduroy with high-pile sherpa thermal lining.',
                'description' => 'Rugged heritage outerwear jacket featuring 8-wale cotton corduroy exterior and plush sherpa insulation inside collar and body.',
                'material' => '100% Cotton Corduroy, Sherpa Lining',
                'color_name' => 'Caramel Brown',
                'color_hex' => '#9A3412',
                'wholesale_price' => 95.00,
                'msrp_price' => 195.00,
                'cost_price' => 45.00,
                'moq' => 5,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'low', // Low stock sample (< MOQ: stock = 2)
                'sizes' => ['M', 'L', 'XL'],
                'images' => [
                    'https://images.pexels.com/photos/19490409/pexels-photo-19490409.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Men\'s Oxford Cotton Button-Down Shirt',
                'slug' => 'mens-oxford-cotton-button-down-shirt',
                'sku' => 'AYN-DEMO-008',
                'brand_slug' => 'tailor-thread',
                'category_slug' => 'shirts',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Garment-washed basketweave Oxford cloth.',
                'description' => 'Timeless staple shirt with structured button-down collar and box pleat. Pre-shrunk finish for soft handfeel straight out of packaging.',
                'material' => '100% Oxford Cotton',
                'color_name' => 'Sky Blue',
                'color_hex' => '#38BDF8',
                'wholesale_price' => 38.00,
                'msrp_price' => 80.00,
                'cost_price' => 17.50,
                'moq' => 15,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 110 per variant
                'sizes' => ['S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Men\'s Quick-Dry Engineered Swim Trunks',
                'slug' => 'mens-quick-dry-engineered-swim-trunks',
                'sku' => 'AYN-DEMO-009',
                'brand_slug' => 'riviera-beach',
                'category_slug' => 'beachwear',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Water-repellent 4-way stretch fabric with mesh lining.',
                'description' => 'Lightweight resort board shorts featuring hydrophobic coating, elastic drawcord waistband, and zip back pocket for secure storage.',
                'material' => '90% Recycled Polyester, 10% Spandex',
                'color_name' => 'Turquoise Wave',
                'color_hex' => '#06B6D4',
                'wholesale_price' => 24.00,
                'msrp_price' => 50.00,
                'cost_price' => 9.50,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 85 per variant
                'sizes' => ['S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.pexels.com/photos/2215609/pexels-photo-2215609.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Men\'s Arch-Support Performance Socks (3-Pack)',
                'slug' => 'mens-arch-support-performance-socks',
                'sku' => 'AYN-DEMO-010',
                'brand_slug' => 'ventus-sport',
                'category_slug' => 'socks',
                'audience' => 'MEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Compression band with cushioned terry footbed.',
                'description' => 'High-durability athletic crew socks offering targeted arch stability, moisture-channel ventilation, and seamless toe construction.',
                'material' => '80% Combed Cotton, 17% Nylon, 3% Elastane',
                'color_name' => 'Jet Black',
                'color_hex' => '#171717',
                'wholesale_price' => 12.00,
                'msrp_price' => 25.00,
                'cost_price' => 4.50,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'out_of_stock', // Out of stock sample (0 units)
                'sizes' => ['One Size'],
                'images' => [
                    'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=800&q=80',
                ],
            ],

            // WOMEN (10)
            [
                'name' => 'Women\'s Pure Mulberry Silk Chiffon Blouse',
                'slug' => 'womens-pure-mulberry-silk-chiffon-blouse',
                'sku' => 'AYN-DEMO-011',
                'brand_slug' => 'aura-atelier',
                'category_slug' => 'blouse',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_MASTER_COPY,
                'short_description' => '16mm Grade 6A Mulberry silk with mother-of-pearl buttons.',
                'description' => 'Ethereal drape and featherlight touch. Hand-rolled hems and mother-of-pearl buttons bring refined craftsmanship to executive evening attire.',
                'material' => '100% Mulberry Silk (16mm)',
                'color_name' => 'Champagne Pearl',
                'color_hex' => '#FAF5EE',
                'wholesale_price' => 195.00,
                'msrp_price' => 450.00,
                'cost_price' => 90.00,
                'moq' => 5,
                'is_featured' => true,
                'is_hot' => true,
                'is_new' => true,
                'stock_type' => 'normal', // 45 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Women\'s Fine-Gauge Cashmere Knit Cardigan',
                'slug' => 'womens-fine-gauge-cashmere-knit-cardigan',
                'sku' => 'AYN-DEMO-012',
                'brand_slug' => 'luxe-knitwear',
                'category_slug' => 'knitwear',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => '2-ply Mongolian cashmere with ribbed trims.',
                'description' => 'Exceptional softness and insulation. V-neck silhouette with horn buttons and fine 12-gauge knit structure suited for boutique distribution.',
                'material' => '100% Mongolian Cashmere',
                'color_name' => 'Oatmeal Heather',
                'color_hex' => '#E5DFD3',
                'wholesale_price' => 175.00,
                'msrp_price' => 380.00,
                'cost_price' => 80.00,
                'moq' => 5,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 50 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/35145462/pexels-photo-35145462.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s French Linen Relaxed Resort Shirt',
                'slug' => 'womens-french-linen-relaxed-resort-shirt',
                'sku' => 'AYN-DEMO-013',
                'brand_slug' => 'oasis-linen',
                'category_slug' => 'shirts',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => '100% Normandy flax linen with relaxed drop shoulders.',
                'description' => 'Airy breathable linen woven from European flax. Enzyme-softened to provide immediate comfort and relaxed resort elegance.',
                'material' => '100% French Flax Linen',
                'color_name' => 'Crisp White',
                'color_hex' => '#FFFFFF',
                'wholesale_price' => 48.00,
                'msrp_price' => 110.00,
                'cost_price' => 21.00,
                'moq' => 10,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 80 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s Seamless High-Waist Athletic Leggings',
                'slug' => 'womens-seamless-high-waist-athletic-leggings',
                'sku' => 'AYN-DEMO-014',
                'brand_slug' => 'ventus-sport',
                'category_slug' => 'activewear',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Four-way stretch interlock knit with compressive waistband.',
                'description' => 'Squat-proof activewear leggings engineered with circular seamless knit technology for zero chafing during high-impact movement.',
                'material' => '78% Recycled Polyamide, 22% Elastane',
                'color_name' => 'Olive Moss',
                'color_hex' => '#3F4F38',
                'wholesale_price' => 34.00,
                'msrp_price' => 75.00,
                'cost_price' => 14.50,
                'moq' => 15,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => true,
                'stock_type' => 'normal', // 120 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/37451174/pexels-photo-37451174.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s Cropped Organic Cotton Hoodie',
                'slug' => 'womens-cropped-organic-cotton-hoodie',
                'sku' => 'AYN-DEMO-015',
                'brand_slug' => 'urban-stride',
                'category_slug' => 'hoodies',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Brushed fleece boxy cropped cut with ribbed waistband.',
                'description' => 'Modern athleisure cropped hoodie featuring 320GSM brushed French terry cotton with lined crossover hood and metal aglets.',
                'material' => '100% Organic Cotton Fleece',
                'color_name' => 'Dusty Rose',
                'color_hex' => '#FDA4AF',
                'wholesale_price' => 42.00,
                'msrp_price' => 90.00,
                'cost_price' => 19.00,
                'moq' => 10,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 70 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s High-Rise Wide-Leg Linen Trousers',
                'slug' => 'womens-high-rise-wide-leg-linen-trousers',
                'sku' => 'AYN-DEMO-016',
                'brand_slug' => 'oasis-linen',
                'category_slug' => 'trousers',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Flowing wide-leg fit with pleated front and elastic back.',
                'description' => 'Chic transitional trousers in breathable woven linen. Features angled front pockets and a clean waistline suitable for warm-climate boutique collections.',
                'material' => '55% Linen, 45% Viscose',
                'color_name' => 'Sand Dune',
                'color_hex' => '#D6C7B2',
                'wholesale_price' => 45.00,
                'msrp_price' => 98.00,
                'cost_price' => 20.00,
                'moq' => 10,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 90 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s Ribbed Modal Crew-Neck Tee',
                'slug' => 'womens-ribbed-modal-crew-neck-tee',
                'sku' => 'AYN-DEMO-017',
                'brand_slug' => 'cotton-craft',
                'category_slug' => 't-shirts',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Ultra-soft micro-ribbed modal jersey basic tee.',
                'description' => 'Figure-skimming essential tee crafted with micro-modal fibers for silk-like tactile drape and long-lasting shape retention.',
                'material' => '95% Modal, 5% Spandex Rib',
                'color_name' => 'Mocha Brown',
                'color_hex' => '#78350F',
                'wholesale_price' => 22.00,
                'msrp_price' => 48.00,
                'cost_price' => 9.00,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 160 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/7658459/pexels-photo-7658459.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s Tailored Double-Breasted Wool Blazer',
                'slug' => 'womens-tailored-double-breasted-wool-blazer',
                'sku' => 'AYN-DEMO-018',
                'brand_slug' => 'aura-atelier',
                'category_slug' => 'jackets',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_MASTER_COPY,
                'short_description' => 'Structured shoulders and peak lapels in virgin wool twill.',
                'description' => 'Sharp architectural tailoring with full cupro lining, internal chest pocket, and horn buttons for executive corporate wear.',
                'material' => '100% Virgin Wool, Cupro Lining',
                'color_name' => 'Caviar Black',
                'color_hex' => '#0A0A0A',
                'wholesale_price' => 165.00,
                'msrp_price' => 380.00,
                'cost_price' => 75.00,
                'moq' => 5,
                'is_featured' => true,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 40 per variant
                'sizes' => ['34', '36', '38', '40'],
                'images' => [
                    'https://images.pexels.com/photos/19490409/pexels-photo-19490409.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s Stretch Mom-Fit High-Waist Jeans',
                'slug' => 'womens-stretch-mom-fit-high-waist-jeans',
                'sku' => 'AYN-DEMO-019',
                'brand_slug' => 'terra-forma',
                'category_slug' => 'pants',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Authentic vintage stone-wash denim with 1% comfort stretch.',
                'description' => 'Tapered leg ankle-crop jeans featuring authentic wash whiskering and 12.5oz cotton denim engineered to flatter natural body curves.',
                'material' => '99% Cotton, 1% Elastane Denim',
                'color_name' => 'Vintage Light Wash',
                'color_hex' => '#93C5FD',
                'wholesale_price' => 52.00,
                'msrp_price' => 110.00,
                'cost_price' => 24.00,
                'moq' => 10,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 100 per variant
                'sizes' => ['26', '28', '30', '32'],
                'images' => [
                    'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Women\'s Sleeveless Mock-Neck Ribbed Tank Top',
                'slug' => 'womens-sleeveless-mock-neck-ribbed-tank-top',
                'sku' => 'AYN-DEMO-020',
                'brand_slug' => 'cotton-craft',
                'category_slug' => 'tops',
                'audience' => 'WOMEN',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Fitted mock neckline in clean 2x2 stretch cotton rib.',
                'description' => 'Sleek layering essential top featuring high neckline and reinforced armhole binding that prevents gaping.',
                'material' => '95% Combed Cotton, 5% Spandex',
                'color_name' => 'Warm Cream',
                'color_hex' => '#FEF3C7',
                'wholesale_price' => 18.00,
                'msrp_price' => 40.00,
                'cost_price' => 7.50,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 140 per variant
                'sizes' => ['XS', 'S', 'M', 'L'],
                'images' => [
                    'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],

            // UNISEX (6)
            [
                'name' => 'Unisex 450GSM Organic Heavyweight Hoodie',
                'slug' => 'unisex-450gsm-organic-heavyweight-hoodie',
                'sku' => 'AYN-DEMO-021',
                'brand_slug' => 'ayaan',
                'category_slug' => 'hoodies',
                'audience' => 'UNISEX',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => '450GSM cross-grain diagonal fleece with zero shrinkage.',
                'description' => 'Top-tier luxury streetwear blank hoodie. Features double-folded hood, heavy 3-inch ribbed cuffs, and blind stitch detailing throughout.',
                'material' => '100% Organic Ring-Spun Cotton (450 GSM)',
                'color_name' => 'Washed Onyx',
                'color_hex' => '#18181B',
                'wholesale_price' => 58.00,
                'msrp_price' => 125.00,
                'cost_price' => 26.00,
                'moq' => 10,
                'is_featured' => true,
                'is_hot' => true,
                'is_new' => true,
                'stock_type' => 'normal', // 150 per variant
                'sizes' => ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                'images' => [
                    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Unisex Oversized Acid-Wash Graphic Tee',
                'slug' => 'unisex-oversized-acid-wash-graphic-tee',
                'sku' => 'AYN-DEMO-022',
                'brand_slug' => 'urban-stride',
                'category_slug' => 't-shirts',
                'audience' => 'UNISEX',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Mineral-washed 220GSM vintage streetwear silhouette.',
                'description' => 'Custom garment-dyed acid wash t-shirt with pre-distressed ribbed neckline and dropped shoulders for high-end boutique streetwear retailers.',
                'material' => '100% Combed Cotton',
                'color_name' => 'Washed Charcoal',
                'color_hex' => '#3F3F46',
                'wholesale_price' => 26.00,
                'msrp_price' => 55.00,
                'cost_price' => 11.00,
                'moq' => 15,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 120 per variant
                'sizes' => ['S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Unisex Mongolian Cashmere Fine Beanie Cap',
                'slug' => 'unisex-mongolian-cashmere-fine-beanie-cap',
                'sku' => 'AYN-DEMO-023',
                'brand_slug' => 'luxe-knitwear',
                'category_slug' => 'sweaters',
                'audience' => 'UNISEX',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => '100% Mongolian Cashmere 4-ply fisherman rib knit.',
                'description' => 'Featherlight warmth and thermal insulation. Seamless circular knit construction with adjustable cuff fold.',
                'material' => '100% Cashmere',
                'color_name' => 'Camel Heather',
                'color_hex' => '#B45309',
                'wholesale_price' => 35.00,
                'msrp_price' => 75.00,
                'cost_price' => 15.00,
                'moq' => 10,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'low', // Low stock sample (< MOQ: stock = 3)
                'sizes' => ['One Size'],
                'images' => [
                    'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80',
                ],
            ],
            [
                'name' => 'Unisex Recycled Polyamide Windbreaker Jacket',
                'slug' => 'unisex-recycled-polyamide-windbreaker-jacket',
                'sku' => 'AYN-DEMO-024',
                'brand_slug' => 'north-peak',
                'category_slug' => 'jackets',
                'audience' => 'UNISEX',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Ripstop nylon shell with PFC-free water-repellent finish.',
                'description' => 'Packable weatherproof windbreaker featuring storm flap zipper, adjustable elastic drawcord hem, and breathable mesh back vent.',
                'material' => '100% Recycled Ripstop Nylon',
                'color_name' => 'Signal Orange',
                'color_hex' => '#EA580C',
                'wholesale_price' => 62.00,
                'msrp_price' => 135.00,
                'cost_price' => 28.00,
                'moq' => 10,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 80 per variant
                'sizes' => ['S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.pexels.com/photos/19490409/pexels-photo-19490409.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Unisex Oversized Heavy Knit Cardigan',
                'slug' => 'unisex-oversized-heavy-knit-cardigan',
                'sku' => 'AYN-DEMO-025',
                'brand_slug' => 'ayaan',
                'category_slug' => 'knitwear',
                'audience' => 'UNISEX',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Chunky 5-gauge wool blend knit with genuine horn buttons.',
                'description' => 'Cozy oversized knitwear staple featuring deep front welt pockets, dropped shoulder seams, and dense cardigan stitch.',
                'material' => '80% Wool, 20% Recycled Nylon',
                'color_name' => 'Forest Melange',
                'color_hex' => '#166534',
                'wholesale_price' => 88.00,
                'msrp_price' => 180.00,
                'cost_price' => 40.00,
                'moq' => 5,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 55 per variant
                'sizes' => ['XS', 'S', 'M', 'L', 'XL'],
                'images' => [
                    'https://images.pexels.com/photos/15694151/pexels-photo-15694151.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Unisex Dry-Fit Athletic Ankle Socks (5-Pack)',
                'slug' => 'unisex-dry-fit-athletic-ankle-socks',
                'sku' => 'AYN-DEMO-026',
                'brand_slug' => 'ventus-sport',
                'category_slug' => 'socks',
                'audience' => 'UNISEX',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Anti-blister heel tab with targeted arch compression.',
                'description' => 'Low-cut athletic socks with moisture-wicking synthetic yarn channels and anti-slip silicone heel grip.',
                'material' => '75% Combed Cotton, 22% Polyester, 3% Spandex',
                'color_name' => 'Clean White',
                'color_hex' => '#FFFFFF',
                'wholesale_price' => 15.00,
                'msrp_price' => 30.00,
                'cost_price' => 5.50,
                'moq' => 25,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 200 per variant
                'sizes' => ['One Size'],
                'images' => [
                    'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=800&q=80',
                ],
            ],

            // BOYS (3)
            [
                'name' => 'Boys\' Piqué Cotton Striped Polo Shirt',
                'slug' => 'boys-pique-cotton-striped-polo-shirt',
                'sku' => 'AYN-DEMO-027',
                'brand_slug' => 'cotton-craft',
                'category_slug' => 'polo-shirts',
                'audience' => 'BOYS',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Yarn-dyed horizontal stripe piqué with reinforced placket.',
                'description' => 'Durable boys polo designed for school uniform and casual export lines. Pre-shrunk cotton with flat-knit ribbed collar and split side vents.',
                'material' => '100% Combed Cotton',
                'color_name' => 'Navy & White Stripe',
                'color_hex' => '#1E3A8A',
                'wholesale_price' => 18.00,
                'msrp_price' => 38.00,
                'cost_price' => 7.50,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 120 per variant
                'sizes' => ['4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y'],
                'images' => [
                    'https://images.pexels.com/photos/8217415/pexels-photo-8217415.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Boys\' Fleece Zip-Up Training Hoodie',
                'slug' => 'boys-fleece-zip-up-training-hoodie',
                'sku' => 'AYN-DEMO-028',
                'brand_slug' => 'ventus-sport',
                'category_slug' => 'hoodies',
                'audience' => 'BOYS',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Lightweight brushed back fleece with split kangaroo pocket.',
                'description' => 'Active athletic hoodie for youth sports with full front zipper, protective chin guard, and elastic ribbed cuffs.',
                'material' => '60% Cotton, 40% Polyester Fleece',
                'color_name' => 'Royal Blue',
                'color_hex' => '#2563EB',
                'wholesale_price' => 25.00,
                'msrp_price' => 52.00,
                'cost_price' => 11.00,
                'moq' => 15,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 90 per variant
                'sizes' => ['6-7Y', '8-9Y', '10-11Y', '12-13Y'],
                'images' => [
                    'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Boys\' Stretch Denim Reinforced Knee Jeans',
                'slug' => 'boys-stretch-denim-reinforced-knee-jeans',
                'sku' => 'AYN-DEMO-029',
                'brand_slug' => 'terra-forma',
                'category_slug' => 'pants',
                'audience' => 'BOYS',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Internal knee reinforcement patch with adjustable inner elastic waistband.',
                'description' => 'High-abrasion resistant kids jeans built to withstand rough playground wear without ripping.',
                'material' => '98% Cotton, 2% Elastane',
                'color_name' => 'Classic Indigo',
                'color_hex' => '#1D4ED8',
                'wholesale_price' => 28.00,
                'msrp_price' => 60.00,
                'cost_price' => 12.50,
                'moq' => 15,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 80 per variant
                'sizes' => ['6-7Y', '8-9Y', '10-11Y', '12-13Y'],
                'images' => [
                    'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],

            // GIRLS (3)
            [
                'name' => 'Girls\' Tiered Organic Cotton Ruffle Dress',
                'slug' => 'girls-tiered-organic-cotton-ruffle-dress',
                'sku' => 'AYN-DEMO-030',
                'brand_slug' => 'oasis-linen',
                'category_slug' => 'tops',
                'audience' => 'GIRLS',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Tiered skirt silhouette with butterfly ruffle sleeves.',
                'description' => 'Charming summer dress in breathable combed cotton poplin. Features rear coconut button placket and lightweight cotton lining.',
                'material' => '100% Organic Cotton Poplin',
                'color_name' => 'Pastel Peach',
                'color_hex' => '#FDBA74',
                'wholesale_price' => 26.00,
                'msrp_price' => 58.00,
                'cost_price' => 11.50,
                'moq' => 15,
                'is_featured' => true,
                'is_hot' => false,
                'is_new' => true,
                'stock_type' => 'normal', // 100 per variant
                'sizes' => ['4-5Y', '6-7Y', '8-9Y', '10-11Y'],
                'images' => [
                    'https://images.pexels.com/photos/4066293/pexels-photo-4066293.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Girls\' Cable-Knit Soft Cotton Cardigan',
                'slug' => 'girls-cable-knit-soft-cotton-cardigan',
                'sku' => 'AYN-DEMO-031',
                'brand_slug' => 'luxe-knitwear',
                'category_slug' => 'knitwear',
                'audience' => 'GIRLS',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Traditional diamond cable knit with scalloped edges.',
                'description' => 'Cozy everyday knit cardigan crafted with combed cotton yarns to ensure itch-free comfort for sensitive young skin.',
                'material' => '100% Combed Cotton Knit',
                'color_name' => 'Blush Pink',
                'color_hex' => '#F472B6',
                'wholesale_price' => 32.00,
                'msrp_price' => 68.00,
                'cost_price' => 14.00,
                'moq' => 10,
                'is_featured' => false,
                'is_hot' => true,
                'is_new' => false,
                'stock_type' => 'normal', // 75 per variant
                'sizes' => ['4-5Y', '6-7Y', '8-9Y', '10-11Y'],
                'images' => [
                    'https://images.pexels.com/photos/35145462/pexels-photo-35145462.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
            [
                'name' => 'Girls\' Cotton Elastane Stretch Leggings (2-Pack)',
                'slug' => 'girls-cotton-elastane-stretch-leggings',
                'sku' => 'AYN-DEMO-032',
                'brand_slug' => 'cotton-craft',
                'category_slug' => 'activewear',
                'audience' => 'GIRLS',
                'design_type' => Product::DESIGN_TYPE_ORIGINAL,
                'short_description' => 'Comfort elastic waist with full ankle length stretch.',
                'description' => 'Soft jersey basic everyday leggings with non-twisting elastic waistband and reinforced inner thigh stitching.',
                'material' => '95% Cotton, 5% Elastane Jersey',
                'color_name' => 'Lavender & Heather Grey',
                'color_hex' => '#C084FC',
                'wholesale_price' => 16.00,
                'msrp_price' => 35.00,
                'cost_price' => 6.50,
                'moq' => 20,
                'is_featured' => false,
                'is_hot' => false,
                'is_new' => false,
                'stock_type' => 'normal', // 130 per variant
                'sizes' => ['4-5Y', '6-7Y', '8-9Y', '10-11Y'],
                'images' => [
                    'https://images.pexels.com/photos/37451174/pexels-photo-37451174.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                ],
            ],
        ];

        foreach ($catalog as $item) {
            $brand = Brand::where('slug', $item['brand_slug'])->first();
            $category = Category::where('slug', $item['category_slug'])->first();

            $bulkThreshold = $item['moq'] * 10;
            $bulkPrice = round($item['wholesale_price'] * 0.90, 2);
            $fullStockPrice = round($item['wholesale_price'] * 0.82, 2);

            $productAttrs = [
                'brand_id' => $brand?->id,
                'name' => $item['name'],
                'slug' => $item['slug'],
                'short_description' => $item['short_description'],
                'description' => $item['description'],
                'material' => $item['material'],
                'color_name' => $item['color_name'],
                'color_hex' => $item['color_hex'],
                'audience' => $item['audience'],
                'design_type' => $item['design_type'],
                'wholesale_price' => $item['wholesale_price'],
                'msrp_price' => $item['msrp_price'],
                'cost_price' => $item['cost_price'],
                'moq' => $item['moq'],
                'bulk_threshold' => $bulkThreshold,
                'bulk_price' => $bulkPrice,
                'full_stock_price' => $fullStockPrice,
                'status' => 'published',
                'is_featured' => $item['is_featured'] ?? false,
                'is_hot' => $item['is_hot'] ?? false,
                'is_new' => $item['is_new'] ?? false,
                'is_best_deal' => $item['is_best_deal'] ?? ($item['is_featured'] || $item['is_hot'] || $item['wholesale_price'] < $item['msrp_price']),
                'is_limited_deal' => $item['is_limited_deal'] ?? ($item['is_hot'] && $item['wholesale_price'] > 50),
                'is_demo' => true,
                'weight_grams' => 350,
            ];

            $product = Product::withTrashed()->where('sku', $item['sku'])->first();
            if ($product) {
                if ($product->trashed()) {
                    $product->restore();
                }
                $product->update($productAttrs);
            } else {
                $product = Product::create(array_merge(['sku' => $item['sku']], $productAttrs));
            }

            if ($category) {
                $product->categories()->syncWithoutDetaching([$category->id]);
            }

            // Product Images
            foreach ($item['images'] as $idx => $imgUrl) {
                ProductImage::firstOrCreate(
                    ['product_id' => $product->id, 'image_url' => $imgUrl],
                    [
                        'alt_text' => "{$product->name} - View " . ($idx + 1),
                        'sort_order' => $idx,
                        'is_primary' => $idx === 0,
                    ]
                );
            }

            // 3-Tier Wholesale Pricing
            ProductPricingTier::updateOrCreate(
                ['product_id' => $product->id, 'min_quantity' => $product->moq],
                [
                    'max_quantity' => $bulkThreshold - 1,
                    'unit_price' => $product->wholesale_price,
                ]
            );

            ProductPricingTier::updateOrCreate(
                ['product_id' => $product->id, 'min_quantity' => $bulkThreshold],
                [
                    'max_quantity' => ($bulkThreshold * 2) - 1,
                    'unit_price' => $bulkPrice,
                ]
            );

            ProductPricingTier::updateOrCreate(
                ['product_id' => $product->id, 'min_quantity' => $bulkThreshold * 2],
                [
                    'max_quantity' => null,
                    'unit_price' => $fullStockPrice,
                ]
            );

            // Package Allocation Specs
            // Product Variants & Inventory
            foreach ($item['sizes'] as $vIdx => $size) {
                $vSku = "{$product->sku}-{$size}";

                $stockQty = match ($item['stock_type']) {
                    'low' => 2, // < MOQ
                    'out_of_stock' => 0,
                    default => 100, // Normal stock
                };

                $variant = ProductVariant::updateOrCreate(
                    ['sku' => $vSku],
                    [
                        'product_id' => $product->id,
                        'title' => "{$product->name} - {$size}",
                        'size' => $size,
                        'color' => $product->color_name,
                        'option_summary' => "Size: {$size}, Color: {$product->color_name}",
                        'price' => $product->wholesale_price,
                        'stock' => $stockQty,
                        'is_default' => $vIdx === 0,
                        'is_active' => true,
                    ]
                );

                // Single Warehouse: Uttara
                Inventory::updateOrCreate(
                    ['product_variant_id' => $variant->id, 'warehouse_id' => $warehouse->id],
                    ['quantity' => $stockQty, 'reserved_quantity' => 0]
                );

                // Package Allocation
                ProductPackageAllocation::updateOrCreate(
                    ['product_id' => $product->id, 'product_variant_id' => $variant->id],
                    ['quantity' => 10]
                );
            }

            // Shipping Package Profiles
            ProductShippingPackageProfile::updateOrCreate(
                ['product_id' => $product->id, 'package_quantity' => max(10, $product->moq * 5)],
                [
                    'carton_count' => 1,
                    'carton_length' => 60.00,
                    'carton_width' => 40.00,
                    'carton_height' => 35.00,
                    'gross_weight' => 24.50,
                    'notes' => "Standard master carton packaging for {$product->name}",
                    'is_active' => true,
                ]
            );
        }
    }
}
