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
        // 1. quotes table: index user_id and composite (user_id, created_at)
        if (Schema::hasTable('quotes')) {
            Schema::table('quotes', function (Blueprint $table) {
                $table->index(['user_id', 'created_at'], 'quotes_user_id_created_at_idx');
                $table->index('user_id', 'quotes_user_id_idx');
            });
        }

        // 2. order_items table: index product_id for analytics and product lookups
        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->index('product_id', 'order_items_product_id_idx');
            });
        }

        // 3. quotations table: index (status, valid_until) for scheduler expiry checks & quote_id for RFQ joins
        if (Schema::hasTable('quotations')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->index(['status', 'valid_until'], 'quotations_status_valid_until_idx');
                $table->index('quote_id', 'quotations_quote_id_idx');
            });
        }

        // 4. category_product table: index category_id for fast catalog filtering by category
        if (Schema::hasTable('category_product')) {
            Schema::table('category_product', function (Blueprint $table) {
                $table->index('category_id', 'category_product_category_id_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('quotes')) {
            Schema::table('quotes', function (Blueprint $table) {
                $table->dropIndex('quotes_user_id_created_at_idx');
                $table->dropIndex('quotes_user_id_idx');
            });
        }

        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropIndex('order_items_product_id_idx');
            });
        }

        if (Schema::hasTable('quotations')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->dropIndex('quotations_status_valid_until_idx');
                $table->dropIndex('quotations_quote_id_idx');
            });
        }

        if (Schema::hasTable('category_product')) {
            Schema::table('category_product', function (Blueprint $table) {
                $table->dropIndex('category_product_category_id_idx');
            });
        }
    }
};
