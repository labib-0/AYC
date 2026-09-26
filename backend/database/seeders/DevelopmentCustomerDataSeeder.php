<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Seeder;

class DevelopmentCustomerDataSeeder extends Seeder
{
    /**
     * Run the development customer data (addresses) database seeds.
     */
    public function run(): void
    {
        $customers = User::where('role', User::ROLE_CUSTOMER)
            ->where('is_demo', true)
            ->get();

        $addressCatalog = [
            'customer@ayaan-demo.local' => [
                [
                    'type' => 'shipping',
                    'name' => 'Elena Rostova',
                    'phone' => '+1 (555) 392-8172',
                    'address_line_1' => '742 Evergreen Terrace',
                    'address_line_2' => 'Suite 400 (Demo Showroom)',
                    'city' => 'Springfield',
                    'state' => 'OR',
                    'postal_code' => '97477',
                    'country_code' => 'US',
                    'is_default' => true,
                ],
                [
                    'type' => 'shipping',
                    'name' => 'Rostova West Coast Hub',
                    'phone' => '+1 (555) 882-1920',
                    'address_line_1' => '1200 Logistics Blvd, Dock 4',
                    'address_line_2' => 'Bay Area Fulfillment Center',
                    'city' => 'Oakland',
                    'state' => 'CA',
                    'postal_code' => '94607',
                    'country_code' => 'US',
                    'is_default' => false,
                ],
            ],
            'buyer@ayaan-demo.local' => [
                [
                    'type' => 'shipping',
                    'name' => 'Tariq Al-Mansoor',
                    'phone' => '+971 50 123 4567',
                    'address_line_1' => 'Sheikh Zayed Road, Trade Centre 1',
                    'address_line_2' => 'Tower B, Suite 1802',
                    'city' => 'Dubai',
                    'state' => 'Dubai',
                    'postal_code' => '00000',
                    'country_code' => 'AE',
                    'is_default' => true,
                ],
            ],
            'sophie@ayaan-demo.local' => [
                [
                    'type' => 'shipping',
                    'name' => 'Sophie Martin',
                    'phone' => '+33 1 42 68 55 00',
                    'address_line_1' => '14 Rue du Faubourg Saint-Honoré',
                    'address_line_2' => 'Bâtiment B, Étage 3',
                    'city' => 'Paris',
                    'state' => 'Île-de-France',
                    'postal_code' => '75008',
                    'country_code' => 'FR',
                    'is_default' => true,
                ],
            ],
            'marcus@ayaan-demo.local' => [
                [
                    'type' => 'shipping',
                    'name' => 'Marcus Vance',
                    'phone' => '+47 22 83 90 00',
                    'address_line_1' => 'Karl Johans gate 22',
                    'address_line_2' => 'Sentrum Lager 4',
                    'city' => 'Oslo',
                    'state' => 'Oslo',
                    'postal_code' => '0159',
                    'country_code' => 'NO',
                    'is_default' => true,
                ],
            ],
            'kenji@ayaan-demo.local' => [
                [
                    'type' => 'shipping',
                    'name' => 'Kenji Sato',
                    'phone' => '+81 3 5555 0143',
                    'address_line_1' => '2-4-1 Nihonbashi',
                    'address_line_2' => 'Chuo-ku Central Depot',
                    'city' => 'Tokyo',
                    'state' => 'Tokyo',
                    'postal_code' => '103-0027',
                    'country_code' => 'JP',
                    'is_default' => true,
                ],
            ],
        ];

        foreach ($customers as $customer) {
            $addresses = $addressCatalog[$customer->email] ?? null;
            if (!$addresses) continue;

            foreach ($addresses as $addr) {
                Address::updateOrCreate(
                    [
                        'user_id' => $customer->id,
                        'address_line_1' => $addr['address_line_1'],
                    ],
                    [
                        'type' => $addr['type'],
                        'name' => $addr['name'],
                        'phone' => $addr['phone'],
                        'address_line_2' => $addr['address_line_2'],
                        'city' => $addr['city'],
                        'state' => $addr['state'],
                        'postal_code' => $addr['postal_code'],
                        'country_code' => $addr['country_code'],
                        'is_default' => $addr['is_default'],
                    ]
                );
            }
        }
    }
}
