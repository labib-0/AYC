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
        // 1. Homepage Banners Table
        Schema::create('homepage_banners', function (Blueprint $table) {
            $table->id();
            $table->string('image_path', 500)->nullable();
            $table->string('image_url', 500)->nullable();
            $table->string('headline', 255);
            $table->string('subtitle', 500)->nullable();
            $table->string('cta_text', 100)->nullable()->default('EXPLORE CATALOG →');
            $table->string('destination_type', 50)->nullable()->default('anchor'); // anchor, url, category, product
            $table->string('destination_value', 255)->nullable()->default('#featured');
            $table->boolean('is_active')->default(true)->index();
            $table->integer('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Homepage Hot Sale Categories Table
        Schema::create('homepage_hot_sale_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique('category_id');
        });

        // 3. Homepage Featured Products Table
        Schema::create('homepage_featured_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique('product_id');
        });

        // Seed initial data if tables exist
        $now = now();

        // Seed default banner
        DB::table('homepage_banners')->insert([
            'headline' => 'YOUR WHOLESALE APPAREL SOURCING PARTNER',
            'subtitle' => 'Quality apparel for retailers, boutiques and bulk buyers, with dependable sourcing and export-ready support.',
            'image_url' => '/images/homepage-banner.jpg',
            'cta_text' => 'EXPLORE CATALOG →',
            'destination_type' => 'anchor',
            'destination_value' => '#featured',
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Seed initial hot sale categories: Sweaters & Towels
        $sweaterCat = DB::table('categories')->where('slug', 'sweaters')->first();
        $towelCat = DB::table('categories')->where('slug', 'towels')->first();

        if ($sweaterCat) {
            DB::table('homepage_hot_sale_categories')->insert([
                'category_id' => $sweaterCat->id,
                'sort_order' => 0,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        if ($towelCat) {
            DB::table('homepage_hot_sale_categories')->insert([
                'category_id' => $towelCat->id,
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Seed initial featured products from published products
        $initialFeatured = DB::table('products')
            ->where('status', 'published')
            ->whereNull('deleted_at')
            ->orderBy('id', 'asc')
            ->limit(6)
            ->get();

        foreach ($initialFeatured as $idx => $p) {
            DB::table('homepage_featured_products')->insert([
                'product_id' => $p->id,
                'sort_order' => $idx,
                'is_active' => true,
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
        Schema::dropIfExists('homepage_featured_products');
        Schema::dropIfExists('homepage_hot_sale_categories');
        Schema::dropIfExists('homepage_banners');
    }
};
