<?php

use App\Models\SystemSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Safely ensures the 'bangladesh_storefront_block_enabled' setting exists defaulting to false.
     * Non-destructive and idempotent.
     */
    public function up(): void
    {
        if (!SystemSetting::where('key', 'bangladesh_storefront_block_enabled')->exists()) {
            SystemSetting::set('bangladesh_storefront_block_enabled', false, 'boolean', 'security');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        SystemSetting::where('key', 'bangladesh_storefront_block_enabled')->delete();
    }
};
