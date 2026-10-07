<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to consolidate duplicate categories and fix spelling inconsistencies at the authoritative DB level.
     */
    public function up(): void
    {
        if (!Schema::hasTable('categories') || !Schema::hasTable('category_product')) {
            return;
        }

        // 1. Consolidate SWETER into Sweater
        $canonicalSweater = DB::table('categories')
            ->where(function ($q) {
                $q->where('slug', 'sweater')
                  ->orWhere('slug', 'sweaters')
                  ->orWhere('name', 'Sweater')
                  ->orWhere('name', 'Sweaters');
            })
            ->where('slug', '!=', 'sweter')
            ->orderBy('id', 'asc')
            ->first();

        $dupSweater = DB::table('categories')
            ->where(function ($q) {
                $q->where('slug', 'sweter')
                  ->orWhere('name', 'SWETER')
                  ->orWhere('name', 'sweter');
            })
            ->first();

        if ($dupSweater && $canonicalSweater) {
            // Re-point product relations
            $dupPivotProducts = DB::table('category_product')
                ->where('category_id', $dupSweater->id)
                ->pluck('product_id');

            foreach ($dupPivotProducts as $productId) {
                $existsInCanonical = DB::table('category_product')
                    ->where('product_id', $productId)
                    ->where('category_id', $canonicalSweater->id)
                    ->exists();

                if (!$existsInCanonical) {
                    DB::table('category_product')->insert([
                        'product_id' => $productId,
                        'category_id' => $canonicalSweater->id,
                    ]);
                }
            }

            // Remove pivot entries for duplicate
            DB::table('category_product')->where('category_id', $dupSweater->id)->delete();

            // Re-point homepage_hot_sale_categories if any
            if (Schema::hasTable('homepage_hot_sale_categories')) {
                DB::table('homepage_hot_sale_categories')
                    ->where('category_id', $dupSweater->id)
                    ->delete();
            }

            // Delete duplicate category
            DB::table('categories')->where('id', $dupSweater->id)->delete();
        } elseif ($dupSweater && !$canonicalSweater) {
            // Simply fix the spelling if only the misspelled one exists
            DB::table('categories')
                ->where('id', $dupSweater->id)
                ->update([
                    'name' => 'Sweaters',
                    'slug' => 'sweaters',
                ]);
        }

        // 2. Consolidate duplicate Trousers (trousers-1 into trousers)
        $canonicalTrousers = DB::table('categories')
            ->where('slug', 'trousers')
            ->orderBy('id', 'asc')
            ->first();

        $dupTrousers = DB::table('categories')
            ->where('slug', 'trousers-1')
            ->first();

        if ($dupTrousers && $canonicalTrousers) {
            $dupPivotProducts = DB::table('category_product')
                ->where('category_id', $dupTrousers->id)
                ->pluck('product_id');

            foreach ($dupPivotProducts as $productId) {
                $existsInCanonical = DB::table('category_product')
                    ->where('product_id', $productId)
                    ->where('category_id', $canonicalTrousers->id)
                    ->exists();

                if (!$existsInCanonical) {
                    DB::table('category_product')->insert([
                        'product_id' => $productId,
                        'category_id' => $canonicalTrousers->id,
                    ]);
                }
            }

            DB::table('category_product')->where('category_id', $dupTrousers->id)->delete();

            if (Schema::hasTable('homepage_hot_sale_categories')) {
                DB::table('homepage_hot_sale_categories')
                    ->where('category_id', $dupTrousers->id)
                    ->delete();
            }

            DB::table('categories')->where('id', $dupTrousers->id)->delete();
        }

        // 3. Fix SPORTWEAR -> Sportswear spelling if present
        DB::table('categories')
            ->where(function ($q) {
                $q->where('name', 'SPORTWEAR')
                  ->orWhere('name', 'Sportwear')
                  ->orWhere('slug', 'sportwear');
            })
            ->update([
                'name' => 'Sportswear',
                'slug' => 'sportswear',
            ]);

        // Standardize Sweater name to plural or standard display
        DB::table('categories')
            ->where('slug', 'sweater')
            ->where('name', 'Sweater')
            ->update([
                'name' => 'Sweaters',
                'slug' => 'sweaters',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Consolidation is irreversible data hygiene.
    }
};
