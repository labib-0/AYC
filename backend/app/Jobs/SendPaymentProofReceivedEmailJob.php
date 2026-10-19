<?php

namespace App\Jobs;

use App\Mail\CustomerPaymentProofReceivedMail;
use App\Models\Order;
use App\Models\OrderEmailDispatch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendPaymentProofReceivedEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 90, 180];
    public int $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $orderId,
        public ?int $dispatchId = null,
        public ?string $receiptOriginalName = null,
        public ?string $paymentMethod = null
    ) {
        $this->onQueue(config('order.emails.queue', 'default'));
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Safe Production Default: If disabled, do not send
        if (!config('order.emails.enabled', false)) {
            Log::info("SendPaymentProofReceivedEmailJob: ORDER_EMAILS_ENABLED is false. Skipping dispatch for Order ID {$this->orderId}.");
            return;
        }

        $order = Order::with('user')->find($this->orderId);
        if (!$order) {
            Log::warning("SendPaymentProofReceivedEmailJob: Order ID {$this->orderId} not found. Skipping.");
            return;
        }

        // Retrieve outbox dispatch tracking record
        $dispatch = $this->dispatchId ? OrderEmailDispatch::find($this->dispatchId) : null;
        if (!$dispatch) {
            $dispatch = OrderEmailDispatch::where('order_id', $order->id)
                ->where('notification_type', OrderEmailDispatch::TYPE_PAYMENT_PROOF_RECEIVED)
                ->latest()
                ->first();
        }

        // Duplicate-Resistance Check: Never re-send if already marked sent
        if ($dispatch && $dispatch->status === OrderEmailDispatch::STATUS_SENT) {
            Log::info("SendPaymentProofReceivedEmailJob: Payment proof email for Order #{$order->order_number} already sent. Skipping duplicate.");
            return;
        }

        if ($dispatch) {
            $dispatch->increment('attempts');
            $dispatch->markAsProcessing();
        }

        // Server-Side Recipient Validation
        $recipientEmail = trim((string) ($order->email ?? ''));
        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $dispatch?->markAsFailed('invalid_recipient', "Order #{$order->order_number} does not have a valid customer email address.");
            Log::warning("SendPaymentProofReceivedEmailJob: Missing or invalid customer email on Order #{$order->order_number}. Suppressing dispatch.");
            return;
        }

        // Suppress delivery to synthetic POS walk-in accounts
        if (str_ends_with(strtolower($recipientEmail), '@ayaan.local')) {
            $dispatch?->markAsSkipped("POS walk-in synthetic account address ({$recipientEmail}).");
            Log::info("SendPaymentProofReceivedEmailJob: Suppressed payment proof email for POS synthetic account on Order #{$order->order_number}.");
            return;
        }

        // Send transactional email
        try {
            Mail::to($recipientEmail)->send(new CustomerPaymentProofReceivedMail(
                $order,
                $this->receiptOriginalName,
                $this->paymentMethod
            ));

            $dispatch?->markAsSent([]);

            Log::info("SendPaymentProofReceivedEmailJob: Payment proof received email sent successfully for Order #{$order->order_number} to {$recipientEmail}.");
        } catch (\Throwable $e) {
            $sanitizedError = preg_replace('/password=[^&\s]+/i', 'password=***', $e->getMessage());
            $dispatch?->markAsFailed('transport_error', $sanitizedError);
            throw $e;
        }
    }

    /**
     * Handle permanent job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("SendPaymentProofReceivedEmailJob: Permanent failure for Order ID {$this->orderId}", [
            'order_id' => $this->orderId,
            'dispatch_id' => $this->dispatchId,
            'error' => $exception->getMessage(),
        ]);

        if ($this->dispatchId) {
            $dispatch = OrderEmailDispatch::find($this->dispatchId);
            $dispatch?->markAsFailed('permanent_failure', $exception->getMessage());
        }
    }
}
