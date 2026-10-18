<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Quotation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CommercialPdfArtifactService
{
    /**
     * Retrieve a cached commercial PDF artifact or render and persist it atomically.
     * Guarantees 100% identical byte parity for View and Download.
     *
     * @return array{content: string, is_hit: bool, filename: string, hash: string, time_ms: float}
     */
    public function getOrGenerateForOrder(Order $order, string $normalizedDocType, array $docPayload, bool $isAdmin): array
    {
        $startTime = microtime(true);
        $fingerprint = $this->computeOrderFingerprint($order, $normalizedDocType, $isAdmin);
        $cacheDir = "documents_cache/order_{$order->id}";
        $cacheFile = "{$cacheDir}/{$normalizedDocType}_{$fingerprint}.pdf";
        $filename = ($docPayload['doc_number'] ?? "{$normalizedDocType}-{$order->order_number}") . ".pdf";

        // 1. Fast path: check if valid cached artifact exists
        if (Storage::disk('local')->exists($cacheFile)) {
            $content = Storage::disk('local')->get($cacheFile);
            if (!empty($content)) {
                $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                $hash = hash('sha256', $content);
                Log::info('Commercial PDF retrieved from disk cache', [
                    'order_id' => $order->id,
                    'doc_type' => $normalizedDocType,
                    'cache_hit' => true,
                    'size_bytes' => strlen($content),
                    'duration_ms' => $timeMs,
                ]);

                return [
                    'content' => $content,
                    'is_hit' => true,
                    'filename' => $filename,
                    'hash' => $hash,
                    'time_ms' => $timeMs,
                ];
            }
        }

        // 2. Slow path: synchronize with an atomic lock to prevent duplicate concurrent rendering
        $lockKey = "pdf_lock_order_{$order->id}_{$normalizedDocType}";
        $lock = Cache::lock($lockKey, 30);

        try {
            $lock->block(15);

            // Double check cache in case concurrent process completed generation
            if (Storage::disk('local')->exists($cacheFile)) {
                $content = Storage::disk('local')->get($cacheFile);
                if (!empty($content)) {
                    $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                    $hash = hash('sha256', $content);
                    return [
                        'content' => $content,
                        'is_hit' => true,
                        'filename' => $filename,
                        'hash' => $hash,
                        'time_ms' => $timeMs,
                    ];
                }
            }

            // Render PDF via DocumentPdfService
            $renderStartTime = microtime(true);
            $pdfService = app(DocumentPdfService::class);
            $content = $pdfService->render($docPayload)->output();
            $renderMs = round((microtime(true) - $renderStartTime) * 1000, 2);

            // Persist artifact privately on local storage
            Storage::disk('local')->put($cacheFile, $content);

            // Safely prune older cached revisions of this document type for this order
            $this->pruneOldArtifacts($cacheDir, "{$normalizedDocType}_", $cacheFile);

            $totalTimeMs = round((microtime(true) - $startTime) * 1000, 2);
            $hash = hash('sha256', $content);

            Log::info('Commercial PDF generated and cached', [
                'order_id' => $order->id,
                'doc_type' => $normalizedDocType,
                'cache_hit' => false,
                'render_ms' => $renderMs,
                'total_ms' => $totalTimeMs,
                'size_bytes' => strlen($content),
            ]);

            return [
                'content' => $content,
                'is_hit' => false,
                'filename' => $filename,
                'hash' => $hash,
                'time_ms' => $totalTimeMs,
            ];
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Retrieve a cached quotation commercial PDF artifact or render and persist it atomically.
     *
     * @return array{content: string, is_hit: bool, filename: string, hash: string, time_ms: float}
     */
    public function getOrGenerateForQuotation(Quotation $quotation, string $normalizedDocType, array $docPayload, bool $isAdmin): array
    {
        $startTime = microtime(true);
        $fingerprint = $this->computeQuotationFingerprint($quotation, $normalizedDocType, $isAdmin);
        $cacheDir = "documents_cache/quotation_{$quotation->id}";
        $cacheFile = "{$cacheDir}/{$normalizedDocType}_{$fingerprint}.pdf";
        $filename = ($docPayload['doc_number'] ?? "{$normalizedDocType}-{$quotation->quotation_number}") . ".pdf";

        if (Storage::disk('local')->exists($cacheFile)) {
            $content = Storage::disk('local')->get($cacheFile);
            if (!empty($content)) {
                $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                $hash = hash('sha256', $content);
                Log::info('Commercial Quotation PDF retrieved from disk cache', [
                    'quotation_id' => $quotation->id,
                    'doc_type' => $normalizedDocType,
                    'cache_hit' => true,
                    'size_bytes' => strlen($content),
                    'duration_ms' => $timeMs,
                ]);

                return [
                    'content' => $content,
                    'is_hit' => true,
                    'filename' => $filename,
                    'hash' => $hash,
                    'time_ms' => $timeMs,
                ];
            }
        }

        $lockKey = "pdf_lock_quotation_{$quotation->id}_{$normalizedDocType}";
        $lock = Cache::lock($lockKey, 30);

        try {
            $lock->block(15);

            if (Storage::disk('local')->exists($cacheFile)) {
                $content = Storage::disk('local')->get($cacheFile);
                if (!empty($content)) {
                    $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                    $hash = hash('sha256', $content);
                    return [
                        'content' => $content,
                        'is_hit' => true,
                        'filename' => $filename,
                        'hash' => $hash,
                        'time_ms' => $timeMs,
                    ];
                }
            }

            $renderStartTime = microtime(true);
            $pdfService = app(DocumentPdfService::class);
            $content = $pdfService->render($docPayload)->output();
            $renderMs = round((microtime(true) - $renderStartTime) * 1000, 2);

            Storage::disk('local')->put($cacheFile, $content);
            $this->pruneOldArtifacts($cacheDir, "{$normalizedDocType}_", $cacheFile);

            $totalTimeMs = round((microtime(true) - $startTime) * 1000, 2);
            $hash = hash('sha256', $content);

            Log::info('Commercial Quotation PDF generated and cached', [
                'quotation_id' => $quotation->id,
                'doc_type' => $normalizedDocType,
                'cache_hit' => false,
                'render_ms' => $renderMs,
                'total_ms' => $totalTimeMs,
                'size_bytes' => strlen($content),
            ]);

            return [
                'content' => $content,
                'is_hit' => false,
                'filename' => $filename,
                'hash' => $hash,
                'time_ms' => $totalTimeMs,
            ];
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Compute a deterministic source-data fingerprint for an Order document.
     */
    public function computeOrderFingerprint(Order $order, string $normalizedDocType, bool $isAdmin): string
    {
        $itemsPart = $order->items->map(function ($it) {
            $updated = $it->updated_at ? $it->updated_at->timestamp : '';
            return "{$it->id}_{$it->product_id}_{$it->quantity}_{$it->unit_price}_{$updated}";
        })->join('-');

        $rolePart = $isAdmin ? 'admin' : 'cust';
        $updatedAt = $order->updated_at ? $order->updated_at->timestamp : ($order->created_at ? $order->created_at->timestamp : '');

        return hash('sha256', "order_{$order->id}_{$normalizedDocType}_{$rolePart}_{$updatedAt}_{$order->total_amount}_{$itemsPart}");
    }

    /**
     * Compute a deterministic source-data fingerprint for a Quotation document.
     */
    public function computeQuotationFingerprint(Quotation $quotation, string $normalizedDocType, bool $isAdmin): string
    {
        $itemsPart = $quotation->items->map(function ($it) {
            $updated = $it->updated_at ? $it->updated_at->timestamp : '';
            return "{$it->id}_{$it->product_id}_{$it->quantity}_{$it->unit_price}_{$updated}";
        })->join('-');

        $rolePart = $isAdmin ? 'admin' : 'cust';
        $updatedAt = $quotation->updated_at ? $quotation->updated_at->timestamp : ($quotation->created_at ? $quotation->created_at->timestamp : '');

        return hash('sha256', "quotation_{$quotation->id}_{$normalizedDocType}_{$rolePart}_{$updatedAt}_{$quotation->grand_total}_{$itemsPart}");
    }

    /**
     * Clean up older cached artifacts for this document prefix to keep disk usage bounded.
     */
    protected function pruneOldArtifacts(string $directory, string $prefix, string $keepFile): void
    {
        try {
            $disk = Storage::disk('local');
            if (!$disk->exists($directory)) {
                return;
            }
            $allFiles = $disk->files($directory);
            foreach ($allFiles as $file) {
                if ($file !== $keepFile && str_starts_with(basename($file), $prefix)) {
                    $disk->delete($file);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to prune old PDF artifacts', [
                'directory' => $directory,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
