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
        Schema::table('brands', function (Blueprint $table) {
            $table->text('logo_url')->nullable()->change();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->text('image_url')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->string('logo_url', 500)->nullable()->change();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->string('image_url', 500)->nullable()->change();
        });
    }
};
