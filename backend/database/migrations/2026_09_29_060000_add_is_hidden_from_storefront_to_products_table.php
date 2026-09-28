<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_hidden_from_storefront')) {
                $table->boolean('is_hidden_from_storefront')->default(false)->after('status')->index();
            }
        });

        // Make product_variants.sku nullable and drop unique constraint so variants don't require or generate SKUs,
        // while preserving historical SKU data.
        Schema::table('product_variants', function (Blueprint $table) {
            if (Schema::hasColumn('product_variants', 'sku')) {
                try {
                    $table->dropUnique('product_variants_sku_unique');
                } catch (\Throwable $e) {
                    // Index might not exist or be named differently
                }
                $table->string('sku')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'is_hidden_from_storefront')) {
                $table->dropColumn('is_hidden_from_storefront');
            }
        });

        Schema::table('product_variants', function (Blueprint $table) {
            if (Schema::hasColumn('product_variants', 'sku')) {
                try {
                    $table->unique('sku', 'product_variants_sku_unique');
                } catch (\Throwable $e) {
                }
            }
        });
    }
};
