<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Order Emails Configuration
    |--------------------------------------------------------------------------
    |
    | Governs transactional customer order-confirmation emails.
    |
    | CRITICAL PRODUCTION SAFETY:
    | By default, 'enabled' MUST remain false so that no transactional emails
    | are dispatched in production until all 5 implementation steps are complete
    | and explicit rollout authorization is given.
    |
    */

    'emails' => [
        'enabled' => (bool) env('ORDER_EMAILS_ENABLED', false),
        'from_address' => env('ORDER_MAIL_FROM_ADDRESS', env('MAIL_FROM_ADDRESS', 'export@ayaanclothing.com')),
        'from_name' => env('ORDER_MAIL_FROM_NAME', env('MAIL_FROM_NAME', 'AYAAN CLOTHING')),
        'queue' => env('ORDER_MAIL_QUEUE', 'default'),
        'max_attachment_size_mb' => (int) env('ORDER_MAIL_MAX_ATTACHMENT_SIZE_MB', 20),
        'retry_attempts' => (int) env('ORDER_MAIL_RETRY_ATTEMPTS', 3),
        'backoff_seconds' => (int) env('ORDER_MAIL_BACKOFF_SECONDS', 30),
    ],

];
