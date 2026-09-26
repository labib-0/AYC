<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class ProductionDatabaseCleanupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:production-cleanup {--force : Force cleanup without interactive prompt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely wipe all demo/business data and preserve strictly 1 Admin + 1 Customer accounts';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('===============================================================');
        $this->info('  AYAAN CLOTHING — FINAL PRODUCTION DATABASE CLEANUP');
        $this->info('===============================================================');

        if (!$this->option('force') && !$this->confirm('This will permanently delete all demo products, categories, brands, orders, RFQs, quotes, promotions, coupons, and demo accounts. Continue?')) {
            $this->warn('Cleanup aborted by user.');
            return self::SUCCESS;
        }

        $tablesToClean = [
            'personal_access_tokens',
            'activities',
            'notifications',
            'cart_items',
            'carts',
            'wishlist_items',
            'wishlists',
            'rfq_messages',
            'quotation_items',
            'quotations',
            'quote_items',
            'quotes',
            'order_status_events',
            'order_items',
            'payments',
            'orders',
            'admin_inventory_adjustments',
            'inventories',
            'product_package_allocations',
            'product_pricing_tiers',
            'product_shipping_package_profiles',
            'product_images',
            'category_product',
            'homepage_featured_products',
            'homepage_hot_sale_categories',
            'homepage_banners',
            'product_variants',
            'products',
            'categories',
            'brands',
            'coupons',
            'addresses',
        ];

        // 1. Snapshot initial row counts
        $beforeCounts = [];
        foreach ($tablesToClean as $table) {
            if (Schema::hasTable($table)) {
                $beforeCounts[$table] = DB::table($table)->count();
            }
        }
        $beforeCounts['users'] = DB::table('users')->count();

        $this->info('Executing transactional data purge across all demo tables...');

        DB::transaction(function () use ($tablesToClean) {
            // Delete dependent records in strict foreign-key order
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

            // Clean demo warehouses (preserve only the single active Uttara facility)
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
                $this->line(" [✓] Preserved single production warehouse: WH-UTTARA-01 (Uttara Warehouse)");
            }

            // Remove all users EXCEPT the 2 target production demo accounts
            $targetEmails = [
                'admin@ayaan-demo.local',
                'customer@ayaan-demo.local',
            ];

            $deletedUsers = DB::table('users')
                ->whereNotIn('email', $targetEmails)
                ->delete();
            $this->line(" [✓] Removed {$deletedUsers} non-essential user accounts");

            // Provision/ensure Admin account
            User::withTrashed()->updateOrCreate(
                ['email' => 'admin@ayaan-demo.local'],
                [
                    'name' => 'Ayaan Demo Admin',
                    'password' => Hash::make('Admin@12345'),
                    'role' => User::ROLE_ADMIN,
                    'phone' => '+880 1826-304930',
                    'company_name' => 'Ayaan Sourcing Ltd.',
                    'email_verified_at' => now(),
                    'is_demo' => true,
                    'deleted_at' => null,
                ]
            );
            $this->line(" [✓] Provisioned Admin: admin@ayaan-demo.local (Password: Admin@12345, Role: admin)");

            // Provision/ensure Customer account (with full B2B capability)
            User::withTrashed()->updateOrCreate(
                ['email' => 'customer@ayaan-demo.local'],
                [
                    'name' => 'Demo Customer',
                    'password' => Hash::make('Customer@12345'),
                    'role' => User::ROLE_CUSTOMER,
                    'phone' => '+880 1826-304930',
                    'company_name' => 'Ayaan Commercial Demo Corp',
                    'tax_id' => 'US-DEMO-99901',
                    'b2b_approval_status' => 'approved',
                    'b2b_payment_terms' => 'net_30',
                    'email_verified_at' => now(),
                    'is_demo' => true,
                    'deleted_at' => null,
                ]
            );
            $this->line(" [✓] Provisioned Customer: customer@ayaan-demo.local (Password: Customer@12345, Role: customer)");
        });

        // Clear application cache to prevent stale catalog/brand/category data
        \Illuminate\Support\Facades\Cache::flush();
        $this->line(" [✓] Flushed application cache");

        // 2. Clean storage demo upload directories
        $this->cleanDemoStorage();

        // 3. Post-cleanup verification
        $this->info('');
        $this->info('===============================================================');
        $this->info('  POST-CLEANUP VERIFICATION AUDIT');
        $this->info('===============================================================');

        $headers = ['Table / Metric', 'Before Cleanup', 'After Cleanup', 'Target Clean State', 'Status'];
        $rows = [];

        $targets = [
            'users' => 2,
            'products' => 0,
            'brands' => 0,
            'categories' => 0,
            'orders' => 0,
            'order_items' => 0,
            'quotes' => 0,
            'quotations' => 0,
            'coupons' => 0,
            'inventories' => 0,
            'payments' => 0,
            'homepage_banners' => 0,
            'homepage_featured_products' => 0,
            'homepage_hot_sale_categories' => 0,
            'cart_items' => 0,
            'wishlist_items' => 0,
            'addresses' => 0,
        ];

        $allPassed = true;
        foreach ($targets as $tbl => $targetVal) {
            $after = Schema::hasTable($tbl) ? DB::table($tbl)->count() : 0;
            $before = $beforeCounts[$tbl] ?? '-';
            $passed = ($after === $targetVal);
            if (!$passed) {
                $allPassed = false;
            }
            $rows[] = [
                $tbl,
                $before,
                $after,
                $targetVal,
                $passed ? 'PASS' : 'FAIL',
            ];
        }

        $this->table($headers, $rows);

        // 4. Verify user credentials
        $admin = User::where('email', 'admin@ayaan-demo.local')->first();
        $adminAuthPass = $admin && Hash::check('Admin@12345', $admin->password) && $admin->role === 'admin';

        $customer = User::where('email', 'customer@ayaan-demo.local')->first();
        $customerAuthPass = $customer && Hash::check('Customer@12345', $customer->password) && $customer->role === 'customer';

        $this->info("Admin Authentication Verification: " . ($adminAuthPass ? 'PASS' : 'FAIL'));
        $this->info("Customer Authentication Verification: " . ($customerAuthPass ? 'PASS' : 'FAIL'));

        if (!$allPassed || !$adminAuthPass || !$customerAuthPass) {
            $this->error('CRITICAL: One or more database verification assertions failed.');
            return self::FAILURE;
        }

        $this->info('');
        $this->info('SUCCESS: Database successfully purged. Strictly 2 users retained. All business data = 0.');
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
                $this->line(" [✓] Removed {$removed} demo upload files from: " . basename($path));
            }
        }
    }
}
