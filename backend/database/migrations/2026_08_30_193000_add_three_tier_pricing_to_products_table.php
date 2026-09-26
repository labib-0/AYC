<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('bulk_threshold')->nullable()->after('moq');
            $table->decimal('bulk_price', 12, 2)->nullable()->after('bulk_threshold');
            $table->decimal('full_stock_price', 12, 2)->nullable()->after('bulk_price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['bulk_threshold', 'bulk_price', 'full_stock_price']);
        });
    }
};
