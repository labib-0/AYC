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
            if (!Schema::hasColumn('products', 'is_pinned')) {
                $table->boolean('is_pinned')->default(false)->index();
            }
            if (!Schema::hasColumn('products', 'pinned_order')) {
                $table->integer('pinned_order')->default(0)->index();
            }
        });

        // Sync initial values from existing is_featured and featured_sort_order columns
        if (Schema::hasColumn('products', 'is_featured') && Schema::hasColumn('products', 'is_pinned')) {
            DB::statement("UPDATE products SET is_pinned = is_featured, pinned_order = COALESCE(featured_sort_order, 0)");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'is_pinned')) {
                $table->dropColumn('is_pinned');
            }
            if (Schema::hasColumn('products', 'pinned_order')) {
                $table->dropColumn('pinned_order');
            }
        });
    }
};
