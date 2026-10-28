<?php

namespace App\Console\Commands;

use App\Jobs\GenerateProductOfferSheetJob;
use App\Models\Product;
use App\Models\ProductOfferSheet;
use App\Services\Documents\ProductOfferSheetService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PregenerateProductOfferSheetsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'ayaan:pregenerate-offer-sheets
                            {--product= : Specific product ID, SKU, or slug to generate}
                            {--force : Force regeneration even if an artifact is already current}
                            {--queue : Dispatch generation jobs to the background queue instead of executing synchronously}
                            {--dry-run : Inspect catalog readiness and print summary without generating}
                            {--chunk=25 : Number of products to process per chunk to control memory}
                            {--delay=0 : Delay in milliseconds between item generations}';

    /**
     * Console command aliases.
     *
     * @var array<int, string>
     */
    protected $aliases = [
        'products:reconcile-offer-sheets',
        'ayaan:reconcile-offer-sheets',
    ];

    /**
     * The console command description.
     */
    protected $description = 'Audit, reconcile, pre-generate, and cache product Offer Sheet PDF artifacts.';

    /**
     * Execute the console command.
     */
    public function handle(ProductOfferSheetService $service): int
    {
        $productId = $this->option('product');
        $force = (bool) $this->option('force');
        $queue = (bool) $this->option('queue');
        $dryRun = (bool) $this->option('dry-run');
        $chunkSize = max(1, (int) $this->option('chunk'));
        $delayMs = max(0, (int) $this->option('delay'));

        $query = Product::with(['images', 'brand', 'pricingTiers', 'shippingPackageProfiles'])
            ->where('status', 'published')
            ->orderBy('id', 'asc');

        if ($productId) {
            $query->where(function ($q) use ($productId) {
                if (is_numeric($productId)) {
                    $q->where('id', (int) $productId);
                } else {
                    $q->where('sku', $productId)->orWhere('slug', $productId);
                }
            });
        }

        $totalPublished = (clone $query)->count();

        if ($totalPublished === 0) {
            $this->warn('No published products found matching criteria.');
            return 0;
        }

        $this->info("Catalog audit: Found {$totalPublished} published product(s). Mode: " . 
            ($dryRun ? 'DRY-RUN (audit only)' : ($queue ? 'QUEUE DISPATCH' : 'SYNCHRONOUS GENERATION')));

        $storageDisk = Storage::disk('local');

        // DRY-RUN AUDIT MODE
        if ($dryRun) {
            $currentReady = 0;
            $staleCount = 0;
            $missingCount = 0;

            $bar = $this->output->createProgressBar($totalPublished);
            $bar->start();

            $query->chunkById($chunkSize, function ($products) use ($service, $storageDisk, &$currentReady, &$staleCount, &$missingCount, $bar) {
                foreach ($products as $product) {
                    $fingerprint = $service->computeFingerprint($product);
                    $sheetRecord = ProductOfferSheet::where('product_id', $product->id)->first();
                    $canonicalPath = "product_offer_sheets/{$product->id}/OFFER_SHEET_{$fingerprint}.pdf";

                    if (!$sheetRecord) {
                        $missingCount++;
                    } elseif ($sheetRecord->fingerprint === $fingerprint && $sheetRecord->isReady() && $storageDisk->exists($canonicalPath)) {
                        $currentReady++;
                    } else {
                        $staleCount++;
                    }
                    $bar->advance();
                }
                gc_collect_cycles();
            });

            $bar->finish();
            $this->newLine(2);

            $this->table(
                ['Metric', 'Count', 'Percentage'],
                [
                    ['Total Published Products', $totalPublished, '100%'],
                    ['Current Ready (Fingerprint Match + On Disk)', $currentReady, round(($currentReady / $totalPublished) * 100, 1) . '%'],
                    ['Stale (Fingerprint Mismatch or Missing File)', $staleCount, round(($staleCount / $totalPublished) * 100, 1) . '%'],
                    ['Missing (No Offer Sheet Record)', $missingCount, round(($missingCount / $totalPublished) * 100, 1) . '%'],
                    ['Pending Reconciliation', $staleCount + $missingCount, round((($staleCount + $missingCount) / $totalPublished) * 100, 1) . '%'],
                ]
            );

            return 0;
        }

        // QUEUE DISPATCH MODE
        if ($queue) {
            $dispatchedCount = 0;
            $skippedCount = 0;

            $bar = $this->output->createProgressBar($totalPublished);
            $bar->start();

            $query->chunkById($chunkSize, function ($products) use ($service, $storageDisk, $force, &$dispatchedCount, &$skippedCount, $bar) {
                foreach ($products as $product) {
                    if (!$force) {
                        $fingerprint = $service->computeFingerprint($product);
                        $sheetRecord = ProductOfferSheet::where('product_id', $product->id)->first();
                        $canonicalPath = "product_offer_sheets/{$product->id}/OFFER_SHEET_{$fingerprint}.pdf";

                        if ($sheetRecord && $sheetRecord->fingerprint === $fingerprint && $sheetRecord->isReady() && $storageDisk->exists($canonicalPath)) {
                            $skippedCount++;
                            $bar->advance();
                            continue;
                        }
                    }

                    GenerateProductOfferSheetJob::dispatch((int) $product->id, $force);
                    $dispatchedCount++;
                    $bar->advance();
                }
                gc_collect_cycles();
            });

            $bar->finish();
            $this->newLine(2);
            $this->info("Queue Dispatch Complete: {$dispatchedCount} jobs queued, {$skippedCount} skipped (already current).");
            return 0;
        }

        // SYNCHRONOUS GENERATION & RECONCILIATION
        $tableRows = [];
        $passCount = 0;
        $failCount = 0;
        $cacheHitCount = 0;
        $generatedCount = 0;

        $bar = $this->output->createProgressBar($totalPublished);
        $bar->start();

        $startTime = microtime(true);

        $query->chunkById($chunkSize, function ($products) use (
            $service, 
            $force, 
            $delayMs, 
            &$passCount, 
            &$failCount, 
            &$cacheHitCount, 
            &$generatedCount, 
            &$tableRows, 
            $bar
        ) {
            foreach ($products as $product) {
                try {
                    $result = $service->getOrGenerate($product, $force);
                    $sizeKb = round($result['filesize'] / 1024, 1);
                    $sizeMb = round($result['filesize'] / 1024 / 1024, 2);

                    if ($result['is_hit']) {
                        $cacheHitCount++;
                        $statusLabel = '<info>CACHE_HIT</info>';
                    } else {
                        $generatedCount++;
                        $statusLabel = '<comment>GENERATED</comment>';
                    }

                    if ($result['filesize'] > ProductOfferSheetService::MAX_SIZE_BYTES) {
                        $statusLabel = '<error>OVERSIZED</error>';
                        $failCount++;
                    } else {
                        $passCount++;
                    }

                    if (count($tableRows) < 50 || $failCount > 0) {
                        $tableRows[] = [
                            $product->id,
                            $product->sku ?: "PROD-{$product->id}",
                            substr($product->name, 0, 28),
                            "{$sizeKb} KB ({$sizeMb} MB)",
                            $statusLabel,
                            "{$result['time_ms']} ms",
                        ];
                    }
                } catch (\Throwable $e) {
                    $failCount++;
                    $tableRows[] = [
                        $product->id,
                        $product->sku ?: "PROD-{$product->id}",
                        substr($product->name, 0, 28),
                        '0 KB',
                        '<error>FAILED</error>',
                        $e->getMessage(),
                    ];
                }

                if ($delayMs > 0) {
                    usleep($delayMs * 1000);
                }

                $bar->advance();
            }

            gc_collect_cycles();
        });

        $bar->finish();
        $this->newLine(2);

        $totalDuration = round(microtime(true) - $startTime, 2);

        if (!empty($tableRows)) {
            $this->table(
                ['ID', 'SKU', 'Name', 'Size', 'Status', 'Duration'],
                array_slice($tableRows, 0, 25)
            );
            if (count($tableRows) > 25) {
                $this->comment('... (table truncated to first 25 entries for display clarity)');
            }
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Published Processed', $totalPublished],
                ['Existing Cache Hits (Instant)', $cacheHitCount],
                ['Newly Generated / Refreshed', $generatedCount],
                ['Successful Total', $passCount],
                ['Failed Total', $failCount],
                ['Total Time', "{$totalDuration} s"],
            ]
        );

        $this->info("Completed: {$passCount} successful, {$failCount} failed in {$totalDuration}s.");

        return $failCount > 0 ? 1 : 0;
    }
}
