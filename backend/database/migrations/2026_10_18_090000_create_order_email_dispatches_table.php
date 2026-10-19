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
        Schema::create('order_email_dispatches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('notification_type', 64)->default('order_confirmation');
            $table->string('idempotency_key', 128)->unique();
            $table->string('recipient_email', 255)->nullable();
            $table->string('recipient_name', 255)->nullable();
            $table->string('status', 32)->default('pending')->index(); // pending, queued, processing, sent, failed, skipped
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedInteger('attachments_count')->default(0);
            $table->json('attachments_summary')->nullable();
            $table->string('error_category', 64)->nullable()->index();
            $table->text('error_message')->nullable();
            $table->timestamp('last_attempted_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'notification_type'], 'order_notification_type_index');
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_email_dispatches');
    }
};
