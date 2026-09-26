<?php

$allowedOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', ''))));

$frontendUrl = env('FRONTEND_URL');
$customerUrl = env('CUSTOMER_FRONTEND_URL', $frontendUrl);
$adminUrl = env('ADMIN_FRONTEND_URL');

if ($customerUrl && !in_array(rtrim($customerUrl, '/'), $allowedOrigins)) {
    $allowedOrigins[] = rtrim($customerUrl, '/');
}
if ($adminUrl && !in_array(rtrim($adminUrl, '/'), $allowedOrigins)) {
    $allowedOrigins[] = rtrim($adminUrl, '/');
}

// In local or testing environments, include local development URLs by default
if (env('APP_ENV') !== 'production') {
    $localDefaults = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://admin.localhost:3000',
    ];
    foreach ($localDefaults as $origin) {
        if (!in_array($origin, $allowedOrigins)) {
            $allowedOrigins[] = $origin;
        }
    }
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers.
    |
    | Production origins must be explicitly specified in CORS_ALLOWED_ORIGINS,
    | CUSTOMER_FRONTEND_URL, and ADMIN_FRONTEND_URL. Wildcards are strictly
    | prohibited for authenticated, credentialed traffic.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_unique($allowedOrigins)),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['X-Total-Count', 'Link'],

    'max_age' => 86400,

    'supports_credentials' => true,

];
