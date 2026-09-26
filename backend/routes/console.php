<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes & Scheduled Tasks
|--------------------------------------------------------------------------
*/

// Daily quotation expiration check
Schedule::command('quotes:expire')
    ->dailyAt('00:05')
    ->name('expire-past-due-quotations')
    ->withoutOverlapping();

// Hourly coupon status synchronization
Schedule::command('coupons:sync-expired')
    ->hourly()
    ->name('sync-expired-coupons')
    ->withoutOverlapping();

// Daily temporary files cleanup (older than 24 hours)
Schedule::command('temp-files:cleanup')
    ->dailyAt('02:00')
    ->name('cleanup-temporary-files')
    ->withoutOverlapping();
