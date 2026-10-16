<?php

namespace App\Console\Commands;

use App\Models\HomepageFeaturedProduct;
use App\Models\Product;
use App\Models\SystemSetting;
use App\Services\Audit\ActivityLogger;
use App\Services\Cache\CatalogCacheService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class InitializePinnedProductsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'catalog:initialize-pinned-products
                            {--force : Force re-initialization even if marker already exists}
                            {--dry-run : Simulate the selection and changes without modifying the database}
                            {--status : Show the current initialization marker and pinned products}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'One-time, idempotent reset of obsolete featured selection and initialization of five pinned products';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isInitialized = (bool) SystemSetting::get('pinned_products_initialized', false);
        $initializedAt = SystemSetting::get('pinned_products_initialized_at');
        $storedIds = SystemSetting::get('initial_pinned_product_ids', []);

        // ── 1. Status Check ──────────────────────────────────────────────────
        if ($this->option('status')) {
            $this->info("==================================================");
            $this->info("  PINNED PRODUCTS INITIALIZATION STATUS");
            $this->info("==================================================");
            $this->line("Initialized Marker: " . ($isInitialized ? 'TRUE' : 'FALSE'));
            $this->line("Initialized At:     " . ($initializedAt ?: 'N/A'));
            $this->line("Stored Product IDs: " . (!empty($storedIds) ? json_encode($storedIds) : 'None'));

            $currentPinned = Product::query()
                ->where(function ($q) {
                    $q->where('is_pinned', true)->orWhere('is_featured', true);
                })
                ->whereNull('deleted_at')
                ->orderBy('pinned_order', 'asc')
                ->orderBy('featured_sort_order', 'asc')
                ->get(['id', 'name', 'sku', 'is_pinned', 'is_featured', 'pinned_order', 'featured_sort_order', 'status']);

            $this->info("\nCurrently Pinned Products in Database (" . $currentPinned->count() . "):");
            if ($currentPinned->isEmpty()) {
                $this->line("  (No products currently marked as pinned)");
            } else {
                foreach ($currentPinned as $p) {
                    $this->line(sprintf(
                        "  - [%d] %s (SKU: %s | Status: %s | PinnedOrder: %d)",
                        $p->id,
                        $p->name,
                        $p->sku ?: '—',
                        $p->status,
                        $p->pinned_order ?: $p->featured_sort_order
                    ));
                }
            }
            return 0;
        }

        // ── 2. Idempotency Guard ─────────────────────────────────────────────
        if ($isInitialized && !$this->option('force')) {
            $this->info("✔ [IDEMPOTENT] Pinned products were already initialized on: " . ($initializedAt ?: 'earlier release'));
            $this->line("Stored Initial Pinned Product IDs: " . json_encode($storedIds));
            $this->line("Initialization is idempotent and will not re-randomize pinned products. Use --force to override.");
            return 0;
        }

        $this->info("==================================================");
        $this->info("  AYAAN CLOTHING — PINNED PRODUCTS INITIALIZATION");
        $this->info("==================================================");

        // ── 3. Find Eligible Storefront Products ─────────────────────────────
        $eligibleQuery = Product::query()
            ->storefrontVisible()
            ->whereNull('deleted_at');

        $totalEligible = $eligibleQuery->count();
        $this->info("Found {$totalEligible} storefront-visible, non-deleted eligible products.");

        if ($totalEligible === 0) {
            $this->warn("⚠ No eligible storefront products found in database. Cannot initialize.");
            return 1;
        }

        // Deterministic or random selection of exactly 5 products (or all if < 5)
        $targetCount = min(5, $totalEligible);
        
        // Random selection using database order
        $selectedProducts = (clone $eligibleQuery)
            ->inRandomOrder()
            ->limit($targetCount)
            ->get();

        $selectedIds = $selectedProducts->pluck('id')->all();

        $this->info("\nSelected {$targetCount} products for initial pinning:");
        foreach ($selectedProducts as $idx => $p) {
            $this->line(sprintf("  %d. [ID: %d] %s (SKU: %s)", $idx + 1, $p->id, $p->name, $p->sku ?: '—'));
        }

        if ($this->option('dry-run')) {
            $this->warn("\n[DRY RUN] No database modifications were written.");
            return 0;
        }

        // ── 4. Atomic Transaction: Reset Obsolete State & Persist New Pin Group
        DB::transaction(function () use ($selectedProducts, $selectedIds) {
            // 4.1 Clear obsolete homepage_featured_products entries
            HomepageFeaturedProduct::query()->delete();

            // 4.2 Reset is_pinned and is_featured on ALL products
            // CRUCIAL: promotional tags (is_hot, is_new, is_sold_out, prices, stocks) are NOT touched!
            Product::query()->update([
                'is_pinned' => false,
                'is_featured' => false,
                'pinned_order' => 0,
                'featured_sort_order' => 0,
            ]);

            // 4.3 Pin exactly the selected products with deterministic sequential ordering (1..N)
            foreach ($selectedProducts as $idx => $product) {
                $order = $idx + 1;

                Product::where('id', $product->id)->update([
                    'is_pinned' => true,
                    'is_featured' => true,
                    'pinned_order' => $order,
                    'featured_sort_order' => $order,
                    'sort_order' => $order,
                ]);

                HomepageFeaturedProduct::create([
                    'product_id' => $product->id,
                    'sort_order' => $order,
                    'is_active' => true,
                ]);
            }

            // 4.4 Set initial sort_order for remaining unpinned products so they follow pinned group
            $unpinnedProducts = Product::query()
                ->whereNotIn('id', $selectedIds)
                ->whereNull('deleted_at')
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc')
                ->get(['id']);

            $startUnpinnedOrder = count($selectedIds) + 1;
            foreach ($unpinnedProducts as $idx => $up) {
                Product::where('id', $up->id)->update([
                    'sort_order' => $startUnpinnedOrder + $idx,
                ]);
            }

            // 4.5 Record the persistent marker in SystemSetting
            SystemSetting::set('pinned_products_initialized', true, 'boolean', 'catalog');
            SystemSetting::set('initial_pinned_product_ids', $selectedIds, 'json', 'catalog');
            SystemSetting::set('pinned_products_initialized_at', now()->toIso8601String(), 'string', 'catalog');

            // 4.6 Invalidate caches
            CatalogCacheService::invalidateAll();
            CatalogCacheService::bumpFeaturedVersion();

            ActivityLogger::log('pinned_products.initialized', null, [
                'pinned_count' => count($selectedIds),
                'pinned_ids' => $selectedIds,
            ]);
        });

        $this->info("\n✔ [SUCCESS] Successfully initialized {$targetCount} pinned products!");
        $this->line("Marker stored in system_settings (key: pinned_products_initialized).");
        $this->line("Caches invalidated and bumped featured version.");

        return 0;
    }
}
