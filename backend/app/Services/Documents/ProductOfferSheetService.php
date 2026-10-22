<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductOfferSheet;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class ProductOfferSheetService
{
    public const TARGET_SIZE_BYTES = 1572864; // 1.5 MB target
    public const MAX_SIZE_BYTES = 2097152;    // 2.0 MB hard limit

    public const LAYOUT_VERSION = 'v7.8_offer_sheet_pricing_alignment_and_headings_cleanup';

    public function __construct(
        protected OfferSheetService $offerSheetService,
        protected DocumentPdfService $pdfService,
        protected PdfMergerService $pdfMergerService
    ) {}

    /**
     * Compute deterministic source data fingerprint for a product Offer Sheet.
     * Incorporates all fields rendered in the template, images, and brand.
     * Unrelated fields (such as variant stock updates) are excluded.
     */
    public function computeFingerprint(Product $product): string
    {
        $brandName = $product->brand?->name ?? (is_string($product->brand) ? $product->brand : '');
        $brandLogoUrl = $product->brand?->logo_url ?? '';
        $brandLogoChecksum = $this->resolveLocalImageChecksum($brandLogoUrl);

        $images = $product->relationLoaded('images') ? $product->images : $product->images()->get();
        $galleryFingerprint = $images->map(function ($img) {
            $checksum = $this->resolveLocalImageChecksum($img->image_url);
            return "{$img->id}_{$img->image_url}_{$img->is_primary}_{$img->sort_order}_{$checksum}";
        })->join(',');

        $primaryChecksum = $this->resolveLocalImageChecksum($product->primary_image_url);

        $specsFingerprint = is_array($product->specifications) 
            ? json_encode($product->specifications) 
            : (string) ($product->specifications ?? '');

        // Exporter / company profile fingerprint (to invalidate if company address or contact details update)
        $exporter = DocumentHelper::getExporterProfile();
        $exporterFingerprint = md5(implode('|', [
            $exporter['company_name'] ?? '',
            $exporter['address'] ?? '',
            $exporter['whatsapp_display'] ?? '',
            $exporter['email'] ?? '',
        ]));

        $corePayload = implode('~', [
            $product->id,
            $product->sku ?? '',
            $product->name ?? '',
            $product->description ?? '',
            $product->design_type ?? '',
            $product->material ?? ($product->fabric ?? ''),
            $product->size_description ?? '',
            $product->colour_description ?? '',
            $specsFingerprint,
            $product->cbm ?? '',
            $product->gross_weight ?? '',
            $product->moq ?? '',
            $product->standard_price ?? '',
            $product->wholesale_price ?? '',
            $product->bulk_pricing_enabled ? "bulk:{$product->bulk_price}:{$product->bulk_threshold}" : 'no_bulk',
            $product->full_stock_price ? "stock:{$product->full_stock_price}:{$product->available_stock}" : 'no_stock',
            $brandName,
            $brandLogoUrl,
            $brandLogoChecksum,
            $galleryFingerprint,
            $primaryChecksum,
            $exporterFingerprint,
        ]);

        return hash('sha256', "product_offer_sheet_" . self::LAYOUT_VERSION . "_{$product->id}_{$corePayload}");
    }

    /**
     * Retrieve a cached canonical product Offer Sheet PDF or generate and compress it atomically.
     *
     * @return array{content: string, is_hit: bool, filename: string, hash: string, filesize: int, time_ms: float}
     */
    public function getOrGenerate(Product $product, bool $force = false): array
    {
        $startTime = microtime(true);
        $fingerprint = $this->computeFingerprint($product);
        $cleanSku = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($product->sku ?: "PROD-{$product->id}"));
        $filename = "AYC_Offer_Sheet_{$cleanSku}.pdf";

        $storageDisk = Storage::disk('local');
        $relativeDir = "product_offer_sheets/{$product->id}";
        $canonicalPath = "{$relativeDir}/OFFER_SHEET_{$fingerprint}.pdf";

        // 1. Fast path: check DB and disk cache
        if (!$force) {
            $sheetRecord = ProductOfferSheet::where('product_id', $product->id)->first();
            if ($sheetRecord && $sheetRecord->fingerprint === $fingerprint) {
                if ($storageDisk->exists($canonicalPath)) {
                    $content = $storageDisk->get($canonicalPath);
                    if ($this->isPdfValid($content)) {
                        if (!$sheetRecord->isReady()) {
                            $sheetRecord->update([
                                'status' => ProductOfferSheet::STATUS_READY,
                                'filesize_bytes' => strlen($content),
                                'checksum_sha256' => hash('sha256', $content),
                                'generated_at' => $sheetRecord->generated_at ?: now(),
                            ]);
                        }
                        $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                        return [
                            'content' => $content,
                            'is_hit' => true,
                            'filename' => $sheetRecord->filename ?: $filename,
                            'hash' => $sheetRecord->checksum_sha256 ?: hash('sha256', $content),
                            'filesize' => strlen($content),
                            'time_ms' => $timeMs,
                        ];
                    }
                }
            }
        }

        // 2. Slow path: Acquire concurrency lock to prevent competing generation jobs
        $lockKey = "product_offer_sheet_lock_{$product->id}";
        $lock = Cache::lock($lockKey, 60);

        try {
            $lock->block(30);

            // Double check cache in case concurrent worker completed generation
            if (!$force) {
                $sheetRecord = ProductOfferSheet::where('product_id', $product->id)->first();
                if ($sheetRecord && $sheetRecord->fingerprint === $fingerprint) {
                    if ($storageDisk->exists($canonicalPath)) {
                        $content = $storageDisk->get($canonicalPath);
                        if ($this->isPdfValid($content)) {
                            if (!$sheetRecord->isReady()) {
                                $sheetRecord->update([
                                    'status' => ProductOfferSheet::STATUS_READY,
                                    'filesize_bytes' => strlen($content),
                                    'checksum_sha256' => hash('sha256', $content),
                                    'generated_at' => $sheetRecord->generated_at ?: now(),
                                ]);
                            }
                            $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                            return [
                                'content' => $content,
                                'is_hit' => true,
                                'filename' => $sheetRecord->filename ?: $filename,
                                'hash' => $sheetRecord->checksum_sha256 ?: hash('sha256', $content),
                                'filesize' => strlen($content),
                                'time_ms' => $timeMs,
                            ];
                        }
                    }
                }
            }

            // Mark as processing in DB
            ProductOfferSheet::updateOrCreate(
                ['product_id' => $product->id],
                [
                    'sku' => $product->sku ?: "PROD-{$product->id}",
                    'status' => ProductOfferSheet::STATUS_PROCESSING,
                    'fingerprint' => $fingerprint,
                    'filename' => $filename,
                ]
            );

            // Render canonical Offer Sheet payload through existing OfferSheetService
            $docPayload = $this->offerSheetService->generateForProduct($product);

            // Render PDF via DocumentPdfService with native stream compression enabled
            $renderStartTime = microtime(true);
            $content = $this->pdfService->render($docPayload)->output(['compress' => 1]);
            $renderMs = round((microtime(true) - $renderStartTime) * 1000, 2);

            $sizeBytes = strlen($content);

            // Validate PDF integrity
            if (!$this->isPdfValid($content)) {
                $errorMsg = "Generated PDF failed integrity check (missing %PDF- or %%EOF).";
                $this->markFailed($product, $fingerprint, $filename, $errorMsg);
                throw new RuntimeException($errorMsg);
            }

            // Enforce 2 MB hard limit
            if ($sizeBytes > self::MAX_SIZE_BYTES) {
                $errorMsg = "Generated Offer Sheet size ({$sizeBytes} bytes) exceeds 2 MB hard limit.";
                $this->markFailed($product, $fingerprint, $filename, $errorMsg);
                throw new RuntimeException($errorMsg);
            }

            // Atomic file write using temporary file and rename
            $tempFile = "{$canonicalPath}.tmp." . uniqid('', true);
            $storageDisk->put($tempFile, $content);

            $fullTemp = $storageDisk->path($tempFile);
            $fullTarget = $storageDisk->path($canonicalPath);
            $targetDir = dirname($fullTarget);
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0775, true);
            }
            @rename($fullTemp, $fullTarget);
            @chmod($fullTarget, 0664);
            @chmod($targetDir, 0775);

            // Prune obsolete older revisions of Offer Sheets for this product
            $this->pruneOldArtifacts($relativeDir, "OFFER_SHEET_", $canonicalPath);

            $hash = hash('sha256', $content);
            $pageCount = preg_match_all('/\/Type\s*\/Page\b/', $content, $pm) ? count($pm[0]) : 1;

            // Mark ready in DB with complete version metadata
            ProductOfferSheet::updateOrCreate(
                ['product_id' => $product->id],
                [
                    'sku' => $product->sku ?: "PROD-{$product->id}",
                    'status' => ProductOfferSheet::STATUS_READY,
                    'fingerprint' => $fingerprint,
                    'file_path' => $canonicalPath,
                    'filename' => $filename,
                    'filesize_bytes' => $sizeBytes,
                    'checksum_sha256' => $hash,
                    'page_count' => $pageCount,
                    'metadata' => [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'sku' => $product->sku,
                        'wholesale_price' => $product->wholesale_price,
                        'moq' => $product->moq,
                        'brand' => $product->brand?->name ?? 'AYAAN CLOTHING',
                        'gallery_count' => count($docPayload['product_gallery'] ?? []),
                        'render_duration_ms' => $renderMs,
                        'total_duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
                    ],
                    'error_message' => null,
                    'generated_at' => now(),
                ]
            );

            $totalTimeMs = round((microtime(true) - $startTime) * 1000, 2);

            Log::info('Product Offer Sheet generated, compressed, and stored', [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'filesize' => $sizeBytes,
                'page_count' => $pageCount,
                'duration_ms' => $totalTimeMs,
            ]);

            return [
                'content' => $content,
                'is_hit' => false,
                'filename' => $filename,
                'hash' => $hash,
                'filesize' => $sizeBytes,
                'time_ms' => $totalTimeMs,
            ];
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Merge canonical Offer Sheet PDFs for multiple products into a single combined PDF.
     * Preserves exact product selection order and original document formatting.
     *
     * @param Collection|array<Product> $products
     * @return array{content: string, is_hit: bool, filename: string, hash: string, filesize: int, time_ms: float}
     */
    public function mergeProductsOfferSheets($products): array
    {
        $startTime = microtime(true);
        $productList = $products instanceof Collection ? $products->values() : collect($products)->values();

        if ($productList->isEmpty()) {
            throw new RuntimeException("No products provided for bulk Offer Sheet generation.");
        }

        // If only 1 product, retrieve its canonical artifact directly
        if ($productList->count() === 1) {
            return $this->getOrGenerate($productList->first());
        }

        // Collect individual canonical PDFs and hashes in the exact requested order
        $binaries = [];
        $hashes = [];
        $productIds = [];

        foreach ($productList as $product) {
            $artifact = $this->getOrGenerate($product);
            $binaries[] = $artifact['content'];
            $hashes[] = $artifact['hash'];
            $productIds[] = $product->id;
        }

        $mergedFingerprint = hash('sha256', 'bulk_merged_' . implode('|', $hashes));
        $cacheDir = "documents_cache/bulk_offer_sheets";
        $cacheFile = "{$cacheDir}/bulk_{$mergedFingerprint}.pdf";
        $filename = "AYC_Combined_Offer_Sheets_" . date('Ymd_His') . ".pdf";

        $storageDisk = Storage::disk('local');

        // Check cache for this exact set and order of product versions
        if ($storageDisk->exists($cacheFile)) {
            $content = $storageDisk->get($cacheFile);
            if ($this->isPdfValid($content)) {
                $timeMs = round((microtime(true) - $startTime) * 1000, 2);
                return [
                    'content' => $content,
                    'is_hit' => true,
                    'filename' => $filename,
                    'hash' => hash('sha256', $content),
                    'filesize' => strlen($content),
                    'time_ms' => $timeMs,
                ];
            }
        }

        // Merge using the pure PHP PdfMergerService
        $mergedBinary = $this->pdfMergerService->merge($binaries);

        // Store atomically
        $tempFile = "{$cacheFile}.tmp." . uniqid('', true);
        $storageDisk->put($tempFile, $mergedBinary);

        $fullTemp = $storageDisk->path($tempFile);
        $fullTarget = $storageDisk->path($cacheFile);
        $targetDir = dirname($fullTarget);
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0775, true);
        }
        @rename($fullTemp, $fullTarget);
        @chmod($fullTarget, 0664);
        @chmod($targetDir, 0775);

        $totalTimeMs = round((microtime(true) - $startTime) * 1000, 2);

        return [
            'content' => $mergedBinary,
            'is_hit' => false,
            'filename' => $filename,
            'hash' => hash('sha256', $mergedBinary),
            'filesize' => strlen($mergedBinary),
            'time_ms' => $totalTimeMs,
        ];
    }

    /**
     * Retrieve or assemble the canonical Offer Sheet for an Order.
     * If 1 product: returns the product's canonical Offer Sheet.
     * If multiple products: merges their canonical Offer Sheets.
     */
    public function getOrGenerateForOrder(Order $order): array
    {
        $productIds = $order->items->pluck('product_id')->filter()->unique()->values();
        $products = Product::with(['images', 'brand'])->whereIn('id', $productIds)->get()->keyBy('id');

        $orderedProducts = [];
        foreach ($order->items as $item) {
            if ($item->product_id && isset($products[$item->product_id])) {
                $p = $products[$item->product_id];
                if (!isset($orderedProducts[$p->id])) {
                    $orderedProducts[$p->id] = $p;
                }
            }
        }

        $cleanOrderNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $order->order_number);
        $targetFilename = "AYC_Offer_Sheet_{$cleanOrderNumber}.pdf";

        if (empty($orderedProducts)) {
            // Fallback to legacy Order Offer Sheet generation if products are detached
            $offerDoc = $this->offerSheetService->generateForOrder($order, 'OFFER_SHEET');
            $artifactService = app(CommercialPdfArtifactService::class);
            return $artifactService->getOrGenerateForOrder($order, 'OFFER_SHEET', $offerDoc, false);
        }

        $mergedResult = $this->mergeProductsOfferSheets(array_values($orderedProducts));
        $mergedResult['filename'] = $targetFilename;

        return $mergedResult;
    }

    /**
     * Mark product Offer Sheet as failed without deleting previous valid artifact.
     */
    protected function markFailed(Product $product, string $fingerprint, string $filename, string $errorMsg): void
    {
        ProductOfferSheet::updateOrCreate(
            ['product_id' => $product->id],
            [
                'sku' => $product->sku ?: "PROD-{$product->id}",
                'status' => ProductOfferSheet::STATUS_FAILED,
                'fingerprint' => $fingerprint,
                'filename' => $filename,
                'error_message' => $errorMsg,
            ]
        );

        Log::error('Product Offer Sheet generation failed', [
            'product_id' => $product->id,
            'sku' => $product->sku,
            'error' => $errorMsg,
        ]);
    }

    /**
     * Validate raw PDF content.
     */
    public function isPdfValid(string $content): bool
    {
        return !empty($content) && str_starts_with($content, '%PDF-') && str_contains($content, '%%EOF');
    }

    /**
     * Resolve reliable content checksum for an image file.
     * Combines content hash, filesize, and mtime to guarantee invalidation on any asset modification.
     */
    protected function resolveLocalImageChecksum(?string $url): string
    {
        if (!$url || trim($url) === '') {
            return 'empty';
        }

        $trimmed = trim($url);
        if (str_starts_with($trimmed, 'data:image')) {
            return hash('sha256', $trimmed);
        }

        $clean = explode('?', explode('#', $trimmed)[0])[0];
        $clean = preg_replace('#^https?://[^/]+#i', '', $clean);
        $clean = preg_replace('#^/ayc#i', '', $clean);
        $clean = preg_replace('#^/?storage/#i', '', $clean);
        $cleanRel = ltrim($clean, '/');
        $decodedRel = urldecode($cleanRel);

        $candidates = [
            storage_path("app/public/{$cleanRel}"),
            public_path("storage/{$cleanRel}"),
            public_path($cleanRel),
            base_path($cleanRel),
            storage_path("app/public/{$decodedRel}"),
            public_path("storage/{$decodedRel}"),
            public_path($decodedRel),
            base_path($decodedRel),
        ];

        foreach ($candidates as $c) {
            if (file_exists($c) && is_file($c)) {
                $hash = @md5_file($c) ?: 'nohash';
                $size = (int) @filesize($c);
                $mtime = (int) @filemtime($c);
                return "{$hash}_{$size}_{$mtime}";
            }
        }

        return hash('sha256', $trimmed);
    }

    /**
     * Safely prune older cached revisions for this product.
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
            Log::warning('Failed to prune old product Offer Sheet artifacts', [
                'directory' => $directory,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
