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
    protected $description = 'Clean up abandoned intermediate temporary files, expired PDF artifacts, and cached image derivatives';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $disk = Storage::disk('local');
        $deleted = 0;

        // 1. Clean temp directory (older than 24h)
        if ($disk->exists('temp')) {
            $cutoff = now()->subHours(24)->timestamp;
            foreach ($disk->allFiles('temp') as $file) {
                if ($disk->lastModified($file) < $cutoff) {
                    $disk->delete($file);
                    $deleted++;
                }
            }
        }

        // 2. Clean documents_cache (older than 7 days)
        if ($disk->exists('documents_cache')) {
            $docCutoff = now()->subDays(7)->timestamp;
            foreach ($disk->allFiles('documents_cache') as $file) {
                if ($disk->lastModified($file) < $docCutoff) {
                    $disk->delete($file);
                    $deleted++;
                }
            }
        }

        // 3. Clean pdf_cache image derivatives (older than 14 days)
        if ($disk->exists('pdf_cache')) {
            $imgCutoff = now()->subDays(14)->timestamp;
            foreach ($disk->allFiles('pdf_cache') as $file) {
                if ($disk->lastModified($file) < $imgCutoff) {
                    $disk->delete($file);
                    $deleted++;
                }
            }
        }

        $this->info("Cleaned up {$deleted} temporary/cached file(s).");
        return Command::SUCCESS;
    }
}
