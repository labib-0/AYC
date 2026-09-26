<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Releases slugs and SKUs on any soft-deleted products so they can be immediately reused.
     */
    public function up(): void
    {
        $trashedProducts = DB::table('products')
            ->whereNotNull('deleted_at')
            ->where('slug', 'not like', '%-deleted-%')
            ->get(['id', 'slug', 'sku']);

        foreach ($trashedProducts as $p) {
            $uniqueSuffix = '-deleted-' . $p->id . '-' . time();
            $newSlug = substr($p->slug, 0, 200) . $uniqueSuffix;
            $newSku = !str_contains($p->sku, '-del-')
                ? substr($p->sku, 0, 200) . '-del-' . $p->id . '-' . time()
                : $p->sku;

            DB::table('products')->where('id', $p->id)->update([
                'slug' => $newSlug,
                'sku' => $newSku,
            ]);

            // Also clean up any orphan variants attached to the deleted product
            $variants = DB::table('product_variants')
                ->where('product_id', $p->id)
                ->where('sku', 'not like', '%-del-%')
                ->get(['id', 'sku']);

            foreach ($variants as $v) {
                DB::table('product_variants')->where('id', $v->id)->update([
                    'sku' => substr($v->sku, 0, 200) . '-del-' . $v->id . '-' . time(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Deleting/releasing slugs on soft-deleted items is non-reversible.
    }
};
