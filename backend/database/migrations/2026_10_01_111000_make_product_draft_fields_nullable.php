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
            $table->string('name')->nullable()->change();
            $table->decimal('wholesale_price', 12, 2)->nullable()->change();
            $table->unsignedInteger('moq')->nullable()->default(null)->change();
            $table->string('audience', 30)->nullable()->default(null)->change();
            $table->string('product_type', 100)->nullable()->default(null)->change();
            $table->string('design_type', 50)->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->decimal('wholesale_price', 12, 2)->nullable(false)->change();
            $table->unsignedInteger('moq')->nullable(false)->default(1)->change();
            $table->string('audience', 30)->nullable(false)->default('UNISEX')->change();
            $table->string('product_type', 100)->nullable(false)->default('Apparel')->change();
            $table->string('design_type', 50)->nullable(false)->default('ORIGINAL')->change();
        });
    }
};
