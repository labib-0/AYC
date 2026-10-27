<?php

namespace App\Jobs;

use App\Models\Product;
use App\Services\Documents\ProductOfferSheetService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateProductOfferSheetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 90, 180];
    public int $timeout = 180;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $productId,
        public bool $force = false
    ) {
        $this->onQueue(config('order.emails.queue', 'default'));
        $this->afterCommit();
    }

    /**
     * Execute the job.
     */
    public function handle(ProductOfferSheetService $service): void
    {
        $product = Product::with(['images', 'brand', 'pricingTiers', 'shippingPackageProfiles'])->find($this->productId);

        if (!$product) {
            Log::warning("GenerateProductOfferSheetJob: Product ID {$this->productId} not found. Skipping.");
            return;
        }

        try {
            $result = $service->getOrGenerate($product, $this->force);
            Log::info("GenerateProductOfferSheetJob: Successfully completed Offer Sheet for Product #{$product->id} ({$product->sku})", [
                'is_hit' => $result['is_hit'],
                'filesize' => $result['filesize'],
                'duration_ms' => $result['time_ms'],
            ]);
        } catch (\Throwable $e) {
            Log::error("GenerateProductOfferSheetJob: Failed generating Offer Sheet for Product #{$product->id}: " . $e->getMessage(), [
                'exception' => $e,
            ]);
            throw $e;
        }
    }
}
