<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add stock column to products table
        if (!Schema::hasColumn('products', 'stock')) {
            Schema::table('products', function (Blueprint $table) {
                $table->integer('stock')->default(0)->after('moq');
            });
        }

        // 2. Allow product_variant_id to be nullable in inventories table
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE inventories ALTER COLUMN product_variant_id DROP NOT NULL');
        } else {
            Schema::table('inventories', function (Blueprint $table) {
                $table->unsignedBigInteger('product_variant_id')->nullable()->change();
            });
        }

        // 3. Add product_id to inventories table for direct product-level warehouse inventory
        if (!Schema::hasColumn('inventories', 'product_id')) {
            Schema::table('inventories', function (Blueprint $table) {
                $table->foreignId('product_id')->nullable()->after('id')->constrained('products')->cascadeOnDelete();
                $table->index(['product_id', 'warehouse_id']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('inventories', 'product_id')) {
            Schema::table('inventories', function (Blueprint $table) {
                $table->dropForeign(['product_id']);
                $table->dropColumn('product_id');
            });
        }

        if (Schema::hasColumn('products', 'stock')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('stock');
            });
        }
    }
};
