<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'customer_id')) {
                $table->foreignId('customer_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('payments', 'receipt_path')) {
                $table->string('receipt_path', 500)->nullable();
            }
            if (!Schema::hasColumn('payments', 'receipt_url')) {
                $table->string('receipt_url', 500)->nullable();
            }
            if (!Schema::hasColumn('payments', 'receipt_original_name')) {
                $table->string('receipt_original_name', 255)->nullable();
            }
            if (!Schema::hasColumn('payments', 'receipt_mime_type')) {
                $table->string('receipt_mime_type', 100)->nullable();
            }
            if (!Schema::hasColumn('payments', 'payment_method')) {
                $table->string('payment_method', 50)->nullable();
            }
            if (!Schema::hasColumn('payments', 'payer_name')) {
                $table->string('payer_name', 255)->nullable();
            }
            if (!Schema::hasColumn('payments', 'bank_name')) {
                $table->string('bank_name', 255)->nullable();
            }
            if (!Schema::hasColumn('payments', 'account_number')) {
                $table->string('account_number', 100)->nullable();
            }
            if (!Schema::hasColumn('payments', 'payment_date')) {
                $table->date('payment_date')->nullable();
            }
            if (!Schema::hasColumn('payments', 'notes')) {
                $table->text('notes')->nullable();
            }
            if (!Schema::hasColumn('payments', 'admin_notes')) {
                $table->text('admin_notes')->nullable();
            }
            if (!Schema::hasColumn('payments', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable();
            }
            if (!Schema::hasColumn('payments', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable();
            }
            if (!Schema::hasColumn('payments', 'confirmed_by')) {
                $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'payment_details')) {
                $table->json('payment_details')->nullable();
            }
            if (!Schema::hasColumn('orders', 'payment_confirmed_at')) {
                $table->timestamp('payment_confirmed_at')->nullable();
            }
            if (!Schema::hasColumn('orders', 'payment_confirmed_by')) {
                $table->foreignId('payment_confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        // Safe down
    }
};
