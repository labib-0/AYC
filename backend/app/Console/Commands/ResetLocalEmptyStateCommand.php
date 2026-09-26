<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class ResetLocalEmptyStateCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:reset-empty-state {--force : Force reset without interactive confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely purge all local business data and user accounts for a completely blank Ayaan Clothing installation';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('CRITICAL: The app:reset-empty-state command cannot and will not be executed in a production environment.');
            return self::FAILURE;
        }

        $this->info('===============================================================');
        $this->info('  AYAAN CLOTHING — LOCAL FULL DATABASE & STORAGE PURGE');
        $this->info('===============================================================');
        $this->warn('This operation will permanently delete ALL local users, products,');
        $this->warn('categories, brands, orders, RFQs, quotations, inventory, coupons,');
        $this->warn('and merchandising data, leaving an empty, pristine installation.');
        $this->info('');

        if (!$this->option('force') && !$this->confirm('Are you sure you want to completely wipe all local business records and user accounts?')) {
            $this->warn('Operation aborted by user.');
            return self::SUCCESS;
        }

        $tablesToClean = [
            'personal_access_tokens',
            'sessions',
            'admin_roles',
            'activities',
            'notifications',
            'cart_items',
            'carts',
            'wishlist_items',
            'wishlists',
            'order_status_events',
            'order_items',
            'payments',
            'orders',
            'addresses',
            'rfq_messages',
            'quotation_items',
            'quotations',
            'quote_items',
            'quotes',
            'admin_inventory_adjustments',
            'inventories',
            'product_package_allocations',
            'product_pricing_tiers',
            'product_shipping_package_profiles',
            'product_images',
            'category_product',
            'homepage_featured_products',
            'homepage_hot_sale_categories',
            'homepage_featured_brands',
            'homepage_banners',
            'product_variants',
            'products',
            'categories',
            'brands',
            'coupons',
            'users',
        ];

        // 1. Snapshot initial row counts
        $beforeCounts = [];
        foreach ($tablesToClean as $table) {
            if (Schema::hasTable($table)) {
                $beforeCounts[$table] = DB::table($table)->count();
            }
        }

        $this->info('Purging local database tables in strict foreign-key order...');

        DB::transaction(function () use ($tablesToClean) {
            // Nullify self-referencing foreign keys on roles before user deletion
            if (Schema::hasTable('roles')) {
                DB::table('roles')->update([
                    'created_by' => null,
                    'updated_by' => null,
                ]);
            }

            foreach ($tablesToClean as $table) {
                if (Schema::hasTable($table)) {
                    if ($table === 'categories') {
                        // Nullify self-referencing parent_id before deletion
                        DB::table('categories')->update(['parent_id' => null]);
                    }

                    $deleted = DB::table($table)->delete();
                    $this->line(" [✓] Purged {$deleted} records from `{$table}`");
                }
            }

            // Ensure canonical warehouse facility exists with 0 inventories
            if (Schema::hasTable('warehouses')) {
                DB::table('warehouses')->where('code', '!=', 'WH-UTTARA-01')->delete();
                DB::table('warehouses')->updateOrInsert(
                    ['code' => 'WH-UTTARA-01'],
                    [
                        'name' => 'Uttara Warehouse',
                        'address_line_1' => 'House #33 (2nd floor), Road #12, Sector #11, Uttara',
                        'city' => 'Dhaka',
                        'country_code' => 'BD',
                        'is_active' => true,
                    ]
                );
                $this->line(" [✓] Canonical warehouse configuration preserved: WH-UTTARA-01 (0 inventory records)");
            }
        });

        // 2. Clear Redis / Application Cache
        Cache::flush();
        $this->line(" [✓] Flushed local application and Redis cache (namespace: ayaan_cache_)");

        // 3. Clean Demo Uploads in Storage
        $this->cleanDemoStorage();

        // 4. Post-purge verification
        $this->info('');
        $this->info('===============================================================');
        $this->info('  POST-RESET VERIFICATION AUDIT');
        $this->info('===============================================================');

        $headers = ['Table / Metric', 'Before Reset', 'After Reset', 'Target Clean State', 'Status'];
        $rows = [];
        $allPassed = true;

        foreach ($tablesToClean as $tbl) {
            $after = Schema::hasTable($tbl) ? DB::table($tbl)->count() : 0;
            $before = $beforeCounts[$tbl] ?? '-';
            $passed = ($after === 0);
            if (!$passed) {
                $allPassed = false;
            }
            $rows[] = [
                $tbl,
                $before,
                $after,
                0,
                $passed ? 'PASS' : 'FAIL',
            ];
        }

        $this->table($headers, $rows);

        // Verify preserved system structures
        $this->info('');
        $this->info('Preserved System Reference Records:');
        $sysHeaders = ['System Resource', 'Count', 'Required Status'];
        $sysRows = [
            ['permissions (System RBAC catalog)', Schema::hasTable('permissions') ? DB::table('permissions')->count() : 0, '139 (Preserved)'],
            ['permission_dependencies (Graph rules)', Schema::hasTable('permission_dependencies') ? DB::table('permission_dependencies')->count() : 0, '174 (Preserved)'],
            ['roles (System role templates)', Schema::hasTable('roles') ? DB::table('roles')->count() : 0, '12 (Preserved)'],
            ['role_permissions (Default mappings)', Schema::hasTable('role_permissions') ? DB::table('role_permissions')->count() : 0, '122 (Preserved)'],
            ['system_settings (Platform configuration)', Schema::hasTable('system_settings') ? DB::table('system_settings')->count() : 0, '2 (Preserved)'],
            ['warehouses (Canonical facility configuration)', Schema::hasTable('warehouses') ? DB::table('warehouses')->count() : 0, '1 (Preserved)'],
        ];
        $this->table($sysHeaders, $sysRows);

        if (!$allPassed) {
            $this->error('CRITICAL: One or more database verification assertions failed.');
            return self::FAILURE;
        }

        $this->info('');
        $this->info('SUCCESS: Local Ayaan Clothing environment reset to a completely clean state.');
        $this->info('Database contains 0 business records and 0 users.');
        $this->info('Use `php artisan app:create-admin --super-admin` to provision your first administrator.');

        return self::SUCCESS;
    }

    /**
     * Clean demo uploads from Laravel storage while preserving directory structure and .gitignore files.
     */
    protected function cleanDemoStorage(): void
    {
        $storagePaths = [
            storage_path('app/public/products'),
            storage_path('app/public/banners'),
            storage_path('app/public/receipts'),
            storage_path('app/public/brands'),
            storage_path('app/public/documents'),
        ];

        foreach ($storagePaths as $path) {
            if (File::isDirectory($path)) {
                $files = File::files($path);
                $removed = 0;
                foreach ($files as $file) {
                    if ($file->getFilename() !== '.gitignore') {
                        File::delete($file->getPathname());
                        $removed++;
                    }
                }
                $this->line(" [✓] Removed {$removed} demo files from storage: " . basename($path));
            } else {
                File::makeDirectory($path, 0755, true, true);
            }
        }
    }
}
