<?php

namespace App\Console\Commands;

use App\Models\CmsPage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncScheduledCmsPagesCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'pages:sync-scheduled';

    /**
     * The console command description.
     */
    protected $description = 'Evaluate and execute scheduled publication and expiration for CMS storefront pages.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();
        $publishedCount = 0;
        $unpublishedCount = 0;

        // 1. Promote scheduled drafts whose publish time has arrived
        $toPublish = CmsPage::where('status', CmsPage::STATUS_DRAFT)
            ->whereNotNull('scheduled_publish_at')
            ->where('scheduled_publish_at', '<=', $now)
            ->get();

        foreach ($toPublish as $page) {
            $page->publishDraft();
            $publishedCount++;
            Log::info("SyncScheduledCmsPagesCommand: Successfully published scheduled CMS page #{$page->id} ('{$page->slug}')", [
                'scheduled_publish_at' => $page->scheduled_publish_at?->toIso8601String(),
                'published_at' => $page->published_at?->toIso8601String(),
            ]);
        }

        // 2. Unpublish active pages whose expiration time has arrived
        $toUnpublish = CmsPage::where('status', CmsPage::STATUS_PUBLISHED)
            ->whereNotNull('scheduled_unpublish_at')
            ->where('scheduled_unpublish_at', '<=', $now)
            ->get();

        foreach ($toUnpublish as $page) {
            $page->unpublish();
            $unpublishedCount++;
            Log::info("SyncScheduledCmsPagesCommand: Successfully unpublished expired CMS page #{$page->id} ('{$page->slug}')", [
                'scheduled_unpublish_at' => $page->scheduled_unpublish_at?->toIso8601String(),
            ]);
        }

        if ($publishedCount > 0 || $unpublishedCount > 0) {
            $this->info("CMS Scheduling Sync: Published {$publishedCount} page(s), unpublished {$unpublishedCount} page(s).");
        } else {
            $this->line("CMS Scheduling Sync: No scheduled transitions required at {$now->toIso8601String()}.");
        }

        return 0;
    }
}
