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
        // 1. Add is_featured_on_landing & landing_sort_order to brands
        Schema::table('brands', function (Blueprint $table) {
            if (!Schema::hasColumn('brands', 'is_featured_on_landing')) {
                $table->boolean('is_featured_on_landing')->default(false)->index()->after('is_active');
            }
            if (!Schema::hasColumn('brands', 'landing_sort_order')) {
                $table->integer('landing_sort_order')->default(0)->after('is_featured_on_landing');
            }
        });

        // 2. Add is_featured_on_landing & landing_sort_order to categories
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'is_featured_on_landing')) {
                $table->boolean('is_featured_on_landing')->default(false)->index()->after('is_active');
            }
            if (!Schema::hasColumn('categories', 'landing_sort_order')) {
                $table->integer('landing_sort_order')->default(0)->after('is_featured_on_landing');
            }
        });

        // 3. Add featured_sort_order to products
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'featured_sort_order')) {
                $table->integer('featured_sort_order')->default(0)->after('is_featured');
            }
        });

        // 4. Create homepage_featured_brands table
        if (!Schema::hasTable('homepage_featured_brands')) {
            Schema::create('homepage_featured_brands', function (Blueprint $table) {
                $table->id();
                $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();

                $table->unique('brand_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('homepage_featured_brands');

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'featured_sort_order')) {
                $table->dropColumn('featured_sort_order');
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'landing_sort_order')) {
                $table->dropColumn('landing_sort_order');
            }
            if (Schema::hasColumn('categories', 'is_featured_on_landing')) {
                $table->dropColumn('is_featured_on_landing');
            }
        });

        Schema::table('brands', function (Blueprint $table) {
            if (Schema::hasColumn('brands', 'landing_sort_order')) {
                $table->dropColumn('landing_sort_order');
            }
            if (Schema::hasColumn('brands', 'is_featured_on_landing')) {
                $table->dropColumn('is_featured_on_landing');
            }
        });
    }
};
