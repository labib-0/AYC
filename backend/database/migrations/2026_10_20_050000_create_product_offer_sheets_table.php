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
        Schema::create('product_offer_sheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained('products')->cascadeOnDelete();
            $table->string('sku', 100)->index();
            $table->string('status', 20)->default('pending')->index(); // pending, processing, ready, failed
            $table->string('fingerprint', 64)->index();
            $table->string('file_path')->nullable();
            $table->string('filename')->nullable();
            $table->unsignedBigInteger('filesize_bytes')->default(0);
            $table->string('checksum_sha256', 64)->nullable();
            $table->unsignedInteger('page_count')->default(0);
            $table->json('metadata')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_offer_sheets');
    }
};
