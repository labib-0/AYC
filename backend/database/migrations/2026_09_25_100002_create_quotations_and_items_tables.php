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
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number', 50)->unique();
            $table->unsignedInteger('revision_number')->default(1);
            $table->foreignId('quote_id')->nullable()->constrained('quotes')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            
            // Commercial Parties
            $table->string('buyer_name', 255);
            $table->string('buyer_email', 255);
            $table->string('buyer_phone', 50)->nullable();
            $table->string('company_name', 255);
            $table->string('destination_country', 100)->default('United States');
            $table->string('destination_city', 100)->nullable();
            $table->string('destination_port', 100)->nullable();
            
            // Financials
            $table->string('currency', 10)->default('USD');
            $table->string('currency_symbol', 10)->default('$');
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('discount_total', 12, 2)->default(0.00);
            $table->decimal('shipping_fee', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('grand_total', 12, 2)->default(0.00);
            
            // Commercial Terms
            $table->string('payment_terms', 255)->default('30% T/T Advance, 70% against B/L');
            $table->string('shipping_terms', 255)->default('FOB Chittagong');
            $table->string('incoterm', 20)->default('FOB');
            $table->string('delivery_estimate', 100)->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->text('admin_notes')->nullable();
            $table->text('customer_notes')->nullable();
            
            // Lifecycle
            $table->string('status', 50)->default('READY')->index(); // DRAFT, READY, SENT, VIEWED, NEGOTIATION, ACCEPTED, REJECTED, EXPIRED, CONVERTED_TO_ORDER, CANCELLED
            $table->text('rejection_reason')->nullable();
            $table->string('proforma_invoice_id', 50)->nullable();
            $table->foreignId('converted_order_id')->nullable()->constrained('orders')->nullOnDelete();
            
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('quotations')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            
            // Snapshot fields
            $table->string('product_name', 255);
            $table->string('product_slug', 255)->nullable();
            $table->string('sku', 100)->nullable();
            $table->string('variant_title', 255)->nullable();
            $table->string('selected_size', 50)->nullable();
            $table->string('selected_color', 50)->nullable();
            $table->string('product_image_url', 500)->nullable();
            
            // Commercial Values
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('line_total', 12, 2)->default(0.00);
            
            $table->json('package_breakdown')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('quotation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
    }
};
