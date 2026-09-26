<?php

namespace App\Jobs;

use App\Models\Quotation;
use App\Services\Documents\CommercialInvoiceService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateCommercialDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;
    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $quotationId,
        public string $documentType,
        public ?string $destinationPath = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        OfferSheetService $offerSheetService,
        ProformaInvoiceService $piService,
        CommercialInvoiceService $ciService
    ): void {
        $quotation = Quotation::with(['rfq', 'user', 'items'])->find($this->quotationId);

        if (!$quotation) {
            Log::warning("GenerateCommercialDocumentJob: Quotation {$this->quotationId} not found, skipping.");
            return;
        }

        $normalizedType = str_replace('_', '-', strtolower($this->documentType));
        Log::info("Generating commercial document asynchronously", [
            'quotation_id' => $quotation->id,
            'quotation_number' => $quotation->quotation_number,
            'document_type' => $normalizedType,
        ]);

        $pdf = match ($normalizedType) {
            'offer-sheet' => $offerSheetService->generate($quotation),
            'proforma-invoice' => $piService->generate($quotation),
            'commercial-invoice' => $ciService->generate($quotation),
            default => throw new \InvalidArgumentException("Unsupported document type: {$this->documentType}"),
        };

        $fileName = $this->destinationPath ?: "documents/{$quotation->quotation_number}_{$normalizedType}.pdf";
        Storage::disk('local')->put($fileName, $pdf->output());

        Log::info("Commercial document generated successfully and archived", [
            'quotation_id' => $quotation->id,
            'file_name' => $fileName,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("GenerateCommercialDocumentJob failed", [
            'quotation_id' => $this->quotationId,
            'document_type' => $this->documentType,
            'error' => $exception->getMessage(),
        ]);
    }
}
