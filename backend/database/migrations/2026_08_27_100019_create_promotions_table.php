<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('type', 50)->default('banner'); // banner, limited-time, featured, clearance
            $table->string('image_url', 500)->nullable();
            $table->decimal('discount_percentage', 5, 2)->nullable();
            $table->string('button_text', 100)->nullable();
            $table->string('button_action', 100)->nullable();
            $table->string('button_target', 255)->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
