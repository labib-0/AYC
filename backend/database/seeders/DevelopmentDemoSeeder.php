<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DevelopmentDemoSeeder extends Seeder
{
    /**
     * Master development demo seeder orchestrator.
     * Executes all individual modular development seeders in strict dependency order.
     * 
     * Command: php artisan db:seed --class=DevelopmentDemoSeeder
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('CRITICAL ABORT: DevelopmentDemoSeeder cannot execute against a PRODUCTION environment.');
            return;
        }

        $this->command?->info('==================================================');
        $this->command?->info('AYAAN CLOTHING — SEEDING REAL BACKEND DEMO DATA');
        $this->command?->info('==================================================');

        DB::transaction(function () {
            // 1. Roles & Users (1 Admin, 7 B2B Customers with strictly 2 roles)
            $this->command?->info('[1/9] Seeding development users & credentials...');
            $this->call(DevelopmentUserSeeder::class);

            // 2. Fictional / Demo Brands
            $this->command?->info('[2/9] Seeding development fashion brands...');
            $this->call(DevelopmentBrandSeeder::class);

            // 3. Dynamic Product Categories
            $this->command?->info('[3/9] Seeding product categories...');
            $this->call(DevelopmentCategorySeeder::class);

            // 4. Single Warehouse Standard (Uttara Warehouse)
            $this->command?->info('[4/9] Verifying single warehouse (Uttara Warehouse)...');
            $this->call(DevelopmentWarehouseSeeder::class);

            // 5. Products, 3-Tier Wholesale Pricing, Variants, and Inventory
            $this->command?->info('[5/9] Seeding 32 realistic export fashion products & inventory...');
            $this->call(DevelopmentProductSeeder::class);

            // 6. Customer Delivery Addresses
            $this->command?->info('[6/9] Seeding customer commercial addresses...');
            $this->call(DevelopmentCustomerDataSeeder::class);

            // 7. Promotions & Coupons (Active, Expired, Future)
            $this->command?->info('[7/9] Seeding export promotions & coupons...');
            $this->call(DevelopmentPromotionSeeder::class);

            // 8. Historical Orders & Order Items (Real Buying Price at Sale Snapshots)
            $this->command?->info('[8/9] Seeding 20 historical orders across dates for sales & profit analytics...');
            $this->call(DevelopmentOrderSeeder::class);

            // 9. RFQs & Quotations
            $this->command?->info('[9/9] Seeding 10 RFQs and 5 commercial quotations...');
            $this->call(DevelopmentRFQSeeder::class);
            $this->call(DevelopmentQuotationSeeder::class);
        });

        $this->command?->info('==================================================');
        $this->command?->info('DEMO DATA SEEDING COMPLETE');
        $this->command?->info('Admin:    admin@ayaan-demo.local / Admin@12345');
        $this->command?->info('Customer: customer@ayaan-demo.local / Customer@12345');
        $this->command?->info('==================================================');
    }
}
