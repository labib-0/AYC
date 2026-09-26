<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('transaction_id', 100)->nullable()->index();
            $table->string('provider', 50)->default('card'); // stripe, transfer, cod
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('USD');
            $table->string('status', 30)->default('pending'); // pending, succeeded, failed, refunded
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
