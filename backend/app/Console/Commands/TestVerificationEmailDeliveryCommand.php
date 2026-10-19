<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class TestVerificationEmailDeliveryCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test-verification
                            {recipient : Explicitly authorized test email address}
                            {--queue : Dispatch via background queue worker instead of synchronous delivery}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send an isolated, non-destructive test account verification email to verify SMTP transport and template rendering';

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

        $viaQueue = (bool) $this->option('queue');
        $mailer = config('mail.default', 'log');

        $this->info("=== AYAAN CLOTHING — Account Verification Email Delivery Test ===");
        $this->line("Mailer Driver   : <comment>{$mailer}</comment>");
        $this->line("From Address    : <comment>" . config('mail.from.address') . " (" . config('mail.from.name') . ")</comment>");
        $this->line("Target Recipient: <comment>{$recipient}</comment>");
        $this->line("Delivery Mode   : <comment>" . ($viaQueue ? "Queued (Redis)" : "Synchronous") . "</comment>");

        // In-memory or persisted ephemeral user instance
        $user = User::where('email', $recipient)->first();
        if (!$user) {
            $user = new User();
            $user->name = 'Authorized QA Recipient';
            $user->email = $recipient;
            $user->role = User::ROLE_CUSTOMER;
            $user->password = bcrypt('qa-test-ephemeral-' . bin2hex(random_bytes(8)));

            if ($viaQueue) {
                // Persist ephemeral record so queue worker can hydrate via SerializesModels
                $user->save();
            }
        }


        try {
            $notification = new CustomerVerifyEmailNotification();

            if ($viaQueue) {
                $user->notify($notification);
                $this->info("SUCCESS: Verification notification dispatched to Redis queue.");
                $this->line("Queue worker 'ayaan-worker' will process and transmit the notification.");
            } else {
                Notification::sendNow($user, $notification);
                $this->info("SUCCESS: Verification notification transmitted synchronously via [{$mailer}] transport.");
            }

            return 0;
        } catch (\Throwable $e) {
            $this->error("FAILED to send verification notification: " . $e->getMessage());
            return 1;
        } finally {
            if ($viaQueue && $user->exists) {
                // Ensure zero lingering test records in database
                $user->forceDelete();
            }
        }
    }
}
