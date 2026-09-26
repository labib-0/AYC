<?php

namespace App\Console\Commands;

use App\Models\Coupon;
use Illuminate\Console\Command;

class SyncExpiredPromotionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'coupons:sync-expired';

    /**
     * The console command description.
     */
    protected $description = 'Deactivate past-due coupons';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();

        $couponsCount = Coupon::where('is_active', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', $now)
            ->update(['is_active' => false]);

        $this->info("Deactivated {$couponsCount} expired coupon(s).");
        return Command::SUCCESS;
    }
}
