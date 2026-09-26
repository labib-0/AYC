<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_package_allocations', function (Blueprint $table) {
            $table->string('package_name', 100)->default('Pack A')->after('product_id');
            $table->string('color', 100)->nullable()->after('package_name');
            $table->string('size', 50)->nullable()->after('color');
            $table->foreignId('product_variant_id')->nullable()->change();
            
            // Drop old unique constraint
            $table->dropUnique('pkg_alloc_prod_var_unique');
        });

        // Backfill existing rows with variant color and size
        $allocations = DB::table('product_package_allocations')
            ->whereNotNull('product_variant_id')
            ->get();

        foreach ($allocations as $allocation) {
            $variant = DB::table('product_variants')->where('id', $allocation->product_variant_id)->first();
            if ($variant) {
                DB::table('product_package_allocations')
                    ->where('id', $allocation->id)
                    ->update([
                        'package_name' => $allocation->package_name ?: 'Pack A',
                        'color' => $variant->color,
                        'size' => $variant->size,
                    ]);
            }
        }

        Schema::table('product_package_allocations', function (Blueprint $table) {
            $table->unique(['product_id', 'package_name', 'color', 'size'], 'pkg_alloc_prod_pkg_color_size_unique');
        });
    }

    public function down(): void
    {
        Schema::table('product_package_allocations', function (Blueprint $table) {
            $table->dropUnique('pkg_alloc_prod_pkg_color_size_unique');
            $table->dropColumn(['package_name', 'color', 'size']);
            $table->unique(['product_id', 'product_variant_id'], 'pkg_alloc_prod_var_unique');
        });
    }
};
