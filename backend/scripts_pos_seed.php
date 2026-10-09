<?php

use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Warehouse;

$brand = Brand::first();
$wh = Warehouse::first();

// 1. Variantless Product
$p1 = Product::updateOrCreate(
    ['sku' => 'AYN-POS-TEST-001'],
    [
        'name' => 'POS Cashier Test Beanie',
        'slug' => 'pos-cashier-test-beanie',
        'wholesale_price' => 20.00,
        'retail_price' => 30.00,
        'stock' => 50,
        'moq' => 1,
        'status' => 'published',
        'brand_id' => $brand?->id,
        'has_variants' => false,
        'is_sold_out' => false,
    ]
);
Inventory::updateOrCreate(
    ['product_id' => $p1->id, 'warehouse_id' => $wh->id],
    ['quantity' => 50]
);

// 2. Product With Variants (no package allocations)
$p2 = Product::updateOrCreate(
    ['sku' => 'AYN-POS-VAR-PARENT'],
    [
        'name' => 'POS Cashier Test Polo',
        'slug' => 'pos-cashier-test-polo',
        'wholesale_price' => 25.00,
        'retail_price' => 40.00,
        'stock' => 100,
        'moq' => 1,
        'status' => 'published',
        'brand_id' => $brand?->id,
        'has_variants' => true,
        'is_sold_out' => false,
    ]
);

// Delete existing variants to recreate cleanly
ProductVariant::where('product_id', $p2->id)->delete();

$v1 = ProductVariant::create([
    'product_id' => $p2->id,
    'sku' => 'AYN-POS-VAR-M',
    'title' => 'Medium / Navy',
    'size' => 'M',
    'color' => 'Navy',
    'price' => 25.00,
    'stock' => 50,
    'is_active' => true,
]);
Inventory::updateOrCreate(
    ['product_id' => $p2->id, 'product_variant_id' => $v1->id, 'warehouse_id' => $wh->id],
    ['quantity' => 50]
);

$v2 = ProductVariant::create([
    'product_id' => $p2->id,
    'sku' => 'AYN-POS-VAR-L',
    'title' => 'Large / Navy',
    'size' => 'L',
    'color' => 'Navy',
    'price' => 25.00,
    'stock' => 50,
    'is_active' => true,
]);
Inventory::updateOrCreate(
    ['product_id' => $p2->id, 'product_variant_id' => $v2->id, 'warehouse_id' => $wh->id],
    ['quantity' => 50]
);

$v3 = ProductVariant::create([
    'product_id' => $p2->id,
    'sku' => 'AYN-POS-VAR-XL',
    'title' => 'Extra Large / Navy',
    'size' => 'XL',
    'color' => 'Navy',
    'price' => 25.00,
    'stock' => 0,
    'is_active' => true,
]);
Inventory::updateOrCreate(
    ['product_id' => $p2->id, 'product_variant_id' => $v3->id, 'warehouse_id' => $wh->id],
    ['quantity' => 0]
);

// 3. Sold-out Product
$p3 = Product::updateOrCreate(
    ['sku' => 'AYN-POS-SOLDOUT-001'],
    [
        'name' => 'POS Soldout Cap',
        'slug' => 'pos-soldout-cap',
        'wholesale_price' => 15.00,
        'retail_price' => 25.00,
        'stock' => 0,
        'moq' => 1,
        'status' => 'published',
        'brand_id' => $brand?->id,
        'has_variants' => false,
        'is_sold_out' => true,
    ]
);
Inventory::updateOrCreate(
    ['product_id' => $p3->id, 'warehouse_id' => $wh->id],
    ['quantity' => 0]
);

echo json_encode([
    'p1' => ['id' => $p1->id, 'sku' => $p1->sku],
    'p2' => ['id' => $p2->id, 'sku' => $p2->sku, 'v1' => $v1->sku, 'v2' => $v2->sku, 'v3' => $v3->sku],
    'p3' => ['id' => $p3->id, 'sku' => $p3->sku],
]);
