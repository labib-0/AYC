<?php

namespace App\Console\Commands;

use Database\Seeders\DevelopmentDemoSeeder;
use Illuminate\Console\Command;

class DemoSeedCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'demo:seed';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed realistic development/demo data directly into PostgreSQL (refused in production)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('CRITICAL: The demo:seed command cannot be executed in a production environment.');
            return self::FAILURE;
        }

        $this->info('Starting controlled backend demo data seeding...');

        $seeder = new DevelopmentDemoSeeder();
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}
