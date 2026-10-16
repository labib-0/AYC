<?php

namespace App\Console\Commands;

use App\Models\Quote;
use App\Models\QuoteItem;
use App\Notifications\AdminRfqReceivedNotification;
use App\Notifications\RfqApprovedNotification;
use App\Notifications\RfqCreatedNotification;
use App\Notifications\RfqRejectedNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

class TestRfqEmailDeliveryCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test-rfq
                            {recipient : Explicitly authorized test email address}
                            {--event=submission : Notification event to test (submission, approval, rejection, admin, all)}
                            {--queue : Dispatch via background queue worker instead of synchronous delivery}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send an isolated, non-destructive test RFQ transactional email to verify SMTP transport and template rendering';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $recipient = trim((string) $this->argument('recipient'));

        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $this->error("Invalid recipient email address: '{$recipient}'");
            return 1;
        }

        $event = strtolower((string) $this->option('event'));
        $viaQueue = (bool) $this->option('queue');
        $mailer = config('mail.default', 'log');

        $this->info("=== AYAAN CLOTHING — RFQ Email Delivery Test ===");
        $this->line("Mailer Driver   : <comment>{$mailer}</comment>");
        $this->line("From Address    : <comment>" . config('mail.from.address') . " (" . config('mail.from.name') . ")</comment>");
        $this->line("Target Recipient: <comment>{$recipient}</comment>");
        $this->line("Delivery Mode   : <comment>" . ($viaQueue ? "Queued (Redis)" : "Synchronous") . "</comment>");

        if ($mailer === 'smtp') {
            $host = config('mail.mailers.smtp.host');
            $port = config('mail.mailers.smtp.port');
            $user = config('mail.mailers.smtp.username');
            $hasPass = !empty(config('mail.mailers.smtp.password'));
            $userMasked = empty($user) ? '(empty)' : substr($user, 0, 3) . '***';

            $this->line("SMTP Host       : <comment>{$host}:{$port}</comment>");
            $this->line("SMTP Auth       : <comment>User: {$userMasked} | Pass: " . ($hasPass ? 'Configured' : 'Missing') . "</comment>");

            if (empty($user) || !$hasPass) {
                $this->warn("WARNING: SMTP credentials appear incomplete. Delivery may fail unless an unauthenticated relay is permitted.");
            }
        }

        // Build ephemeral in-memory Quote instance (Zero database persistence)
        $rfq = new Quote([
            'id' => 999999,
            'rfq_number' => 'RFQ-TEST-' . date('Ymd-His'),
            'buyer_name' => 'Authorized QA Recipient',
            'buyer_email' => $recipient,
            'company_name' => 'AYAAN CLOTHING Test Buyer',
            'destination_country' => 'United Kingdom',
            'destination_city' => 'London',
            'target_delivery_date' => now()->addDays(30),
            'status' => 'SUBMITTED',
            'created_at' => now(),
        ]);
        $rfq->id = 999999;
        $rfq->setRelation('items', collect([
            new QuoteItem([
                'id' => 1,
                'quote_id' => 999999,
                'product_name' => 'Heavyweight Fleece Hoodie 450GSM (Test Spec)',
                'quantity' => 500,
                'target_price' => 19.50,
                'selected_color' => 'Navy Melange',
                'selected_size' => 'M, L, XL',
            ]),
        ]));

        $eventsToRun = $event === 'all'
            ? ['submission', 'approval', 'rejection', 'admin']
            : [$event];

        foreach ($eventsToRun as $evt) {
            $this->line("\n--- Testing Event: <info>{$evt}</info> ---");

            try {
                $notification = match ($evt) {
                    'submission' => new RfqCreatedNotification($rfq),
                    'approval' => new RfqApprovedNotification($rfq, 'Controlled test: Target technical specifications approved.'),
                    'rejection' => new RfqRejectedNotification($rfq, 'Controlled test: Capacity allocation reached for requested shipment window.'),
                    'admin' => new AdminRfqReceivedNotification($rfq),
                    default => null,
                };

                if (!$notification) {
                    $this->error("Unknown event '{$evt}'. Valid options: submission, approval, rejection, admin, all.");
                    return 1;
                }

                if ($viaQueue) {
                    Notification::route('mail', $recipient)->notify($notification);
                    $this->info("✓ Job successfully dispatched to Redis queue. Worker 'ayaan-worker' will process delivery.");
                } else {
                    // Send synchronously via mail channel
                    Notification::route('mail', $recipient)->notifyNow($notification);
                    $this->info("✓ Message successfully transmitted to transport: <info>{$mailer}</info>");
                }

                Log::info("Test RFQ notification sent successfully", [
                    'event' => $evt,
                    'recipient' => $recipient,
                    'mailer' => $mailer,
                    'queued' => $viaQueue,
                ]);
            } catch (\Throwable $e) {
                $this->error("✗ Delivery failed for event '{$evt}': " . $e->getMessage());
                Log::error("Test RFQ notification failed: " . $e->getMessage(), [
                    'event' => $evt,
                    'recipient' => $recipient,
                    'error' => $e->getMessage(),
                ]);
                return 1;
            }
        }

        $this->info("\n=== Delivery Test Complete ===");
        if ($mailer === 'log') {
            $this->comment("Notice: MAIL_MAILER=log is active. Full HTML & text contents were written to storage/logs/laravel.log.");
            $this->comment("No external email was delivered over the network. Real inbox delivery requires verified SMTP credentials.");
        } else {
            $this->comment("Notice: The message was accepted by the configured transport.");
            $this->comment("Please check the inbox of '{$recipient}' (including Spam/Junk) to verify delivery.");
        }

        return 0;
    }
}
