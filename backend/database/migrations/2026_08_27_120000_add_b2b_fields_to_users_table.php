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
        Schema::table('users', function (Blueprint $table) {
            $table->string('tax_id', 100)->nullable()->after('company_name');
            $table->string('b2b_approval_status', 30)->default('approved')->after('tax_id')->index(); // pending, approved, rejected
            $table->string('b2b_payment_terms', 50)->nullable()->default('net_30')->after('b2b_approval_status'); // none, net_30, net_60
            $table->decimal('b2b_credit_limit', 12, 2)->default(10000.00)->after('b2b_payment_terms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'tax_id',
                'b2b_approval_status',
                'b2b_payment_terms',
                'b2b_credit_limit',
            ]);
        });
    }
};
