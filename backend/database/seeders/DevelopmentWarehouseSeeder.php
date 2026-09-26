<?php

namespace Database\Seeders;

use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class DevelopmentWarehouseSeeder extends Seeder
{
    /**
     * Run the development warehouse database seeds.
     * STRICT STANDARD: Single Warehouse (Uttara Warehouse - WH-UTTARA-01).
     */
    public function run(): void
    {
        // Deactivate any legacy multi-warehouse entries
        Warehouse::where('code', '!=', 'WH-UTTARA-01')->update(['is_active' => false]);

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
    }
}
