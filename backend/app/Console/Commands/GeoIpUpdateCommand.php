<?php

namespace App\Console\Commands;

use App\Services\Security\GeoIpDatabaseManager;
use Illuminate\Console\Command;

class GeoIpUpdateCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'geoip:update 
                            {--force : Force update execution}
                            {--license-key= : Explicit license key (defaults to environment)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely download, validate, and atomically replace the MaxMind GeoIP database with rollback protection';

    /**
     * Execute the console command.
     */
    public function handle(GeoIpDatabaseManager $manager): int
    {
        $this->info('Starting automated MaxMind GeoIP database update...');

        $licenseKey = $this->option('license-key');
        $result = $manager->updateDatabase($licenseKey);

        if ($result['success']) {
            $this->info('✅ ' . $result['message']);
            return Command::SUCCESS;
        }

        $this->error('❌ ' . $result['message']);
        return Command::FAILURE;
    }
}
