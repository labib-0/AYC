<?php

namespace Tests\Feature\Catalog;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPackageAllocation;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualPackageAssortmentTest extends TestCase
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

        $this->brand = Brand::create(['name' => 'Ayaan Luxury', 'slug' => 'ayaan-luxury']);
        $this->category = Category::create(['name' => 'Knitwear', 'slug' => 'knitwear']);
        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka WH',
            'code' => 'WH-DHK',
            'city' => 'Dhaka',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * Case 1-5: Create product with 2 colors x 4 sizes with unique manual assortment, save, reload, verify.
     */
    public function test_create_product_with_manual_package_assortment_persists_exact_values(): void
    {
        $payload = [
            'product_id' => 'AYC-CSH-001',
            'name' => 'Manual Assorted Cashmere Knit',
            'slug' => 'manual-assorted-cashmere-knit',
            'sku' => 'AYN-CSH-001',
            'brand_id' => $this->brand->id,
            'categories' => [$this->category->id],
            'wholesale_price' => 45.00,
            'bulk_threshold' => 100,
            'bulk_price' => 38.00,
            'full_stock_price' => 32.00,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 20,
            'status' => 'published',
            'variants' => [
                ['color' => 'Black', 'size' => 'S', 'stock' => 50],
                ['color' => 'Black', 'size' => 'M', 'stock' => 50],
                ['color' => 'Black', 'size' => 'L', 'stock' => 50],
                ['color' => 'Black', 'size' => 'XL', 'stock' => 50],
                ['color' => 'White', 'size' => 'S', 'stock' => 40],
                ['color' => 'White', 'size' => 'M', 'stock' => 40],
                ['color' => 'White', 'size' => 'L', 'stock' => 40],
                ['color' => 'White', 'size' => 'XL', 'stock' => 40],
            ],
            // Authoritative manually entered package assortment
            // Black: S=2, M=4, L=4, XL=2 -> sum 12
            // White: S=1, M=3, L=3, XL=1 -> sum 8
            // Total package units = 20 (equals MOQ 20)
            'package_allocations' => [
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'S', 'quantity' => 2],
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'M', 'quantity' => 4],
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'L', 'quantity' => 4],
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'XL', 'quantity' => 2],
                ['package_name' => 'Pack A', 'color' => 'White', 'size' => 'S', 'quantity' => 1],
                ['package_name' => 'Pack A', 'color' => 'White', 'size' => 'M', 'quantity' => 3],
                ['package_name' => 'Pack A', 'color' => 'White', 'size' => 'L', 'quantity' => 3],
                ['package_name' => 'Pack A', 'color' => 'White', 'size' => 'XL', 'quantity' => 1],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $response->assertStatus(201);
        $productId = $response->json('data.id');

        // Verify stored directly in database
        $this->assertDatabaseCount('product_package_allocations', 8);

        $blackM = ProductPackageAllocation::where('product_id', $productId)
            ->where('color', 'Black')
            ->where('size', 'M')
            ->first();
        $this->assertNotNull($blackM);
        $this->assertEquals(4, $blackM->quantity);
        $this->assertEquals('Pack A', $blackM->package_name);

        $whiteS = ProductPackageAllocation::where('product_id', $productId)
            ->where('color', 'White')
            ->where('size', 'S')
            ->first();
        $this->assertNotNull($whiteS);
        $this->assertEquals(1, $whiteS->quantity);

        // Reload via API and confirm exact values returned
        $getRes = $this->getJson("/api/v1/products/{$productId}");
        $getRes->assertStatus(200);

        $allocations = collect($getRes->json('data.package_allocations'));
        $this->assertCount(8, $allocations);

        $retrievedBlackM = $allocations->first(fn($a) => $a['color'] === 'Black' && $a['size'] === 'M');
        $this->assertEquals(4, $retrievedBlackM['quantity']);
        $this->assertEquals('Pack A', $retrievedBlackM['package_name']);
    }

    /**
     * Case 7-11: Edit assortment after publishing, change one cell, verify exact persistence.
     */
    public function test_edit_assortment_after_publishing_modifies_only_intended_cell(): void
    {
        $product = Product::create([
            'name' => 'Merino Zip Cardigan',
            'slug' => 'merino-zip-cardigan',
            'sku' => 'AYN-CRD-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 50.00,
            'bulk_threshold' => 100,
            'bulk_price' => 40.00,
            'moq' => 20,
            'status' => 'published',
        ]);

        $vBlackS = ProductVariant::create(['product_id' => $product->id, 'sku' => 'CRD-BLK-S', 'title' => 'Color: Black / Size: S', 'color' => 'Black', 'size' => 'S', 'stock' => 50]);
        $vBlackM = ProductVariant::create(['product_id' => $product->id, 'sku' => 'CRD-BLK-M', 'title' => 'Color: Black / Size: M', 'color' => 'Black', 'size' => 'M', 'stock' => 50]);

        ProductPackageAllocation::create(['product_id' => $product->id, 'product_variant_id' => $vBlackS->id, 'package_name' => 'Pack A', 'color' => 'Black', 'size' => 'S', 'quantity' => 10]);
        ProductPackageAllocation::create(['product_id' => $product->id, 'product_variant_id' => $vBlackM->id, 'package_name' => 'Pack A', 'color' => 'Black', 'size' => 'M', 'quantity' => 10]);

        // Admin changes Black / S: 10 -> 8 and Black / M: 10 -> 12 (sum remains 20)
        $updatePayload = [
            'package_allocations' => [
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'S', 'quantity' => 8],
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'M', 'quantity' => 12],
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", $updatePayload);
        $res->assertStatus(200);

        // Reload from DB and verify
        $updatedBlackS = ProductPackageAllocation::where('product_id', $product->id)->where('size', 'S')->first();
        $updatedBlackM = ProductPackageAllocation::where('product_id', $product->id)->where('size', 'M')->first();

        $this->assertEquals(8, $updatedBlackS->quantity);
        $this->assertEquals(12, $updatedBlackM->quantity);
    }

    /**
     * Case 12-13: Changing inventory or product description does NOT reset or touch assortment.
     */
    public function test_changing_inventory_or_description_does_not_modify_assortment(): void
    {
        $product = Product::create([
            'name' => 'Oxford Button Down',
            'slug' => 'oxford-button-down',
            'sku' => 'AYN-OXF-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 30.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        $variant = ProductVariant::create(['product_id' => $product->id, 'sku' => 'OXF-BLU-M', 'title' => 'Color: Blue / Size: M', 'color' => 'Blue', 'size' => 'M', 'stock' => 80]);
        $allocation = ProductPackageAllocation::create([
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'package_name' => 'Pack A',
            'color' => 'Blue',
            'size' => 'M',
            'quantity' => 10,
        ]);

        // Admin updates description and variant stock from 80 -> 250 without passing package_allocations
        $res = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
            'description' => 'Updated premium 100% Egyptian cotton Oxford cloth.',
            'wholesale_price' => 32.00,
            'variants' => [
                ['id' => $variant->id, 'color' => 'Blue', 'size' => 'M', 'stock' => 250],
            ],
        ]);
        $res->assertStatus(200);

        // Assortment must remain untouched at 10
        $this->assertDatabaseHas('product_package_allocations', [
            'id' => $allocation->id,
            'quantity' => 10,
        ]);
    }

    /**
     * Case 14-17: Distinction between 0 (explicitly zero) and unconfigured cells.
     */
    public function test_distinction_between_zero_and_unconfigured_cells(): void
    {
        $payload = [
            'product_id' => 'AYC-SWT-002',
            'name' => 'Fleece Crewneck Sweatshirt',
            'slug' => 'fleece-crewneck-sweatshirt',
            'sku' => 'AYN-SWT-002',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 25.00,
            'bulk_threshold' => 100,
            'bulk_price' => 20.00,
            'full_stock_price' => 18.00,
            'warehouse_id' => $this->warehouse->id,
            'moq' => 10,
            'status' => 'published',
            'package_allocations' => [
                // Black S is intentionally 0 (excluded from pack)
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'S', 'quantity' => 0],
                ['package_name' => 'Pack A', 'color' => 'Black', 'size' => 'M', 'quantity' => 10],
                // White S and White M are completely unconfigured (omitted)
            ],
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', $payload);
        $res->assertStatus(201);
        $productId = $res->json('data.id');

        // Black S should exist with quantity = 0
        $this->assertDatabaseHas('product_package_allocations', [
            'product_id' => $productId,
            'color' => 'Black',
            'size' => 'S',
            'quantity' => 0,
        ]);

        // White S was not configured, so no row exists
        $this->assertDatabaseMissing('product_package_allocations', [
            'product_id' => $productId,
            'color' => 'White',
        ]);
    }

    /**
     * Case 18-19: Package scaling uses authoritative assortment, but does NOT auto-calculate if unconfigured.
     */
    public function test_package_breakdown_never_auto_calculates_when_unconfigured(): void
    {
        $product = Product::create([
            'name' => 'Unconfigured Assortment Product',
            'slug' => 'unconfigured-assortment-product',
            'sku' => 'AYN-UNC-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'moq' => 10,
            'status' => 'published',
        ]);

        ProductVariant::create(['product_id' => $product->id, 'sku' => 'UNC-BLK-S', 'title' => 'Color: Black / Size: S', 'color' => 'Black', 'size' => 'S', 'stock' => 100]);
        ProductVariant::create(['product_id' => $product->id, 'sku' => 'UNC-BLK-M', 'title' => 'Color: Black / Size: M', 'color' => 'Black', 'size' => 'M', 'stock' => 100]);

        // Product has variants and stock, but NO package assortment configured
        $breakdown = $product->getPackageBreakdownForQuantity(10);
        $this->assertEmpty($breakdown, "Assortment must NOT be auto-calculated when unconfigured.");
    }

    /**
     * Validation rules: integer, non-negative.
     */
    public function test_validation_rejects_negative_or_decimal_quantities(): void
    {
        // Negative quantity
        $resNeg = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Invalid Assortment 1',
            'slug' => 'invalid-assortment-1',
            'sku' => 'AYN-INV-001',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'moq' => 10,
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'S', 'quantity' => -2],
                ['color' => 'Black', 'size' => 'M', 'quantity' => 12],
            ],
        ]);
        $resNeg->assertStatus(422);

        // Decimal quantity
        $resDec = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/products', [
            'name' => 'Invalid Assortment 2',
            'slug' => 'invalid-assortment-2',
            'sku' => 'AYN-INV-002',
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
            'moq' => 10,
            'package_allocations' => [
                ['color' => 'Black', 'size' => 'S', 'quantity' => 1.5],
                ['color' => 'Black', 'size' => 'M', 'quantity' => 8.5],
            ],
        ]);
        $resDec->assertStatus(422);
    }
}
