<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupTemporaryFilesCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'temp-files:cleanup';

    /**
     * The console command description.
     */
    protected $description = 'Clean up abandoned intermediate temporary files older than 24 hours';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $disk = Storage::disk('local');
        $tempPath = 'temp';

        if (!$disk->exists($tempPath)) {
            $this->info("No temporary directory found, nothing to clean.");
            return Command::SUCCESS;
        }

        $files = $disk->allFiles($tempPath);
        $deleted = 0;
        $cutoff = now()->subHours(24)->timestamp;

        foreach ($files as $file) {
            if ($disk->lastModified($file) < $cutoff) {
                $disk->delete($file);
                $deleted++;
            }
        }

        $this->info("Cleaned up {$deleted} temporary file(s).");
        return Command::SUCCESS;
    }
}
