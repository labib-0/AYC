<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database for production deployment.
     * Idempotently provisions strictly 2 accounts: 1 Admin and 1 Customer.
     * Zero catalog, inventory, order, RFQ, promotion, or banner demo records are seeded.
     */
    public function run(): void
    {
        // 1. Single Operational Warehouse Standard (Uttara Warehouse)
        Warehouse::where('code', '!=', 'WH-UTTARA-01')->delete();
        Warehouse::updateOrCreate(
            ['code' => 'WH-UTTARA-01'],
            [
                'name' => 'Uttara Warehouse',
                'address_line_1' => 'House #33 (2nd floor), Road #12, Sector #11, Uttara',
                'city' => 'Dhaka',
                'country_code' => 'BD',
                'is_active' => true,
            ]
        );

        // 2. Production Admin Account (Exactly 1)
        User::withTrashed()->updateOrCreate(
            ['email' => 'admin@ayaan-demo.local'],
            [
                'name' => 'Ayaan Demo Admin',
                'password' => Hash::make('Admin@12345'),
                'role' => User::ROLE_ADMIN,
                'phone' => '+880 1826-304930',
                'company_name' => 'Ayaan Sourcing Ltd.',
                'email_verified_at' => now(),
                'is_demo' => true,
                'deleted_at' => null,
            ]
        );

        // 3. Production Customer Account (Exactly 1, B2B wholesale capabilities active)
        User::withTrashed()->updateOrCreate(
            ['email' => 'customer@ayaan-demo.local'],
            [
                'name' => 'Demo Customer',
                'password' => Hash::make('Customer@12345'),
                'role' => User::ROLE_CUSTOMER,
                'phone' => '+880 1826-304930',
                'company_name' => 'Ayaan Commercial Demo Corp',
                'tax_id' => 'US-DEMO-99901',
                'b2b_approval_status' => 'approved',
                'b2b_payment_terms' => 'net_30',
                'email_verified_at' => now(),
                'is_demo' => true,
                'deleted_at' => null,
            ]
        );
    }
}
