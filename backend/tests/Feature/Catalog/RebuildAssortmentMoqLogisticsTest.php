<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductShippingPackageProfile;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RebuildAssortmentMoqLogisticsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Category $category;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Store Admin',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create(['name' => 'Ayaan Manufacturing', 'slug' => 'ayaan-mfg']);
        $this->category = Category::create(['name' => 'Polos', 'slug' => 'polos']);
        $this->warehouse = Warehouse::create([
            'name' => 'Main WH',
            'code' => 'WH-MAIN',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * TEST 4, 5, 6:
     * 2 colors x 4 sizes = 8 variants.
     * Manually configure Black (S=2, M=4, L=4, XL=2 -> 12) + White (S=1, M=3, L=3, XL=1 -> 8) = Total 20.
     * MOQ must be automatically derived as 20 without submitting a separate manual MOQ.
     */
    public function test_moq_is_automatically_derived_from_package_assortment(): void
    {
        $payload = [
            'product_id' => 'AYC-POL-001',
            'name' => 'Universal Package Pique Polo',
            'slug' => 'universal-package-pique-polo',
            'sku' => 'AYN-POL-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 18.50,
            'bulk_threshold' => 100,
            'bulk_price' => 15.00,
            'full_stock_price' => 14.00,
            'warehouse_id' => $this->warehouse->id,
            // Notice: No manual moq submitted! Derived from allocations sum.
            'status' => 'published',
            'variants' => [
                ['color' => 'Black', 'size' => 'S', 'stock' => 100],
                ['color' => 'Black', 'size' => 'M', 'stock' => 100],
                ['color' => 'Black', 'size' => 'L', 'stock' => 100],
                ['color' => 'Black', 'size' => 'XL', 'stock' => 100],
                ['color' => 'White', 'size' => 'S', 'stock' => 100],
                ['color' => 'White', 'size' => 'M', 'stock' => 100],
                ['color' => 'White', 'size' => 'L', 'stock' => 100],
                ['color' => 'White', 'size' => 'XL', 'stock' => 100],
            ],
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'S', 'quantity' => 2],
                ['color' => 'Black', 'size' => 'M', 'quantity' => 4],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 4],
                ['color' => 'Black', 'size' => 'XL', 'quantity' => 2],
                ['color' => 'White', 'size' => 'S', 'quantity' => 1],
                ['color' => 'White', 'size' => 'M', 'quantity' => 3],
                ['color' => 'White', 'size' => 'L', 'quantity' => 3],
                ['color' => 'White', 'size' => 'XL', 'quantity' => 1],
            ],
            'shipping_package_profiles' => [
                [
                    'gross_weight' => 15.0,
                    'weight_unit' => 'kg',
                    'carton_length' => 60,
                    'carton_width' => 40,
                    'carton_height' => 30,
                    'dimension_unit' => 'cm',
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);

        $productId = $response->json('data.id');
        $product = Product::find($productId);

        // Assert 8 variants created
        $this->assertCount(8, $product->variants);

        // Assert MOQ was derived automatically as 20
        $this->assertEquals(20, $product->moq);
        $this->assertEquals(20, $response->json('data.moq'));

        // Assert Package allocations stored
        $this->assertDatabaseCount('product_package_allocations', 8);

        // Check Black total = 12
        $blackSum = ProductPackageAllocation::where('product_id', $productId)->where('color', 'Black')->sum('quantity');
        $this->assertEquals(12, $blackSum);

        // Check White total = 8
        $whiteSum = ProductPackageAllocation::where('product_id', $productId)->where('color', 'White')->sum('quantity');
        $this->assertEquals(8, $whiteSum);

        // Check single shipping package profile
        $this->assertDatabaseCount('product_shipping_package_profiles', 1);
        $profile = ProductShippingPackageProfile::where('product_id', $productId)->first();
        $this->assertEquals(15.0, (float) $profile->gross_weight);
        $this->assertEquals(60.0, (float) $profile->carton_length);
        $this->assertEquals(40.0, (float) $profile->carton_width);
        $this->assertEquals(30.0, (float) $profile->carton_height);
        $this->assertEquals(20, $profile->package_quantity); // Synced with derived MOQ
        $this->assertEquals(0.0720, round($profile->calculateTotalCbm(), 4));
    }

    /**
     * TEST 7:
     * Change Black / M from 4 -> 6.
     * Package total becomes 22.
     * MOQ automatically updates to 22.
     */
    public function test_updating_assortment_automatically_updates_moq(): void
    {
        $product = Product::create([
            'name' => 'Editable Assortment Polo',
            'slug' => 'editable-assortment-polo',
            'sku' => 'EDT-POL-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 16.00,
            'moq' => 20,
            'status' => 'published',
        ]);

        $vBlackM = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'EDT-BLK-M',
            'title' => 'Black / M',
            'color' => 'Black',
            'size' => 'M',
            'stock' => 50,
        ]);
        $vBlackL = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'EDT-BLK-L',
            'title' => 'Black / L',
            'color' => 'Black',
            'size' => 'L',
            'stock' => 50,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vBlackM->id,
            'package_name' => 'Universal Package',
            'color' => 'Black',
            'size' => 'M',
            'quantity' => 4,
        ]);
        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vBlackL->id,
            'package_name' => 'Universal Package',
            'color' => 'Black',
            'size' => 'L',
            'quantity' => 16,
        ]);
        // Initial sum = 20

        // Admin updates Black / M: 4 -> 6 (New sum = 22)
        $updatePayload = [
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'M', 'quantity' => 6],
                ['color' => 'Black', 'size' => 'L', 'quantity' => 16],
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", $updatePayload);
        $res->assertStatus(200);

        $product->refresh();
        $this->assertEquals(22, $product->moq);
        $this->assertEquals(22, $res->json('data.moq'));

        $allocM = ProductPackageAllocation::where('product_id', $product->id)->where('size', 'M')->first();
        $this->assertEquals(6, $allocM->quantity);
    }

    /**
     * TEST 8:
     * Changing inventory does NOT change package assortment or MOQ.
     */
    public function test_changing_inventory_does_not_alter_package_assortment_or_moq(): void
    {
        $product = Product::create([
            'name' => 'Inventory Isolation Product',
            'slug' => 'inventory-isolation-product',
            'sku' => 'INV-ISO-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'bulk_threshold' => 100,
            'bulk_price' => 16.00,
            'moq' => 20,
            'status' => 'published',
        ]);

        $vBlackS = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'INV-BLK-S',
            'title' => 'Black / S',
            'color' => 'Black',
            'size' => 'S',
            'stock' => 50,
        ]);

        ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $vBlackS->id,
            'package_name' => 'Universal Package',
            'color' => 'Black',
            'size' => 'S',
            'quantity' => 20,
        ]);

        // Direct inventory stock update on variant (e.g. warehouse adjustment)
        $vBlackS->update(['stock' => 500]);

        $product->refresh();
        $this->assertEquals(20, $product->moq); // MOQ remains 20

        $alloc = ProductPackageAllocation::where('product_id', $product->id)->first();
        $this->assertEquals(20, $alloc->quantity); // Assortment remains 20 pcs
    }

    /**
     * TEST 9 & 10:
     * Reload page / GET product returns all saved configuration from DB.
     * Edit published product persists all values cleanly.
     */
    public function test_reload_and_edit_published_product_persists_all_fields(): void
    {
        $payload = [
            'product_id' => 'AYC-OXF-001',
            'name' => 'Fully Configured Oxford Shirt',
            'slug' => 'fully-configured-oxford-shirt',
            'sku' => 'OXF-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 25.00,
            'bulk_threshold' => 150,
            'bulk_price' => 20.00,
            'full_stock_price' => 18.00,
            'warehouse_id' => $this->warehouse->id,
            'status' => 'published',
            'variants' => [
                ['color' => 'Heather Grey', 'size' => 'S', 'stock' => 80],
                ['color' => 'Heather Grey', 'size' => 'M', 'stock' => 80],
                ['color' => 'Heather Grey', 'size' => 'L', 'stock' => 80],
            ],
            'package_allocations' => [
                ['color' => 'Heather Grey', 'size' => 'S', 'quantity' => 5],
                ['color' => 'Heather Grey', 'size' => 'M', 'quantity' => 10],
                ['color' => 'Heather Grey', 'size' => 'L', 'quantity' => 10],
            ],
            'shipping_package_profiles' => [
                [
                    'gross_weight' => 18.5,
                    'weight_unit' => 'kg',
                    'carton_length' => 65,
                    'carton_width' => 45,
                    'carton_height' => 35,
                    'dimension_unit' => 'cm',
                ],
            ],
        ];

        $postRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $postRes->assertStatus(201);
        $productId = $postRes->json('data.id');

        // GET product (simulating page reload)
        $getRes = $this->getJson("/api/v1/products/{$productId}");
        $getRes->assertStatus(200);

        // Verify MOQ derived as 25 (5 + 10 + 10)
        $this->assertEquals(25, $getRes->json('data.moq'));
        $this->assertEquals(['Heather Grey'], $getRes->json('data.colors'));
        $this->assertEquals(['S', 'M', 'L'], $getRes->json('data.sizes'));

        // Verify package allocations
        $allocs = collect($getRes->json('data.package_allocations'));
        $this->assertCount(3, $allocs);
        $this->assertEquals(10, $allocs->firstWhere('size', 'M')['quantity']);

        // Verify shipping profile
        $shipping = collect($getRes->json('data.shipping_package_profiles'));
        $this->assertCount(1, $shipping);
        $this->assertEquals(18.5, (float) $shipping[0]['gross_weight']);
        $this->assertEquals(65.0, (float) $shipping[0]['carton_length']);
        $this->assertEquals(45.0, (float) $shipping[0]['carton_width']);
        $this->assertEquals(35.0, (float) $shipping[0]['carton_height']);
    }
}
