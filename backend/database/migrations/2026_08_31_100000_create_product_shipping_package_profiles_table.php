<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_shipping_package_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('package_quantity');
            $table->unsignedInteger('quantity_max')->nullable();
            $table->unsignedInteger('carton_count')->default(1);
            $table->decimal('carton_length', 10, 2);
            $table->decimal('carton_width', 10, 2);
            $table->decimal('carton_height', 10, 2);
            $table->string('dimension_unit', 10)->default('cm');
            $table->decimal('gross_weight', 10, 2);
            $table->decimal('net_weight', 10, 2)->nullable();
            $table->string('weight_unit', 10)->default('kg');
            $table->string('notes', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['product_id', 'package_quantity']);
            $table->index(['product_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_shipping_package_profiles');
    }
};
