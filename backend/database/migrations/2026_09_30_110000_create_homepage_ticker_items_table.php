<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('homepage_ticker_items', function (Blueprint $table) {
            $table->id();
            $table->string('text', 255);
            $table->boolean('is_active')->default(true)->index();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed initial default ticker items
        $defaultKeywords = [
            'QUALITY',
            'FACTORY DIRECT',
            'EXPORT READY',
            'GLOBAL SHIPPING',
            'BULK ORDER SUPPORT',
            'QUALITY APPAREL',
            'VERIFIED STOCK',
            'BUSINESS SOURCING',
        ];

        $now = now();
        foreach ($defaultKeywords as $idx => $keyword) {
            DB::table('homepage_ticker_items')->insert([
                'text' => $keyword,
                'is_active' => true,
                'sort_order' => $idx,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('homepage_ticker_items');
    }
};
