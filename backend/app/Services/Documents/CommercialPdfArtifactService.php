<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CommercialPdfArtifactService
{
    public const LAYOUT_VERSION = 'v10.2_offer_sheet_clean_layout_no_desc_no_logistics';

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
        $cleanOrderNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $order->order_number);
        if ($normalizedDocType === 'PROFORMA_INVOICE') {
            $piNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($docPayload['docNumber'] ?? $docPayload['doc_number'] ?? "PI-{$cleanOrderNumber}"));
            $filename = "AYC_PI_{$piNumber}.pdf";
        } elseif ($normalizedDocType === 'OFFER_SHEET' || $normalizedDocType === 'ORDER_SHEET') {
            $offerNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($docPayload['doc_number'] ?? $docPayload['docNumber'] ?? "ORD-{$cleanOrderNumber}"));
            $filename = "AYC_Offer_Sheet_{$offerNumber}.pdf";
        } elseif ($normalizedDocType === 'COMMERCIAL_INVOICE') {
            $ciNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($docPayload['doc_number'] ?? $docPayload['docNumber'] ?? "CI-{$cleanOrderNumber}"));
            $filename = "AYC_CI_{$ciNumber}.pdf";
        } else {
            $filename = ($docPayload['doc_number'] ?? "{$normalizedDocType}-{$order->order_number}") . ".pdf";
        }

        // 1. Fast path: check if valid cached artifact exists
        if (Storage::disk('local')->exists($cacheFile)) {
            $content = Storage::disk('local')->get($cacheFile);
            if (!empty($content) && str_starts_with($content, '%PDF-') && str_contains($content, '%%EOF')) {
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
                if (!empty($content) && str_starts_with($content, '%PDF-') && str_contains($content, '%%EOF')) {
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

            // Render PDF via DocumentPdfService with native Dompdf stream compression enabled
            $renderStartTime = microtime(true);
            $pdfService = app(DocumentPdfService::class);
            $content = $pdfService->render($docPayload)->output(['compress' => 1]);
            $renderMs = round((microtime(true) - $renderStartTime) * 1000, 2);

            // Persist artifact atomically to prevent partial or corrupted reads by concurrent requests
            $tempFile = "{$cacheFile}.tmp." . uniqid('', true);
            Storage::disk('local')->put($tempFile, $content);
            $fullTempPath = Storage::disk('local')->path($tempFile);
            $fullCachePath = Storage::disk('local')->path($cacheFile);
            $targetDir = dirname($fullCachePath);
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0755, true);
            }
            @rename($fullTempPath, $fullCachePath);

            // Safely prune older cached revisions of this document type for this order
            $this->pruneOldArtifacts($cacheDir, "{$normalizedDocType}_", $cacheFile);

            $totalTimeMs = round((microtime(true) - $startTime) * 1000, 2);
            $hash = hash('sha256', $content);

            $sizeBytes = strlen($content);
            if ($sizeBytes > 10 * 1024 * 1024) {
                Log::warning('Commercial PDF generated size exceeds 10MB budget', [
                    'order_id' => $order->id,
                    'doc_type' => $normalizedDocType,
                    'size_bytes' => $sizeBytes,
                ]);
            }

            Log::info('Commercial PDF generated and cached with native compression', [
                'order_id' => $order->id,
                'doc_type' => $normalizedDocType,
                'cache_hit' => false,
                'render_ms' => $renderMs,
                'total_ms' => $totalTimeMs,
                'size_bytes' => $sizeBytes,
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
        $cleanQuoteNumber = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $quotation->quotation_number);
        if ($normalizedDocType === 'PROFORMA_INVOICE') {
            $filename = "AYC_PI_{$cleanQuoteNumber}.pdf";
        } elseif ($normalizedDocType === 'OFFER_SHEET' || $normalizedDocType === 'ORDER_SHEET') {
            $filename = "AYC_Offer_Sheet_{$cleanQuoteNumber}.pdf";
        } elseif ($normalizedDocType === 'QUOTATION') {
            $filename = "AYC_Quotation_{$cleanQuoteNumber}.pdf";
        } else {
            $filename = ($docPayload['doc_number'] ?? "{$normalizedDocType}-{$quotation->quotation_number}") . ".pdf";
        }

        if (Storage::disk('local')->exists($cacheFile)) {
            $content = Storage::disk('local')->get($cacheFile);
            if (!empty($content) && str_starts_with($content, '%PDF-') && str_contains($content, '%%EOF')) {
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
                if (!empty($content) && str_starts_with($content, '%PDF-') && str_contains($content, '%%EOF')) {
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

            // Render PDF via DocumentPdfService with native Dompdf stream compression enabled
            $renderStartTime = microtime(true);
            $pdfService = app(DocumentPdfService::class);
            $content = $pdfService->render($docPayload)->output(['compress' => 1]);
            $renderMs = round((microtime(true) - $renderStartTime) * 1000, 2);

            // Persist artifact atomically to prevent partial or corrupted reads by concurrent requests
            $tempFile = "{$cacheFile}.tmp." . uniqid('', true);
            Storage::disk('local')->put($tempFile, $content);
            $fullTempPath = Storage::disk('local')->path($tempFile);
            $fullCachePath = Storage::disk('local')->path($cacheFile);
            $targetDir = dirname($fullCachePath);
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0755, true);
            }
            @rename($fullTempPath, $fullCachePath);

            $this->pruneOldArtifacts($cacheDir, "{$normalizedDocType}_", $cacheFile);

            $totalTimeMs = round((microtime(true) - $startTime) * 1000, 2);
            $hash = hash('sha256', $content);

            Log::info('Commercial Quotation PDF generated and cached with native compression', [
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
     * Incorporates all displayed order fields, line items, product attributes,
     * saved descriptions, specifications, brand, and gallery image state.
     */
    public function computeOrderFingerprint(Order $order, string $normalizedDocType, bool $isAdmin): string
    {
        $rolePart = $isAdmin ? 'admin' : 'cust';

        $orderCore = implode('|', [
            $order->id,
            $order->order_number,
            $order->currency ?: 'USD',
            (float) $order->subtotal,
            (float) $order->shipping_cost,
            (float) $order->tax_amount,
            (float) $order->discount_amount,
            (float) $order->total_amount,
            $order->payment_method ?? '',
            $order->payment_status ?? '',
            (float) ($order->paid_amount ?? 0),
            $order->payment_reference ?? '',
            $order->payments ? $order->payments->map(fn($p) => "{$p->id}_{$p->status}_{$p->amount}_{$p->transaction_id}")->join(',') : '',
            $order->shipping_name ?? '',
            $order->shipping_address1 ?? '',
            $order->shipping_address2 ?? '',
            $order->shipping_phone ?? '',
            $order->shipping_country_code ?? '',
            $order->user?->company_name ?? '',
            $isAdmin ? ($order->financials['manual_discount_reason'] ?? '') : '',
        ]);

        $productIds = $order->items->pluck('product_id')->filter()->unique()->values();
        $products = Product::with(['images', 'brand'])->whereIn('id', $productIds)->get()->keyBy('id');

        $itemsPart = $order->items->map(function ($it) use ($products) {
            $product = ($it->product_id && isset($products[$it->product_id])) ? $products[$it->product_id] : null;

            $productFingerprint = '';
            if ($product) {
                $brandName = $product->brand?->name ?? (is_string($product->brand) ? $product->brand : '');
                $brandLogoUrl = $product->brand?->logo_url ?? '';
                $brandLogoMtime = $this->resolveLocalImageMtime($brandLogoUrl);

                $images = $product->relationLoaded('images') ? $product->images : $product->images()->get();
                $galleryFingerprint = $images->map(function ($img) {
                    $mtime = $this->resolveLocalImageMtime($img->image_url);
                    return "{$img->id}_{$img->image_url}_{$img->is_primary}_{$img->sort_order}_{$mtime}";
                })->join(',');

                $primaryMtime = $this->resolveLocalImageMtime($product->primary_image_url);

                $productFingerprint = implode('~', [
                    $product->id,
                    $product->title ?? $product->name,
                    $product->description ?? '',
                    $product->design_type ?? '',
                    $product->material ?? ($product->fabric ?? ''),
                    $product->size_description ?? '',
                    $product->colour_description ?? '',
                    is_array($product->specifications) ? json_encode($product->specifications) : ($product->specifications ?? ''),
                    $product->cbm ?? '',
                    $product->gross_weight ?? '',
                    $product->moq ?? '',
                    $product->standard_price ?? '',
                    $product->wholesale_price ?? '',
                    $product->bulk_pricing_enabled ? "bulk:{$product->bulk_price}:{$product->bulk_threshold}" : 'no_bulk',
                    $product->full_stock_price ? "stock:{$product->full_stock_price}:{$product->available_stock}" : 'no_stock',
                    $brandName,
                    $brandLogoUrl,
                    $brandLogoMtime,
                    $galleryFingerprint,
                    $primaryMtime,
                ]);
            }

            $itemMtime = $this->resolveLocalImageMtime($it->product_image_url);

            return implode(':', [
                $it->id,
                $it->product_id,
                (int) $it->quantity,
                (float) $it->unit_price,
                (float) $it->line_total,
                $it->product_name ?? '',
                $it->sku ?? '',
                $it->variant_title ?? '',
                is_array($it->package_breakdown) ? json_encode($it->package_breakdown) : ($it->package_breakdown ?? ''),
                $itemMtime,
                $productFingerprint,
            ]);
        })->join('-');

        $exporter = DocumentHelper::getExporterProfile();
        $exporterFingerprint = implode('^', [
            $exporter['company_name'] ?? '',
            $exporter['address'] ?? '',
            $exporter['country_of_origin'] ?? '',
            $exporter['contact_email'] ?? '',
            $exporter['whatsapp_display'] ?? '',
            $exporter['reg_number'] ?? '',
        ]);

        return hash('sha256', "order_" . self::LAYOUT_VERSION . "_{$order->id}_{$normalizedDocType}_{$rolePart}_{$orderCore}_{$itemsPart}_{$exporterFingerprint}");
    }

    /**
     * Compute a deterministic source-data fingerprint for a Quotation document.
     */
    public function computeQuotationFingerprint(Quotation $quotation, string $normalizedDocType, bool $isAdmin): string
    {
        $rolePart = $isAdmin ? 'admin' : 'cust';

        $quoteCore = implode('|', [
            $quotation->id,
            $quotation->quotation_number,
            $quotation->currency ?: 'USD',
            (float) $quotation->subtotal,
            (float) $quotation->shipping_cost,
            (float) $quotation->tax_amount,
            (float) $quotation->discount_amount,
            (float) $quotation->grand_total,
            $quotation->payment_status ?? '',
            $quotation->company_name ?? '',
            $quotation->customer_name ?? '',
            $quotation->customer_email ?? '',
            $quotation->customer_phone ?? '',
            $quotation->shipping_address ?? '',
        ]);

        $productIds = $quotation->items->pluck('product_id')->filter()->unique()->values();
        $products = Product::with(['images', 'brand'])->whereIn('id', $productIds)->get()->keyBy('id');

        $itemsPart = $quotation->items->map(function ($it) use ($products) {
            $product = ($it->product_id && isset($products[$it->product_id])) ? $products[$it->product_id] : null;

            $productFingerprint = '';
            if ($product) {
                $brandName = $product->brand?->name ?? (is_string($product->brand) ? $product->brand : '');
                $brandLogoUrl = $product->brand?->logo_url ?? '';
                $brandLogoMtime = $this->resolveLocalImageMtime($brandLogoUrl);

                $images = $product->relationLoaded('images') ? $product->images : $product->images()->get();
                $galleryFingerprint = $images->map(function ($img) {
                    $mtime = $this->resolveLocalImageMtime($img->image_url);
                    return "{$img->id}_{$img->image_url}_{$img->is_primary}_{$img->sort_order}_{$mtime}";
                })->join(',');

                $primaryMtime = $this->resolveLocalImageMtime($product->primary_image_url);

                $productFingerprint = implode('~', [
                    $product->id,
                    $product->title ?? $product->name,
                    $product->description ?? '',
                    $product->design_type ?? '',
                    $product->material ?? ($product->fabric ?? ''),
                    $product->size_description ?? '',
                    $product->colour_description ?? '',
                    is_array($product->specifications) ? json_encode($product->specifications) : ($product->specifications ?? ''),
                    $product->cbm ?? '',
                    $product->gross_weight ?? '',
                    $product->moq ?? '',
                    $product->standard_price ?? '',
                    $product->wholesale_price ?? '',
                    $product->bulk_pricing_enabled ? "bulk:{$product->bulk_price}:{$product->bulk_threshold}" : 'no_bulk',
                    $product->full_stock_price ? "stock:{$product->full_stock_price}:{$product->available_stock}" : 'no_stock',
                    $brandName,
                    $brandLogoUrl,
                    $brandLogoMtime,
                    $galleryFingerprint,
                    $primaryMtime,
                ]);
            }

            $itemMtime = $this->resolveLocalImageMtime($it->product_image_url);

            return implode(':', [
                $it->id,
                $it->product_id,
                (int) $it->quantity,
                (float) $it->unit_price,
                (float) $it->line_total,
                $it->product_name ?? '',
                $it->sku ?? '',
                $it->variant_title ?? '',
                is_array($it->package_breakdown) ? json_encode($it->package_breakdown) : ($it->package_breakdown ?? ''),
                $itemMtime,
                $productFingerprint,
            ]);
        })->join('-');

        $exporter = DocumentHelper::getExporterProfile();
        $exporterFingerprint = implode('^', [
            $exporter['company_name'] ?? '',
            $exporter['address'] ?? '',
            $exporter['country_of_origin'] ?? '',
            $exporter['contact_email'] ?? '',
            $exporter['whatsapp_display'] ?? '',
            $exporter['reg_number'] ?? '',
        ]);

        return hash('sha256', "quotation_" . self::LAYOUT_VERSION . "_{$quotation->id}_{$normalizedDocType}_{$rolePart}_{$quoteCore}_{$itemsPart}_{$exporterFingerprint}");
    }

    /**
     * Resolve the last modification time of a local image asset for cache fingerprinting.
     * Fast stat check without image decoding.
     */
    protected function resolveLocalImageMtime(?string $url): int
    {
        if (!$url || trim($url) === '') {
            return 0;
        }

        $trimmed = trim($url);
        if (str_starts_with($trimmed, 'data:image')) {
            return crc32($trimmed);
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
                return (int) @filemtime($c);
            }
        }

        return 0;
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
