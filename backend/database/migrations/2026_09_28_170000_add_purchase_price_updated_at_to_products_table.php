<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add purchase_price_updated_at to products table.
 *
 * Tracks whether Admin has explicitly set a valid purchase (cost) price.
 * NULL  → Purchase Price Pending (never set or always zero).
 * !NULL → Purchase Price Updated (Admin has entered a valid cost_price > 0).
 *
 * Backfill: existing products with cost_price > 0 are stamped with created_at
 * so historical records are not wiped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('purchase_price_updated_at')
                ->nullable()
                ->after('cost_price')
                ->comment('Set when Admin saves a valid cost_price > 0. NULL = Pending.');
        });

        // Backfill: stamp existing products that already have a cost_price set
        \DB::statement("
            UPDATE products
            SET purchase_price_updated_at = updated_at
            WHERE cost_price IS NOT NULL AND cost_price > 0
              AND purchase_price_updated_at IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('purchase_price_updated_at');
        });
    }
};
