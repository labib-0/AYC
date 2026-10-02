<?php

namespace App\Services\Catalog;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

class AdminProductMetricsService
{
    /**
     * Authoritative definition of Admin product catalog statistics.
     * Shared across Admin Dashboard and Admin Products catalog page.
     *
     * Rules:
     * - total_products: count of all non-deleted catalog products in the database
     * - published_products: count of customer-visible live published products
     * - active_products: alias for published_products
     * - draft_products: count of products in draft status
     * - archived_products: count of products in archived status
     * - low_stock_products: count of unique products whose available stock is strictly below effective MOQ
     * - low_stock_items: alias for low_stock_products
     * - price_pending_products: count of products with null purchase_price_updated_at
     *
     * @return array{
     *     total_products: int,
     *     published_products: int,
     *     active_products: int,
     *     draft_products: int,
     *     archived_products: int,
     *     low_stock_products: int,
     *     low_stock_items: int,
     *     price_pending_products: int
     * }
     */
    public function getMetrics(): array
    {
        $totalProducts = Product::count();
        $publishedProducts = Product::storefrontVisible()->count();
        $draftProducts = Product::where('status', 'draft')->count();
        $archivedProducts = Product::where('status', 'archived')->count();

        $lowStockQuery = "
            SELECT COUNT(*) as cnt FROM (
                SELECT products.id,
                       CASE WHEN products.moq IS NOT NULL AND products.moq > 1 THEN products.moq ELSE 1 END as effective_moq,
                       CASE
                           WHEN EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = products.id)
                           THEN COALESCE((
                               SELECT SUM(
                                   CASE
                                       WHEN EXISTS (SELECT 1 FROM inventories i WHERE i.product_variant_id = pv.id)
                                       THEN COALESCE((SELECT SUM(quantity) FROM inventories i WHERE i.product_variant_id = pv.id), 0)
                                       ELSE COALESCE(pv.stock, 0)
                                   END
                               ) FROM product_variants pv WHERE pv.product_id = products.id
                           ), 0)
                           WHEN EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = products.id)
                           THEN COALESCE((SELECT SUM(quantity) FROM inventories i WHERE i.product_id = products.id), 0)
                           ELSE CASE WHEN products.stock > 0 THEN products.stock ELSE 0 END
                       END as available_stock
                FROM products
                WHERE products.deleted_at IS NULL
            ) sub
            WHERE sub.available_stock < sub.effective_moq
        ";
        $row = DB::selectOne($lowStockQuery);
        $lowStockProducts = (int) ($row->cnt ?? 0);

        $pricePendingProducts = Product::whereNull('purchase_price_updated_at')->count();

        return [
            'total_products' => $totalProducts,
            'published_products' => $publishedProducts,
            'active_products' => $publishedProducts,
            'draft_products' => $draftProducts,
            'archived_products' => $archivedProducts,
            'low_stock_products' => $lowStockProducts,
            'low_stock_items' => $lowStockProducts,
            'price_pending_products' => $pricePendingProducts,
        ];
    }
}
