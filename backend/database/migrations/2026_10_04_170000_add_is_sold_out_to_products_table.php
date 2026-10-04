<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add authoritative is_sold_out merchandising state to products table.
     * Default is false, indexed, safe additive migration.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_sold_out')) {
                $table->boolean('is_sold_out')->default(false)->after('is_preorder')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'is_sold_out')) {
                $table->dropColumn('is_sold_out');
            }
        });
    }
};
