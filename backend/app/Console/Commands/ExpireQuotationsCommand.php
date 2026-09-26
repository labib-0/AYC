<?php

namespace App\Console\Commands;

use App\Models\Quotation;
use App\Services\Audit\ActivityLogger;
use Illuminate\Console\Command;

class ExpireQuotationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'quotes:expire';

    /**
     * The console command description.
     */
    protected $description = 'Transition past-due quotations to EXPIRED status';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();
        $expiredQuotes = Quotation::whereNotNull('valid_until')
            ->where('valid_until', '<', $now)
            ->whereNotIn('status', ['EXPIRED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'CONVERTED_TO_ORDER'])
            ->get();

        $count = $expiredQuotes->count();
        $this->info("Found {$count} expired quotation(s).");

        foreach ($expiredQuotes as $quote) {
            $quote->update(['status' => 'EXPIRED']);

            ActivityLogger::log('quotation.expired_by_scheduler', $quote, [
                'quotation_number' => $quote->quotation_number,
                'valid_until' => $quote->valid_until?->toIso8601String(),
                'expired_at' => $now->toIso8601String(),
            ]);

            $this->line("Quotation {$quote->quotation_number} marked as EXPIRED.");
        }

        $this->info("Quotation expiration check completed.");
        return Command::SUCCESS;
    }
}
