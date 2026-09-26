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
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'is_demo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_demo')->default(false)->index();
            });
        }

        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'is_demo')) {
            Schema::table('products', function (Blueprint $table) {
                $table->boolean('is_demo')->default(false)->index();
            });
        }

        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'is_demo')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->boolean('is_demo')->default(false)->index();
            });
        }

        if (Schema::hasTable('quotes') && !Schema::hasColumn('quotes', 'is_demo')) {
            Schema::table('quotes', function (Blueprint $table) {
                $table->boolean('is_demo')->default(false)->index();
            });
        }

        if (Schema::hasTable('quotations') && !Schema::hasColumn('quotations', 'is_demo')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->boolean('is_demo')->default(false)->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('quotations') && Schema::hasColumn('quotations', 'is_demo')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->dropColumn('is_demo');
            });
        }

        if (Schema::hasTable('quotes') && Schema::hasColumn('quotes', 'is_demo')) {
            Schema::table('quotes', function (Blueprint $table) {
                $table->dropColumn('is_demo');
            });
        }

        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'is_demo')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('is_demo');
            });
        }

        if (Schema::hasTable('products') && Schema::hasColumn('products', 'is_demo')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('is_demo');
            });
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'is_demo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_demo');
            });
        }
    }
};
