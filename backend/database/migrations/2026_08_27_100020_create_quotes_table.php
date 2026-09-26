<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('rfq_number', 50)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('buyer_name');
            $table->string('buyer_email');
            $table->string('buyer_phone', 50)->nullable();
            $table->string('company_name');
            $table->string('business_type', 100)->nullable();
            $table->string('website', 255)->nullable();
            $table->string('tax_number', 100)->nullable();
            $table->string('destination_country', 100)->default('United States');
            $table->string('destination_city', 100)->nullable();
            $table->string('shipping_port', 100)->nullable();
            $table->string('target_delivery_date', 50)->nullable();
            $table->string('request_title', 255)->nullable();
            $table->text('general_notes')->nullable();
            $table->string('status', 50)->default('SUBMITTED')->index(); // SUBMITTED, UNDER_REVIEW, NEED_INFORMATION, QUOTATION_PREPARED, SENT_TO_BUYER, NEGOTIATION, ACCEPTED, REJECTED, EXPIRED, CONVERTED_TO_ORDER, CANCELLED
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
