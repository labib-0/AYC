<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DevelopmentPromotionSeeder extends Seeder
{
    /**
     * Run the development promotion and coupon database seeds.
     */
    public function run(): void
    {
        // 1. Active Percentage Coupon (10% off, min spend $100)
        Coupon::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'discount_type' => 'percentage',
                'discount_value' => 10.00,
                'min_spend' => 100.00,
                'usage_limit' => 500,
                'usage_count' => 14,
                'starts_at' => Carbon::now()->subMonths(1),
                'expires_at' => Carbon::now()->addMonths(6),
                'is_active' => true,
            ]
        );

        // 2. Active Flat USD Coupon ($50 off, min spend $500)
        Coupon::updateOrCreate(
            ['code' => 'BULK50'],
            [
                'discount_type' => 'fixed_amount',
                'discount_value' => 50.00,
                'min_spend' => 500.00,
                'usage_limit' => 200,
                'usage_count' => 28,
                'starts_at' => Carbon::now()->subMonths(1),
                'expires_at' => Carbon::now()->addMonths(3),
                'is_active' => true,
            ]
        );

        // 3. Expired Coupon (25% off, expired 30 days ago)
        Coupon::updateOrCreate(
            ['code' => 'EXPIRED25'],
            [
                'discount_type' => 'percentage',
                'discount_value' => 25.00,
                'min_spend' => 300.00,
                'usage_limit' => 50,
                'usage_count' => 50,
                'starts_at' => Carbon::now()->subMonths(3),
                'expires_at' => Carbon::now()->subDays(30),
                'is_active' => false,
            ]
        );

        // 4. Future Coupon (15% off, starts in 30 days)
        Coupon::updateOrCreate(
            ['code' => 'FUTURE15'],
            [
                'discount_type' => 'percentage',
                'discount_value' => 15.00,
                'min_spend' => 200.00,
                'usage_limit' => 100,
                'usage_count' => 0,
                'starts_at' => Carbon::now()->addDays(30),
                'expires_at' => Carbon::now()->addDays(90),
                'is_active' => true,
            ]
        );
    }
}
