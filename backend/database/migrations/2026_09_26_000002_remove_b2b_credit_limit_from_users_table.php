<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Remove obsolete b2b_credit_limit column from users table.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'b2b_credit_limit')) {
                $table->dropColumn('b2b_credit_limit');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'b2b_credit_limit')) {
                $table->decimal('b2b_credit_limit', 12, 2)->default(10000.00)->after('b2b_payment_terms');
            }
        });
    }
};
