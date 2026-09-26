<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Shipping\PackageCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShippingPackageProfileTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Brand $brand;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
        ]);

        $this->brand = Brand::create([
            'name' => 'Ayaan Manufacturing',
            'slug' => 'ayaan-manufacturing',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'T-Shirts',
            'slug' => 't-shirts',
        ]);
    }

    /**
     * Test 1: Centralized CBM Calculation Service
     */
    public function test_centralized_cbm_calculation(): void
    {
        // 3 cartons of 60 x 40 x 30 cm = 0.60 * 0.40 * 0.30 * 3 = 0.216 CBM
        $cbm = PackageCalculatorService::calculateTotalCbm(60, 40, 30, 3, 'cm');
        $this->assertEquals(0.216, $cbm);

        // 1 carton of 50 x 50 x 50 cm = 0.50 * 0.50 * 0.50 * 1 = 0.125 CBM
        $cbmSingle = PackageCalculatorService::calculateTotalCbm(50, 50, 50, 1, 'cm');
        $this->assertEquals(0.125, $cbmSingle);

        // Inch dimension conversion: 24 x 16 x 12 in (approx 60.96 x 40.64 x 30.48 cm)
        $cbmInches = PackageCalculatorService::calculateTotalCbm(24, 16, 12, 2, 'in');
        $this->assertGreaterThan(0.14, $cbmInches);
        $this->assertLessThan(0.16, $cbmInches);
    }

    /**
     * Test 2: Admin can create a product with shipping package profiles
     */
    public function test_admin_can_create_product_with_shipping_package_profiles(): void
    {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Heavyweight Export Hoodies',
            'slug' => 'heavyweight-export-hoodies',
            'sku' => 'HD-EXP-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 35.00,
            'moq' => 50,
            'status' => 'published',
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'dimension_unit' => 'cm',
                    'gross_weight' => 22.5,
                    'net_weight' => 20.0,
                    'weight_unit' => 'kg',
                    'notes' => '1 Master Export Carton',
                ],
                [
                    'package_quantity' => 100,
                    'carton_count' => 2,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'dimension_unit' => 'cm',
                    'gross_weight' => 45.0,
                    'net_weight' => 40.0,
                    'weight_unit' => 'kg',
                    'notes' => '2 Master Export Cartons',
                ],
                [
                    'package_quantity' => 200,
                    'carton_count' => 4,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'dimension_unit' => 'cm',
                    'gross_weight' => 90.0,
                    'net_weight' => 80.0,
                    'weight_unit' => 'kg',
                    'notes' => '4 Master Export Cartons',
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Heavyweight Export Hoodies')
            ->assertJsonCount(3, 'data.shipping_package_profiles');

        $this->assertDatabaseCount('product_shipping_package_profiles', 3);
        $this->assertDatabaseHas('product_shipping_package_profiles', [
            'package_quantity' => 50,
            'carton_count' => 1,
            'gross_weight' => 22.5,
        ]);
    }

    /**
     * Test 3: Validation rejects zero/negative dimensions and weights
     */
    public function test_validation_rejects_invalid_dimensions_and_weights(): void
    {
        Sanctum::actingAs($this->admin);

        // Zero carton dimensions
        $payload1 = [
            'name' => 'Bad Product 1',
            'slug' => 'bad-product-1',
            'sku' => 'BP-001',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'carton_length' => 0, // Invalid!
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 20.0,
                ],
            ],
        ];
        $this->postJson('/api/v1/products', $payload1)->assertStatus(422);

        // Zero gross weight
        $payload2 = [
            'name' => 'Bad Product 2',
            'slug' => 'bad-product-2',
            'sku' => 'BP-002',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 0, // Invalid!
                ],
            ],
        ];
        $this->postJson('/api/v1/products', $payload2)->assertStatus(422);

        // Zero carton count
        $payload3 = [
            'name' => 'Bad Product 3',
            'slug' => 'bad-product-3',
            'sku' => 'BP-003',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 0, // Invalid!
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 20.0,
                ],
            ],
        ];
        $this->postJson('/api/v1/products', $payload3)->assertStatus(422);

        // Net weight exceeding gross weight
        $payload4 = [
            'name' => 'Bad Product 4',
            'slug' => 'bad-product-4',
            'sku' => 'BP-004',
            'wholesale_price' => 10.00,
            'moq' => 10,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 20.0,
                    'net_weight' => 25.0, // Invalid! Net > Gross
                ],
            ],
        ];
        $this->postJson('/api/v1/products', $payload4)->assertStatus(422);
    }

    /**
     * Test 4: Validation rejects duplicate exact quantities and overlapping ranges
     */
    public function test_validation_rejects_duplicate_profiles_and_overlapping_ranges(): void
    {
        Sanctum::actingAs($this->admin);

        // Duplicate exact quantities (e.g. two entries for 50 pcs)
        $payloadDuplicate = [
            'name' => 'Duplicate Profile Product',
            'slug' => 'dup-profile-prod',
            'sku' => 'DUP-001',
            'wholesale_price' => 15.00,
            'moq' => 10,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'carton_count' => 1,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 20.0,
                ],
                [
                    'package_quantity' => 50, // Duplicate!
                    'carton_count' => 2,
                    'carton_length' => 50.0,
                    'carton_width' => 30.0,
                    'carton_height' => 20.0,
                    'gross_weight' => 22.0,
                ],
            ],
        ];
        $this->postJson('/api/v1/products', $payloadDuplicate)->assertStatus(422);

        // Overlapping ranges (e.g. 50-100 and 80-150)
        $payloadOverlap = [
            'name' => 'Overlap Profile Product',
            'slug' => 'overlap-profile-prod',
            'sku' => 'OVL-001',
            'wholesale_price' => 15.00,
            'moq' => 10,
            'shipping_package_profiles' => [
                [
                    'package_quantity' => 50,
                    'quantity_max' => 100,
                    'carton_count' => 2,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 40.0,
                ],
                [
                    'package_quantity' => 80, // Overlaps with 50-100!
                    'quantity_max' => 150,
                    'carton_count' => 3,
                    'carton_length' => 60.0,
                    'carton_width' => 40.0,
                    'carton_height' => 30.0,
                    'gross_weight' => 60.0,
                ],
            ],
        ];
        $this->postJson('/api/v1/products', $payloadOverlap)->assertStatus(422);
    }

    /**
     * Test 5: Quantity Matching and Shipment Specifications API
     */
    public function test_quantity_matching_and_shipment_specs_endpoint(): void
    {
        $product = Product::create([
            'name' => 'Premium Polo Shirts',
            'slug' => 'premium-polo-shirts',
            'sku' => 'POLO-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'moq' => 50,
            'status' => 'published',
        ]);

        // Create 3 active profiles: 50 pcs (1 carton), 100 pcs (2 cartons), 200 pcs (4 cartons)
        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 50,
            'carton_count' => 1,
            'carton_length' => 60.0,
            'carton_width' => 40.0,
            'carton_height' => 30.0,
            'dimension_unit' => 'cm',
            'gross_weight' => 15.0,
            'net_weight' => 13.5,
            'weight_unit' => 'kg',
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 100,
            'carton_count' => 2,
            'carton_length' => 60.0,
            'carton_width' => 40.0,
            'carton_height' => 30.0,
            'dimension_unit' => 'cm',
            'gross_weight' => 30.0,
            'net_weight' => 27.0,
            'weight_unit' => 'kg',
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 200,
            'carton_count' => 4,
            'carton_length' => 60.0,
            'carton_width' => 40.0,
            'carton_height' => 30.0,
            'dimension_unit' => 'cm',
            'gross_weight' => 60.0,
            'net_weight' => 54.0,
            'weight_unit' => 'kg',
        ]);

        // 1. Query for 50 pcs
        $res50 = $this->getJson("/api/v1/products/{$product->id}/shipping-specs?quantity=50");
        $res50->assertStatus(200)
            ->assertJsonPath('data.status', 'available')
            ->assertJsonPath('data.carton_count', 1)
            ->assertJsonPath('data.gross_weight', 15)
            ->assertJsonPath('data.total_cbm', 0.072);

        // 2. Query for 100 pcs
        $res100 = $this->getJson("/api/v1/products/{$product->id}/shipping-specs?quantity=100");
        $res100->assertStatus(200)
            ->assertJsonPath('data.status', 'available')
            ->assertJsonPath('data.carton_count', 2)
            ->assertJsonPath('data.gross_weight', 30)
            ->assertJsonPath('data.total_cbm', 0.144);

        // 3. Query for 200 pcs
        $res200 = $this->getJson("/api/v1/products/{$product->id}/shipping-specs?quantity=200");
        $res200->assertStatus(200)
            ->assertJsonPath('data.status', 'available')
            ->assertJsonPath('data.carton_count', 4)
            ->assertJsonPath('data.gross_weight', 60)
            ->assertJsonPath('data.total_cbm', 0.288);

        // 4. Query for unconfigured quantity (e.g. 75 pcs when only 50, 100, 200 configured)
        // Must return explicit unavailable state rather than guessing/interpolating
        $res75 = $this->getJson("/api/v1/products/{$product->id}/shipping-specs?quantity=75");
        $res75->assertStatus(200)
            ->assertJsonPath('data.status', 'unavailable')
            ->assertJsonPath('data.specs', null);
    }

    /**
     * Test 6: Full Stock Shipping Behavior (exact profile vs missing profile)
     */
    public function test_full_stock_shipping_behavior(): void
    {
        $product = Product::create([
            'name' => 'Full Stock Batch Denim',
            'slug' => 'full-stock-batch-denim',
            'sku' => 'DNM-FS-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 40.00,
            'moq' => 50,
            'status' => 'published',
        ]);

        // Add variants with total stock 450 pcs
        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'DNM-FS-001-32',
            'title' => 'Indigo / 32',
            'stock' => 200,
        ]);
        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'DNM-FS-001-34',
            'title' => 'Indigo / 34',
            'stock' => 250,
        ]);

        $this->assertEquals(450, $product->getTotalAvailableStock());

        // Configure MOQ profile for 50 pcs only
        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 50,
            'carton_count' => 1,
            'carton_length' => 60.0,
            'carton_width' => 40.0,
            'carton_height' => 30.0,
            'dimension_unit' => 'cm',
            'gross_weight' => 25.0,
            'weight_unit' => 'kg',
        ]);

        // Query Full Stock (450 pcs) when NO 450 profile is configured:
        // Must NOT assume 450 = 9 x 50 profile! Returns unavailable.
        $resFsUnavailable = $this->getJson("/api/v1/products/{$product->id}/shipping-specs?quantity=450&full_stock=1");
        $resFsUnavailable->assertStatus(200)
            ->assertJsonPath('data.status', 'unavailable');

        // Now configure exact Full Stock profile (450 pcs in 9 cartons, palletized or packed)
        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 450,
            'carton_count' => 9,
            'carton_length' => 60.0,
            'carton_width' => 40.0,
            'carton_height' => 30.0,
            'dimension_unit' => 'cm',
            'gross_weight' => 220.0,
            'net_weight' => 200.0,
            'weight_unit' => 'kg',
            'notes' => 'Complete warehouse batch export shipment',
        ]);

        // Query Full Stock again: now returns the authoritative full stock profile!
        $resFsAvailable = $this->getJson("/api/v1/products/{$product->id}/shipping-specs?quantity=450&full_stock=1");
        $resFsAvailable->assertStatus(200)
            ->assertJsonPath('data.status', 'available')
            ->assertJsonPath('data.carton_count', 9)
            ->assertJsonPath('data.gross_weight', 220)
            ->assertJsonPath('data.total_cbm', 0.648);
    }
}
