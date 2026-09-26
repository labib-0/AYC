<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'aramex' => [
        'base_url' => env('ARAMEX_BASE_URL', 'https://ws.aramex.net/ShippingAPI.V2'),
        'username' => env('ARAMEX_USERNAME', 'demo@ayaanclothing.com'),
        'password' => env('ARAMEX_PASSWORD', 'SecretPass123!'),
        'version' => env('ARAMEX_VERSION', 'v1.0'),
        'account_number' => env('ARAMEX_ACCOUNT_NUMBER', '987654321'),
        'account_pin' => env('ARAMEX_ACCOUNT_PIN', '123456'),
        'account_entity' => env('ARAMEX_ACCOUNT_ENTITY', 'DAC'),
        'account_country_code' => env('ARAMEX_ACCOUNT_COUNTRY_CODE', 'BD'),
        'shipper' => [
            'name' => 'Ayaan Clothing Export Division',
            'company_name' => 'AYAAN CLOTHING',
            'phone' => env('ARAMEX_SHIPPER_PHONE', ''),
            'email' => env('ARAMEX_SHIPPER_EMAIL', ''),
            'line1' => 'House #33 (2nd floor), Road #12, Sector #11',
            'line2' => 'Uttara',
            'city' => 'Dhaka',
            'state_or_province' => 'Dhaka',
            'postal_code' => '1230',
            'country_code' => 'BD',
        ],
    ],

    'akij_logistics' => [
        'enabled' => env('AKIJ_LOGISTICS_ENABLED', true),
        'carrier_name' => 'Akij Logistics',
        'service_name' => 'Akij LCL Ocean Container Freight',
        'division' => 'Akij Freight Forwarding & Ocean Logistics Ltd.',
        'port_of_loading' => 'Chattogram Sea Port (CGP), Bangladesh',
        'contact_email' => env('AKIJ_CONTACT_EMAIL', 'freight@akijlogistics.com'),
        'contact_phone' => env('AKIJ_CONTACT_PHONE', '+880 9612 888 888'),
        'default_validity_days' => 30,
        'rates' => [
            'base_export_fee' => 50.00, // Terminal & Port Documentation in USD
            'cbm_rates' => [
                'US' => 180.00,
                'CA' => 185.00,
                'GB' => 150.00,
                'DE' => 150.00,
                'FR' => 150.00,
                'IT' => 155.00,
                'NL' => 150.00,
                'ES' => 155.00,
                'AE' => 130.00,
                'SA' => 140.00,
                'AU' => 175.00,
                'DEFAULT' => 200.00,
            ],
            'min_billable_cbm' => 1.0,
        ],
    ],

];
