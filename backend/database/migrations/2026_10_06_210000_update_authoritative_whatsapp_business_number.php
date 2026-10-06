<?php

use App\Models\SystemSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Safely updates or creates the authoritative business WhatsApp contact settings.
     * Non-destructive and idempotent.
     */
    public function up(): void
    {
        SystemSetting::set('whatsapp_display', '+880 1620-853502', 'string', 'contact');
        SystemSetting::set('whatsapp_number', '8801620853502', 'string', 'contact');
        SystemSetting::set('whatsapp_business_number', '8801620853502', 'string', 'contact');

        Cache::forget('site_settings_public');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to prior setting if rolled back
        SystemSetting::set('whatsapp_display', '+880 1982-183886', 'string', 'contact');
        SystemSetting::set('whatsapp_number', '8801982183886', 'string', 'contact');
        SystemSetting::set('whatsapp_business_number', '8801982183886', 'string', 'contact');

        Cache::forget('site_settings_public');
    }
};
