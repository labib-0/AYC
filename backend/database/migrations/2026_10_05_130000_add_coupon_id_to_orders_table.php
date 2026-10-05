<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'coupon_id')) {
                    $table->foreignId('coupon_id')->nullable()->after('currency')->constrained('coupons')->nullOnDelete();
                    $table->index('coupon_id');
                }
                if (!Schema::hasColumn('orders', 'coupon_code')) {
                    $table->string('coupon_code', 50)->nullable()->after('coupon_id')->index();
                }
            });

            // Add composite index for efficient coupon sales status querying
            Schema::table('orders', function (Blueprint $table) {
                $table->index(['coupon_id', 'status'], 'orders_coupon_id_status_index');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'coupon_id')) {
                    $table->dropIndex('orders_coupon_id_status_index');
                    $table->dropForeign(['coupon_id']);
                    $table->dropColumn('coupon_id');
                }
                if (Schema::hasColumn('orders', 'coupon_code')) {
                    $table->dropColumn('coupon_code');
                }
            });
        }
    }
};
