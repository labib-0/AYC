<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Image Driver
    |--------------------------------------------------------------------------
    |
    | Supported drivers: "gd", "imagick"
    |
    */

    'default' => env('IMAGE_DRIVER', 'gd'),

    'drivers' => [
        'gd' => [
            // GD-specific configuration
        ],
        'imagick' => [
            // Imagick-specific configuration
        ],
    ],

];
