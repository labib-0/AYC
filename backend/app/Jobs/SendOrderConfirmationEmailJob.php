<?php

namespace App\Jobs;

use App\Mail\CustomerOrderConfirmationMail;
use App\Models\Order;
use App\Models\OrderEmailDispatch;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 90, 180];
    public int $timeout = 180;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $orderId,
        public ?int $dispatchId = null
    ) {
        $this->onQueue(config('order.emails.queue', 'default'));
    }

    /**
     * Execute the job.
     */
    public function handle(
        ProformaInvoiceService $piService,
        OfferSheetService $offerService,
        DocumentPdfService $pdfService
    ): void {
        // Feature Flag Check: Safe production default leaves delivery disabled
        if (!config('order.emails.enabled', false)) {
            Log::info("SendOrderConfirmationEmailJob: ORDER_EMAILS_ENABLED is false. Skipping dispatch for Order ID {$this->orderId}.");
            return;
        }

        $order = Order::with(['items', 'user'])->find($this->orderId);
        if (!$order) {
            Log::warning("SendOrderConfirmationEmailJob: Order ID {$this->orderId} not found. Skipping.");
            return;
        }

        // Retrieve or atomically create the outbox tracking record
        $dispatch = $this->dispatchId ? OrderEmailDispatch::find($this->dispatchId) : null;
        if (!$dispatch) {
            $dispatch = OrderEmailDispatch::firstOrCreate([
                'order_id' => $order->id,
                'notification_type' => OrderEmailDispatch::TYPE_ORDER_CONFIRMATION,
            ], [
                'idempotency_key' => "order_confirmation_{$order->id}",
                'recipient_email' => $order->email,
                'recipient_name' => $order->shipping_name ?? $order->user?->name,
                'status' => OrderEmailDispatch::STATUS_QUEUED,
                'attempts' => 0,
            ]);
        }

        // Duplicate-Resistance Check: Never re-send if already marked sent
        if ($dispatch->status === OrderEmailDispatch::STATUS_SENT) {
            Log::info("SendOrderConfirmationEmailJob: Order #{$order->order_number} confirmation email has already been sent. Skipping duplicate.");
            return;
        }

        $dispatch->increment('attempts');
        $dispatch->markAsProcessing();

        // Server-Side Recipient Validation
        $recipientEmail = trim((string) ($order->email ?? ''));
        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $dispatch->markAsFailed('invalid_recipient', "Order #{$order->order_number} does not have a valid customer email address.");
            Log::warning("SendOrderConfirmationEmailJob: Missing or invalid customer email on Order #{$order->order_number}. Suppressing dispatch.");
            return;
        }

        // Suppress delivery to synthetic POS walk-in accounts
        if (str_ends_with(strtolower($recipientEmail), '@ayaan.local')) {
            $dispatch->markAsSkipped("POS walk-in synthetic account address ({$recipientEmail}).");
            Log::info("SendOrderConfirmationEmailJob: Suppressed order confirmation email for POS synthetic account on Order #{$order->order_number}.");
            return;
        }

        // Generate the authoritative Proforma Invoice PDF using the unified CommercialPdfArtifactService
        try {
            $piDoc = $piService->generateForOrder($order);
            $artifactService = app(\App\Services\Documents\CommercialPdfArtifactService::class);
            $piArtifact = $artifactService->getOrGenerateForOrder($order, 'PROFORMA_INVOICE', $piDoc, false);
            $piBinary = $piArtifact['content'];
            if (empty($piBinary) || !str_starts_with($piBinary, '%PDF-')) {
                throw new \RuntimeException("Generated Proforma Invoice binary failed standard PDF header validation.");
            }
        } catch (\Throwable $e) {
            $dispatch->markAsFailed('pi_generation_failed', 'Failed generating Proforma Invoice PDF: ' . $e->getMessage());
            throw $e;
        }

        // Generate the authoritative Offer Sheet PDF using the unified CommercialPdfArtifactService
        try {
            $offerDoc = $offerService->generateForOrder($order, 'OFFER_SHEET');
            $artifactService = app(\App\Services\Documents\CommercialPdfArtifactService::class);
            $offerArtifact = $artifactService->getOrGenerateForOrder($order, 'OFFER_SHEET', $offerDoc, false);
            $offerBinary = $offerArtifact['content'];
            if (empty($offerBinary) || !str_starts_with($offerBinary, '%PDF-')) {
                throw new \RuntimeException("Generated Offer Sheet binary failed standard PDF header validation.");
            }
        } catch (\Throwable $e) {
            $dispatch->markAsFailed('offersheet_generation_failed', 'Failed generating Offer Sheet PDF: ' . $e->getMessage());
            throw $e;
        }

        // Standardize filenames using canonical document numbers
        $cleanOrderNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $order->order_number);
        $piNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($piDoc['docNumber'] ?? $piDoc['doc_number'] ?? "PI-{$cleanOrderNumber}"));
        $offerNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($offerDoc['doc_number'] ?? $offerDoc['docNumber'] ?? "ORD-{$cleanOrderNumber}"));

        $piFilename = "AYC_PI_{$piNumber}.pdf";
        $offerFilename = "AYC_Offer_Sheet_{$offerNumber}.pdf";

        // Validate total attachment payload size against configured limit
        $maxBytes = (int) config('order.emails.max_attachment_size_mb', 20) * 1024 * 1024;
        $totalBytes = strlen($piBinary) + strlen($offerBinary);
        if ($totalBytes > $maxBytes) {
            $dispatch->markAsFailed('attachment_size_exceeded', "Attachments exceed maximum allowable size ({$totalBytes} bytes > {$maxBytes} bytes).");
            Log::error("SendOrderConfirmationEmailJob: Attachments for Order #{$order->order_number} exceed {$maxBytes} bytes limit.");
            return;
        }

        $attachmentsSummary = [
            [
                'type' => 'PROFORMA_INVOICE',
                'document_number' => $piNumber,
                'filename' => $piFilename,
                'size_bytes' => strlen($piBinary),
                'mime_type' => 'application/pdf',
            ],
            [
                'type' => 'OFFER_SHEET',
                'document_number' => $offerNumber,
                'filename' => $offerFilename,
                'size_bytes' => strlen($offerBinary),
                'mime_type' => 'application/pdf',
            ],
        ];

        // Send transactional email through Laravel Mail abstraction
        try {
            Mail::to($recipientEmail)->send(new CustomerOrderConfirmationMail(
                $order,
                $piBinary,
                $piFilename,
                $offerBinary,
                $offerFilename
            ));

            $dispatch->markAsSent($attachmentsSummary);

            Log::info("SendOrderConfirmationEmailJob: Order #{$order->order_number} confirmation email sent successfully to {$recipientEmail}.");
        } catch (\Throwable $e) {
            $sanitizedError = preg_replace('/password=[^&\s]+/i', 'password=***', $e->getMessage());
            $dispatch->markAsFailed('transport_error', $sanitizedError);
            throw $e;
        }
    }

    /**
     * Handle permanent job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("SendOrderConfirmationEmailJob: Permanent failure for Order ID {$this->orderId}", [
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
