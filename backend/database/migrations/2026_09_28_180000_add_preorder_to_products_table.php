<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add preorder badge and estimated delivery date to products table.
     *
     * - is_preorder: boolean flag (default false)
     * - estimated_delivery_date: date (required when is_preorder = true)
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_preorder')->default(false)->after('is_best_deal')->index();
            $table->date('estimated_delivery_date')->nullable()->after('is_preorder');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['is_preorder', 'estimated_delivery_date']);
        });
    }
};
