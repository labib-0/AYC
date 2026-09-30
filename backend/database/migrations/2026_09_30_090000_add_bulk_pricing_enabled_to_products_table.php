<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('bulk_pricing_enabled')->default(false)->after('bulk_price');
        });

        // Audit and preserve existing products with valid configured bulk pricing
        DB::table('products')
            ->whereNotNull('bulk_threshold')
            ->whereNotNull('bulk_price')
            ->where('bulk_threshold', '>', 0)
            ->where('bulk_price', '>', 0)
            ->update(['bulk_pricing_enabled' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('bulk_pricing_enabled');
        });
    }
};
