<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cart_items') && !Schema::hasColumn('cart_items', 'pricing_mode')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->string('pricing_mode', 30)->nullable()->after('quantity');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cart_items') && Schema::hasColumn('cart_items', 'pricing_mode')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->dropColumn('pricing_mode');
            });
        }
    }
};
