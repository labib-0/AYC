<?php

namespace App\Console\Commands;

use App\Services\Security\GeoIpDatabaseManager;
use Illuminate\Console\Command;

class GeoIpStatusCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'geoip:status {--json : Output status diagnostic as raw JSON}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Inspect the status, health, metadata, and version of the local MaxMind GeoIP database';

    /**
     * Execute the console command.
     */
    public function handle(GeoIpDatabaseManager $manager): int
    {
        $status = $manager->getStatus();

        if ($this->option('json')) {
            $this->line(json_encode($status, JSON_PRETTY_PRINT));
            return Command::SUCCESS;
        }

        $this->newLine();
        $this->info('====================================================');
        $this->info('       MAXMIND GEOIP DATABASE DIAGNOSTIC STATUS    ');
        $this->info('====================================================');

        $healthColor = match ($status['health_status']) {
            'HEALTHY' => 'info',
            'OUTDATED' => 'comment',
            default => 'error',
        };

        $this->table(
            ['Property', 'Status / Value'],
            [
                ['Health Status', "<$healthColor>{$status['health_status']}</$healthColor>"],
                ['Database Exists', $status['database_exists'] ? '<info>YES</info>' : '<error>NO</error>'],
                ['Database Valid', $status['is_valid'] ? '<info>YES</info>' : '<error>NO</error>'],
                ['File Path', $status['database_path']],
                ['File Size', "{$status['file_size_human']} ({$status['file_size_bytes']} bytes)"],
                ['File Modified', $status['file_modified_at'] ?? 'N/A'],
                ['Database Type', $status['metadata']['database_type'] ?? 'N/A'],
                ['Build Date', $status['metadata']['build_date'] ?? 'N/A'],
                ['Supported IP', $status['metadata']['ip_version'] ?? 'N/A'],
                ['Node Count', isset($status['metadata']['node_count']) ? number_format($status['metadata']['node_count']) : 'N/A'],
                ['License Key', $status['license_key_configured'] ? '<info>Configured in Environment (Hidden)</info>' : '<comment>Not Configured</comment>'],
                ['Last Success', $status['last_successful_update'] ?? 'None recorded'],
                ['Last Attempt', $status['last_attempt_at'] ?? 'None recorded'],
                ['Last Error', $status['last_error'] ? "<error>{$status['last_error']}</error>" : 'None'],
                ['Last Error Time', $status['last_error_at'] ?? 'N/A'],
            ]
        );

        $this->newLine();

        return $status['is_valid'] ? Command::SUCCESS : Command::FAILURE;
    }
}
