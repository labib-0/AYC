<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('new_until')->nullable()->after('is_new')->index();
            $table->timestamp('hot_until')->nullable()->after('is_hot')->index();
            $table->timestamp('featured_until')->nullable()->after('is_featured')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['new_until', 'hot_until', 'featured_until']);
        });
    }
};
