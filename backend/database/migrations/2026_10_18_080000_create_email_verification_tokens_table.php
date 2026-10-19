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
        Schema::create('email_verification_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('email')->index();
            $table->string('token_hash', 64)->unique();
            $table->string('browser_binding_hash', 64)->nullable()->index();
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable()->index();
            $table->string('verified_ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'used_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_verification_tokens');
    }
};
