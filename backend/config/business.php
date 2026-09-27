<?php

/**
 * Authoritative Business Profile Configuration
 * 
 * Source of truth for all business branding, exporter information,
 * addresses, origin routing, and commercial document exporter profiles.
 */

return [
    'name' => 'AYAAN CLOTHING',
    'brand_mark' => 'AYC',
    'business_type' => 'Ready-made Garments Manufacturer & Exporter',
    'description' => 'Ready-made Garments Manufacturer & Exporter',
    'established_year' => 2010,

    'address' => [
        'line1' => 'House #33 (2nd floor)',
        'line2' => 'Road #12, Sector #11',
        'area' => 'Uttara',
        'city' => 'Dhaka',
        'postal_code' => '1230',
        'country' => 'Bangladesh',
        'country_code' => 'BD',
        'formatted' => 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh',
    ],

    // Unconfirmed legal identifiers - left configurable/empty rather than fabricated
    'legal' => [
        'registration_number' => env('BUSINESS_REG_NUMBER', null),
        'tin_number' => env('BUSINESS_TIN_NUMBER', null),
        'bin_number' => env('BUSINESS_BIN_NUMBER', null),
        'vat_number' => env('BUSINESS_VAT_NUMBER', null),
        'bgmea_reg' => env('BUSINESS_BGMEA_REG', null),
    ],

    // Official contact channels
    'contact' => [
        'phone' => env('BUSINESS_PHONE', null),
        'email' => env('BUSINESS_EMAIL', null),
        'whatsapp' => env('BUSINESS_WHATSAPP', '+880 1982-183886'),
        'whatsapp_display' => env('BUSINESS_WHATSAPP_DISPLAY', '+880 1982-183886'),
        'whatsapp_number' => env('BUSINESS_WHATSAPP_NUMBER', '8801982183886'),
        'whatsapp_url' => env('BUSINESS_WHATSAPP_URL', 'https://wa.me/8801982183886'),
        'website' => env('BUSINESS_WEBSITE', 'www.ayaanclothing.com'),
    ],

    // Banking details - Official Pubali Bank Limited wire credentials
    'banking' => [
        'is_configured' => env('BUSINESS_BANK_CONFIGURED', true),
        'bank_name' => 'Pubali Bank Limited',
        'account_title' => 'M/S AYAAN  CLOTHING',
        'beneficiary_name' => 'M/S AYAAN  CLOTHING',
        'account_no' => '1788-901-044316',
        'account_number' => '1788-901-044316',
        'swift_code' => 'PUBABDDH210',
        'branch' => 'Nawabpur Road Branch',
        'bank_address' => "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh",
    ],

    // Default logistics origin ports
    'logistics' => [
        'country_of_origin' => 'Bangladesh',
        'air_port_of_loading' => 'Hazrat Shahjalal International Airport (DAC), Dhaka',
        'sea_port_of_loading' => 'Chattogram Sea Port (CGP), Bangladesh',
        'place_of_receipt' => 'Uttara Corporate Office / Dhaka Hub, Bangladesh',
    ],
];
