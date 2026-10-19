<?php

namespace App\Console\Commands;

use App\Mail\CustomerOrderConfirmationMail;
use App\Mail\CustomerOrderConfirmedMail;
use App\Mail\CustomerPaymentProofReceivedMail;
use App\Models\Order;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestOrderEmailDeliveryCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test-order
                            {recipient : Explicitly authorized test email address}
                            {--type=confirmation : Order email template to test (confirmation, proof, confirmed, all)}
                            {--queue : Dispatch via background queue worker instead of synchronous delivery}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send an isolated, non-destructive test Order transactional email to verify SMTP transport and template rendering';

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

        $type = strtolower((string) $this->option('type'));
        $viaQueue = (bool) $this->option('queue');
        $mailer = config('mail.default', 'log');

        $this->info("=== AYAAN CLOTHING — Order Transactional Email Delivery Test ===");
        $this->line("Mailer Driver   : <comment>{$mailer}</comment>");
        $this->line("From Address    : <comment>" . config('order.emails.from_address', config('mail.from.address')) . "</comment>");
        $this->line("Target Recipient: <comment>{$recipient}</comment>");
        $this->line("Email Type      : <comment>{$type}</comment>");
        $this->line("Delivery Mode   : <comment>" . ($viaQueue ? "Queued (Redis)" : "Synchronous") . "</comment>");

        // Construct ephemeral Order instance for non-destructive testing
        $user = new User([
            'id' => 999997,
            'name' => 'Authorized QA Tester',
            'email' => $recipient,
        ]);

        $order = new Order([
            'id' => 999997,
            'order_number' => 'ORD-' . date('Y') . '-TEST',
            'user_id' => 999997,
            'email' => $recipient,
            'shipping_name' => 'Authorized QA Tester',
            'currency' => 'USD',
            'total_amount' => 1250.00,
            'payment_status' => 'pending',
            'status' => 'pending',
            'payment_method' => 'bank_wire',
            'payment_details' => [
                'bank_name' => 'City Bank PLC',
                'account_number' => '1102837492001',
                'submitted_at' => now()->toIso8601String(),
                'confirmed_at' => now()->toIso8601String(),
            ],
        ]);
        $order->setRelation('user', $user);

        // Dummy PDF binary (authoritative 1-page blank PDF)
        $dummyPdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n";

        $mailables = [];

        if (in_array($type, ['confirmation', 'all'], true)) {
            $mailables['Order Confirmation (Payment Pending)'] = new CustomerOrderConfirmationMail(
                $order,
                $dummyPdf,
                'AYC_Proforma_Invoice_TEST.pdf',
                $dummyPdf,
                'AYC_Offer_Sheet_TEST.pdf'
            );
        }

        if (in_array($type, ['proof', 'all'], true)) {
            $mailables['Payment Proof Received (Under Review)'] = new CustomerPaymentProofReceivedMail(
                $order,
                'swift_remittance_advice_test.pdf',
                'bank_wire'
            );
        }

        if (in_array($type, ['confirmed', 'all'], true)) {
            $mailables['Order Confirmed (Payment Verified)'] = new CustomerOrderConfirmedMail($order);
        }

        if (empty($mailables)) {
            $this->error("Unknown email type '{$type}'. Valid options: confirmation, proof, confirmed, all.");
            return 1;
        }

        foreach ($mailables as $label => $mailable) {
            $this->line("\nDispatching <info>{$label}</info> to <comment>{$recipient}</comment>...");
            try {
                if ($viaQueue) {
                    Mail::to($recipient)->queue($mailable);
                    $this->info("  ✓ Successfully pushed to queue worker.");
                } else {
                    Mail::to($recipient)->send($mailable);
                    $this->info("  ✓ Successfully sent via transport.");
                }
            } catch (\Throwable $e) {
                $this->error("  ✗ Delivery failed: " . $e->getMessage());
                return 1;
            }
        }

        $this->info("\n=== All requested test order emails dispatched successfully ===");
        return 0;
    }
}
