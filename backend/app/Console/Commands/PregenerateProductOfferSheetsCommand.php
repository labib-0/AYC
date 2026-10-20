<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Documents\ProductOfferSheetService;
use Illuminate\Console\Command;

class PregenerateProductOfferSheetsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'ayaan:pregenerate-offer-sheets
                            {--product= : Specific product ID or SKU to generate}
                            {--force : Force regeneration even if an artifact is already current}';

    /**
     * The console command description.
     */
    protected $description = 'Pre-generate, compress, validate, and cache product Offer Sheet PDF artifacts.';

    /**
     * Execute the console command.
     */
    public function handle(ProductOfferSheetService $service): int
    {
        $productId = $this->option('product');
        $force = (bool) $this->option('force');

        $query = Product::with(['images', 'brand'])->where('status', 'published');

        if ($productId) {
            $query->where(function ($q) use ($productId) {
                if (is_numeric($productId)) {
                    $q->where('id', (int) $productId);
                } else {
                    $q->where('sku', $productId)->orWhere('slug', $productId);
                }
            });
        }

        $products = $query->get();

        if ($products->isEmpty()) {
            $this->warn('No published products found matching criteria.');
            return 0;
        }

        $this->info("Found {$products->count()} published product(s) to process.");

        $tableRows = [];
        $passCount = 0;
        $failCount = 0;

        $bar = $this->output->createProgressBar($products->count());
        $bar->start();

        foreach ($products as $product) {
            try {
                $result = $service->getOrGenerate($product, $force);
                $sizeKb = round($result['filesize'] / 1024, 1);
                $sizeMb = round($result['filesize'] / 1024 / 1024, 2);

                $statusLabel = $result['is_hit'] ? '<info>CACHE_HIT</info>' : '<comment>GENERATED</comment>';
                if ($result['filesize'] > ProductOfferSheetService::MAX_SIZE_BYTES) {
                    $statusLabel = '<error>OVERSIZED</error>';
                    $failCount++;
                } else {
                    $passCount++;
                }

                $tableRows[] = [
                    $product->id,
                    $product->sku ?: "PROD-{$product->id}",
                    substr($product->name, 0, 30),
                    "{$sizeKb} KB ({$sizeMb} MB)",
                    $statusLabel,
                    "{$result['time_ms']} ms",
                ];
            } catch (\Throwable $e) {
                $failCount++;
                $tableRows[] = [
                    $product->id,
                    $product->sku ?: "PROD-{$product->id}",
                    substr($product->name, 0, 30),
                    '0 KB',
                    '<error>FAILED</error>',
                    $e->getMessage(),
                ];
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(
            ['ID', 'SKU', 'Name', 'Size', 'Status', 'Duration'],
            $tableRows
        );

        $this->info("Completed: {$passCount} successful, {$failCount} failed.");

        return $failCount > 0 ? 1 : 0;
    }
}
