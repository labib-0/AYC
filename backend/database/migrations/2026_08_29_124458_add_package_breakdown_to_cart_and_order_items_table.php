<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropUnique(['cart_id', 'product_id', 'size']);
            $table->foreignId('product_variant_id')->nullable()->change();
            $table->string('size', 50)->nullable()->change();
            $table->json('package_breakdown')->nullable();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->json('package_breakdown')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn('package_breakdown');
            // Depending on data, restoring unique constraint might fail.
        });
        
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('package_breakdown');
        });
    }
};
