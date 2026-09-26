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
        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('buying_price_at_sale', 12, 2)->nullable()->after('unit_price');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index(['created_at', 'status'], 'orders_created_at_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_created_at_status_idx');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('buying_price_at_sale');
        });
    }
};
