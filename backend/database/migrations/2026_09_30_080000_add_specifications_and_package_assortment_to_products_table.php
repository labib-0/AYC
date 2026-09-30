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
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'size_description')) {
                $table->string('size_description', 255)->nullable()->after('material');
            }
            if (!Schema::hasColumn('products', 'colour_description')) {
                $table->string('colour_description', 255)->nullable()->after('size_description');
            }
            if (!Schema::hasColumn('products', 'package_assortment_visible')) {
                $table->boolean('package_assortment_visible')->default(true)->after('is_hidden_from_storefront')->index();
            }
            if (!Schema::hasColumn('products', 'package_assortment_message')) {
                $table->text('package_assortment_message')->nullable()->after('package_assortment_visible');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('products', 'size_description')) {
                $cols[] = 'size_description';
            }
            if (Schema::hasColumn('products', 'colour_description')) {
                $cols[] = 'colour_description';
            }
            if (Schema::hasColumn('products', 'package_assortment_visible')) {
                $cols[] = 'package_assortment_visible';
            }
            if (Schema::hasColumn('products', 'package_assortment_message')) {
                $cols[] = 'package_assortment_message';
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
