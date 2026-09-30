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
            if (!Schema::hasColumn('products', 'seo_title')) {
                $table->string('seo_title', 255)->nullable()->after('description');
            }
            if (!Schema::hasColumn('products', 'seo_description')) {
                $table->text('seo_description')->nullable()->after('seo_title');
            }
            if (!Schema::hasColumn('products', 'keywords')) {
                $table->json('keywords')->nullable()->after('seo_description');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('products', 'keywords')) {
                $cols[] = 'keywords';
            }
            if (Schema::hasColumn('products', 'seo_description')) {
                $cols[] = 'seo_description';
            }
            if (Schema::hasColumn('products', 'seo_title')) {
                $cols[] = 'seo_title';
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
