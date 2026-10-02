<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Safe backfill for Package Assortment message on existing products.
     * Preserves all existing custom messages and updates only NULL/empty/whitespace-only records.
     */
    public function up(): void
    {
        if (!Schema::hasTable('products') || !Schema::hasColumn('products', 'package_assortment_message')) {
            return;
        }

        $defaultMessage = Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;

        // Safely and idempotently backfill products where package_assortment_message is NULL or whitespace-only
        DB::table('products')
            ->whereNull('package_assortment_message')
            ->orWhereRaw("TRIM(COALESCE(package_assortment_message, '')) = ''")
            ->update([
                'package_assortment_message' => $defaultMessage,
            ]);

        // Secondary guarantee to catch any remaining unicode or edge whitespace across DB engines
        DB::table('products')
            ->select(['id', 'package_assortment_message'])
            ->orderBy('id')
            ->chunk(100, function ($rows) use ($defaultMessage) {
                foreach ($rows as $row) {
                    if (empty(trim($row->package_assortment_message ?? ''))) {
                        DB::table('products')
                            ->where('id', $row->id)
                            ->update(['package_assortment_message' => $defaultMessage]);
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data backfill migration is safely non-destructive. No-op on down to preserve data integrity.
    }
};
