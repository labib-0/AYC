<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('pending')->index(); // pending, confirmed, processing, shipped, delivered, cancelled
            $table->string('payment_status', 30)->default('pending')->index(); // pending, paid, refunded, failed
            $table->string('fulfillment_status', 30)->default('unfulfilled')->index(); // unfulfilled, processing, shipped, delivered, returned
            $table->string('currency', 10)->default('USD');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('shipping_cost', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('email');
            $table->string('shipping_name');
            $table->string('shipping_phone', 50)->nullable();
            $table->string('shipping_address1');
            $table->string('shipping_address2')->nullable();
            $table->string('shipping_city', 100);
            $table->string('shipping_region', 100)->nullable();
            $table->string('shipping_postal_code', 30);
            $table->string('shipping_country_code', 10)->default('US');
            $table->json('billing_address')->nullable();
            $table->string('payment_method', 50)->default('card'); // card, transfer, cod
            $table->string('payment_proof_url', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
