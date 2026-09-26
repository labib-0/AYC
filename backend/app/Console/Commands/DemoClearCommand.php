<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DemoClearCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'demo:clear {--force : Force the operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely remove only development/demo records from PostgreSQL (refused in production)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('CRITICAL: The demo:clear command cannot be executed in a production environment.');
            return self::FAILURE;
        }

        if (!$this->option('force') && !$this->confirm('Are you sure you want to remove all development demo records? Real customer data will NOT be touched.')) {
            $this->info('Operation cancelled.');
            return self::SUCCESS;
        }

        $this->info('Safely purging development demo data...');

        DB::transaction(function () {
            // 1. Delete Demo Quotations
            $deletedQuotations = Quotation::where('is_demo', true)
                ->orWhere('quotation_number', 'like', 'QT-DEMO-%')
                ->delete();
            $this->line(" - Removed {$deletedQuotations} demo quotations.");

            // 2. Delete Demo RFQs (messages & items cascade automatically via FK)
            $deletedRfqs = Quote::where('is_demo', true)
                ->orWhere('rfq_number', 'like', 'RFQ-DEMO-%')
                ->delete();
            $this->line(" - Removed {$deletedRfqs} demo RFQs.");

            // 3. Delete Demo Orders (order items & events cascade via FK)
            $deletedOrders = Order::withTrashed()
                ->where('is_demo', true)
                ->orWhere('order_number', 'like', 'ORD-DEMO-%')
                ->forceDelete();
            $this->line(" - Removed {$deletedOrders} demo orders.");

            // 4. Delete Demo Products (variants, images, inventories cascade)
            $deletedProducts = Product::withTrashed()
                ->where('is_demo', true)
                ->orWhere('sku', 'like', 'AYN-DEMO-%')
                ->forceDelete();
            $this->line(" - Removed {$deletedProducts} demo products.");

            // 5. Delete Demo Users (excluding any non-demo users)
            $deletedUsers = User::withTrashed()
                ->where('is_demo', true)
                ->orWhere('email', 'like', '%@ayaan-demo.local')
                ->forceDelete();
            $this->line(" - Removed {$deletedUsers} demo users.");

            // 6. Delete Demo Coupons
            \App\Models\Coupon::whereIn('code', ['WELCOME10', 'BULK50', 'EXPIRED25', 'FUTURE15'])->delete();
            $this->line(" - Removed demo coupons.");
        });

        $this->info('Demo data cleanup complete. All production and non-demo records remain intact.');
        return self::SUCCESS;
    }
}
