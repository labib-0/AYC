<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->unique();
            $table->string('short_description', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('material', 100)->nullable();
            $table->string('color_name', 100)->nullable();
            $table->string('color_hex', 50)->nullable();
            $table->string('audience', 30)->default('UNISEX')->index(); // MEN, WOMEN, BOYS, GIRLS, UNISEX
            $table->string('product_type', 100)->default('Apparel');
            $table->string('collection_season', 100)->nullable();
            $table->decimal('wholesale_price', 12, 2);
            $table->decimal('msrp_price', 12, 2)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->unsignedInteger('moq')->default(1);
            $table->string('status', 30)->default('published')->index(); // draft, published, archived
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('is_hot')->default(false)->index();
            $table->boolean('is_new')->default(false)->index();
            $table->boolean('is_limited_deal')->default(false);
            $table->boolean('is_best_deal')->default(false);
            $table->string('video_url', 500)->nullable();
            $table->unsignedInteger('weight_grams')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'is_featured']);
            $table->index(['status', 'is_hot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
