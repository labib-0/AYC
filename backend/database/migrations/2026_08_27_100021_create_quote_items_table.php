<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained('quotes')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');
            $table->string('product_slug')->nullable();
            $table->string('brand', 100)->nullable();
            $table->string('sku', 100)->nullable();
            $table->string('image_url', 500)->nullable();
            $table->string('selected_color', 50)->nullable();
            $table->string('selected_size', 50)->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('moq')->default(1);
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->decimal('target_price', 12, 2)->nullable();
            $table->text('buyer_notes')->nullable();
            $table->timestamps();

            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_items');
    }
};
