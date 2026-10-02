<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Safe performance indexes for homepage featured products queries.
     */
    public function up(): void
    {
        // 1. Composite index on homepage_featured_products for active pinned sort_order lookup
        if (Schema::hasTable('homepage_featured_products')) {
            Schema::table('homepage_featured_products', function (Blueprint $table) {
                $table->index(['is_active', 'sort_order'], 'hfp_active_sort_idx');
            });
        }

        // 2. Composite index on products for storefront visibility and created_at ordering
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index(['status', 'is_hidden_from_storefront', 'created_at'], 'products_storefront_created_at_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('homepage_featured_products')) {
            Schema::table('homepage_featured_products', function (Blueprint $table) {
                $table->dropIndex('hfp_active_sort_idx');
            });
        }

        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('products_storefront_created_at_idx');
            });
        }
    }
};
