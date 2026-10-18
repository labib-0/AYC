<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class OptimizeMediaStorageCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'media:optimize
                            {--dry-run : Report potential changes and savings without modifying files or database}
                            {--skip-oversized : Skip resizing oversized WebP images}
                            {--skip-dedup : Skip deduplicating exact identical files}
                            {--skip-orphans : Skip archiving and deleting orphaned files}
                            {--skip-conversion : Skip converting JPG/PNG to WebP}
                            {--clean-non-image : Safely prune media backups older than 7 days and remove obsolete .next.bak-incident}
                            {--max-long-edge=1920 : Maximum long edge dimension in pixels}
                            {--quality=82 : Target WebP quality for photographic images}
                            {--manifest= : Path to write the JSON manifest}';

    /**
     * The console command description.
     */
    protected $description = 'Safely optimize, convert, deduplicate, and clean media storage with manifest tracking and DB reference updates';

    private string $storageRoot;
    private string $backupDir;
    private array $manifest = [
        'started_at' => null,
        'completed_at' => null,
        'dry_run' => false,
        'converted_assets' => [],
        'optimized_webp_assets' => [],
        'deduplicated_assets' => [],
        'orphaned_assets' => [],
        'errors' => [],
        'summary' => [
            'original_total_bytes' => 0,
            'final_total_bytes' => 0,
            'net_bytes_reclaimed' => 0,
            'converted_count' => 0,
            'optimized_webp_count' => 0,
            'dedup_count' => 0,
            'orphans_reclaimed_count' => 0,
        ]
    ];

    public function handle(): int
    {
        $this->manifest['started_at'] = now()->toIso8601String();
        $isDryRun = (bool) $this->option('dry-run');
        $this->manifest['dry_run'] = $isDryRun;

        $this->storageRoot = rtrim(config('filesystems.disks.public.root', storage_path('app/public')), '/');
        $this->backupDir = '/var/backups/ayaan/media';
        if (!is_dir($this->backupDir)) {
            @mkdir($this->backupDir, 0755, true);
        }

        $this->info("===================================================================");
        $this->info("   AYAAN CLOTHING — Media Storage Audit & Safe Optimization");
        $this->info("   Storage Root: {$this->storageRoot}");
        $this->info("   Mode: " . ($isDryRun ? "DRY-RUN (Read-Only Preview)" : "ACTIVE EXECUTION"));
        $this->info("===================================================================");

        if (!is_dir($this->storageRoot)) {
            $this->error("Storage root directory does not exist: {$this->storageRoot}");
            return Command::FAILURE;
        }

        if (!function_exists('imagewebp')) {
            $this->error("WebP GD support is not available in this PHP runtime.");
            return Command::FAILURE;
        }

        $initialDiskBytes = $this->calculateDirectoryBytes($this->storageRoot);
        $this->manifest['summary']['original_total_bytes'] = $initialDiskBytes;
        $this->info("Initial Live Media Storage: " . $this->formatBytes($initialDiskBytes));

        // ── Phase A: Convert Non-WebP Assets Referenced in DB ─────────────
        if (!$this->option('skip-conversion')) {
            $this->info("\n--- Phase A: Converting Non-WebP (JPG/PNG) Assets to WebP ---");
            $this->convertNonWebpAssets($isDryRun);
        }

        // ── Phase B: Optimize Oversized WebP Images ───────────────────────
        if (!$this->option('skip-oversized')) {
            $this->info("\n--- Phase B: Constraining & Optimizing Oversized WebP Images ---");
            $this->optimizeOversizedWebp($isDryRun);
        }

        // ── Phase C: Deduplicate Exact Identical Files ───────────────────
        if (!$this->option('skip-dedup')) {
            $this->info("\n--- Phase C: Merging Exact Identical Files (SHA-256) ---");
            $this->deduplicateExactFiles($isDryRun);
        }

        // ── Phase D: Archive & Reclaim Orphaned Files ─────────────────────
        if (!$this->option('skip-orphans')) {
            $this->info("\n--- Phase D: Archiving and Reclaiming Unreferenced Orphaned Media ---");
            $this->archiveAndReclaimOrphans($isDryRun);
        }

        $finalDiskBytes = $this->calculateDirectoryBytes($this->storageRoot);
        $this->manifest['summary']['final_total_bytes'] = $finalDiskBytes;
        $netReclaimed = $initialDiskBytes - $finalDiskBytes;
        $this->manifest['summary']['net_bytes_reclaimed'] = $netReclaimed;
        $this->manifest['completed_at'] = now()->toIso8601String();

        $this->info("\n===================================================================");
        $this->info("                      OPTIMIZATION SUMMARY");
        $this->info("===================================================================");
        $this->info("Initial Live Media:      " . $this->formatBytes($initialDiskBytes));
        $this->info("Final Live Media:        " . $this->formatBytes($finalDiskBytes));
        $this->info("Net Storage Reclaimed:   " . $this->formatBytes(max(0, $netReclaimed)));
        $this->info("Converted Images:        " . $this->manifest['summary']['converted_count']);
        $this->info("Optimized WebP Images:   " . $this->manifest['summary']['optimized_webp_count']);
        $this->info("Deduplicated Files:      " . $this->manifest['summary']['dedup_count']);
        $this->info("Orphans Archived/Purged: " . $this->manifest['summary']['orphans_reclaimed_count']);

        // ── Phase E: Non-Image Storage Cleanup (Safe Pruning) ────────────
        if ($this->option('clean-non-image')) {
            $this->info("\n--- Phase E: Safe Non-Image Storage Cleanup ---");
            $this->cleanIncidentBak($isDryRun);
            $this->pruneOldMediaBackups($isDryRun, 7);
        }

        // Write Manifest
        $manifestPath = $this->option('manifest') ?: "/var/backups/ayaan/manifests/image_optimization_manifest_" . date('Ymd_His') . ".json";
        $manifestDir = dirname($manifestPath);
        if (!is_dir($manifestDir)) {
            @mkdir($manifestDir, 0755, true);
        }
        file_put_contents($manifestPath, json_encode($this->manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->info("Manifest written to: {$manifestPath}");

        return Command::SUCCESS;
    }

    /**
     * Convert JPG, JPEG, and PNG files to WebP.
     */
    private function convertNonWebpAssets(bool $isDryRun): void
    {
        $tables = [
            ['table' => 'product_images', 'id_col' => 'id', 'url_col' => 'image_url'],
            ['table' => 'brands', 'id_col' => 'id', 'url_col' => 'logo_url'],
            ['table' => 'categories', 'id_col' => 'id', 'url_col' => 'image_url'],
            ['table' => 'homepage_banners', 'id_col' => 'id', 'url_col' => 'image_url'],
            ['table' => 'order_items', 'id_col' => 'id', 'url_col' => 'product_image_url'],
        ];

        $convertedCount = 0;
        $maxLongEdge = (int) $this->option('max-long-edge');
        $targetQuality = (int) $this->option('quality');

        foreach ($tables as $t) {
            $table = $t['table'];
            $idCol = $t['id_col'];
            $urlCol = $t['url_col'];

            $rows = DB::table($table)
                ->whereNotNull($urlCol)
                ->where(function ($q) use ($urlCol) {
                    $q->where($urlCol, 'ilike', '%.jpg')
                      ->orWhere($urlCol, 'ilike', '%.jpeg')
                      ->orWhere($urlCol, 'ilike', '%.png');
                })
                ->select([$idCol, $urlCol])
                ->get();

            if ($rows->isEmpty()) {
                continue;
            }

            $this->info("Processing table '{$table}' ({$rows->count()} non-WebP references)...");

            foreach ($rows as $row) {
                $rawUrl = (string) $row->{$urlCol};
                $rowId = $row->{$idCol};

                $relPath = $this->extractRelativePath($rawUrl);
                if (!$relPath) {
                    continue;
                }

                $targetRelPath = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $relPath);
                $targetPath = $this->storageRoot . '/' . $targetRelPath;
                $targetUrl = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $rawUrl);
                $sourcePath = $this->storageRoot . '/' . $relPath;

                // If source file is already gone but target WebP exists, just update DB reference
                if (!file_exists($sourcePath)) {
                    if (file_exists($targetPath)) {
                        if (!$isDryRun) {
                            DB::transaction(function () use ($table, $idCol, $urlCol, $rowId, $rawUrl, $targetUrl) {
                                DB::table($table)
                                    ->where($idCol, $rowId)
                                    ->where($urlCol, $rawUrl)
                                    ->update([$urlCol => $targetUrl]);
                            });
                        }
                        $this->line("  ✔ [{$table}:{$rowId}] Updated to existing WebP {$targetRelPath}");
                        $convertedCount++;
                        continue;
                    }
                    $this->warn("  [{$table}:{$rowId}] Source file not found on disk: {$relPath}");
                    continue;
                }

                $origSize = filesize($sourcePath);
                $origSha = hash_file('sha256', $sourcePath);
                $ext = strtolower(pathinfo($relPath, PATHINFO_EXTENSION));

                if ($isDryRun) {
                    $this->line("  [DRY-RUN] Would convert: {$relPath} ({$this->formatBytes($origSize)}) -> {$targetRelPath}");
                    $convertedCount++;
                    continue;
                }

                // If target WebP already exists and is valid, use it directly
                if (file_exists($targetPath) && filesize($targetPath) > 0) {
                    $check = @getimagesize($targetPath);
                    if ($check !== false && ($check[2] ?? null) === IMAGETYPE_WEBP) {
                        DB::transaction(function () use ($table, $idCol, $urlCol, $rowId, $rawUrl, $targetUrl) {
                            DB::table($table)
                                ->where($idCol, $rowId)
                                ->where($urlCol, $rawUrl)
                                ->update([$urlCol => $targetUrl]);
                        });
                        @unlink($sourcePath);
                        $this->line("  ✔ [{$table}:{$rowId}] Replaced with already existing WebP {$targetRelPath}");
                        $convertedCount++;
                        continue;
                    }
                }

                // Process image via GD
                $tempPath = tempnam(sys_get_temp_dir(), 'ayaan_webp_');
                try {
                    $img = match ($ext) {
                        'jpg', 'jpeg' => @imagecreatefromjpeg($sourcePath),
                        'png' => @imagecreatefrompng($sourcePath),
                        default => false,
                    };

                    if (!$img) {
                        $this->warn("  [SKIP] Could not decode raster data for {$relPath}");
                        continue;
                    }

                    // Preserve alpha transparency for PNGs
                    if ($ext === 'png') {
                        imagealphablending($img, false);
                        imagesavealpha($img, true);
                    }

                    // Correct EXIF orientation for JPEGs
                    if (in_array($ext, ['jpg', 'jpeg'], true) && function_exists('exif_read_data')) {
                        $exif = @exif_read_data($sourcePath);
                        if (!empty($exif['Orientation'])) {
                            $img = match ((int) $exif['Orientation']) {
                                3 => imagerotate($img, 180, 0),
                                6 => imagerotate($img, -90, 0),
                                8 => imagerotate($img, 90, 0),
                                default => $img,
                            };
                        }
                    }

                    // Constrain dimension
                    $w = imagesx($img);
                    $h = imagesy($img);

                    if ($w > $maxLongEdge || $h > $maxLongEdge) {
                        if ($w >= $h) {
                            $newW = $maxLongEdge;
                            $newH = (int) round(($h / $w) * $maxLongEdge);
                        } else {
                            $newH = $maxLongEdge;
                            $newW = (int) round(($w / $h) * $maxLongEdge);
                        }

                        $resized = imagecreatetruecolor($newW, $newH);
                        if ($ext === 'png') {
                            imagealphablending($resized, false);
                            imagesavealpha($resized, true);
                        }
                        imagecopyresampled($resized, $img, 0, 0, 0, 0, $newW, $newH, $w, $h);
                        imagedestroy($img);
                        $img = $resized;
                    }

                    // Encode to WebP
                    $q = ($ext === 'png' || str_contains($relPath, 'brands/')) ? 85 : $targetQuality;
                    imagewebp($img, $tempPath, $q);
                    imagedestroy($img);

                    if (!file_exists($tempPath) || filesize($tempPath) === 0) {
                        throw new \RuntimeException("Generated WebP is empty for {$relPath}");
                    }

                    // Verify decodability
                    $check = @getimagesize($tempPath);
                    if ($check === false || ($check[2] ?? null) !== IMAGETYPE_WEBP) {
                        throw new \RuntimeException("Generated WebP failed header verification for {$relPath}");
                    }

                    $newSize = filesize($tempPath);
                    $newSha = hash_file('sha256', $tempPath);

                    // Ensure target directory exists
                    $targetDir = dirname($targetPath);
                    if (!is_dir($targetDir)) {
                        @mkdir($targetDir, 0755, true);
                    }

                    // Atomic copy into place
                    if (!copy($tempPath, $targetPath)) {
                        throw new \RuntimeException("Failed to copy converted WebP into destination: {$targetPath}");
                    }
                    chmod($targetPath, 0664);

                    // Update DB inside transaction
                    DB::transaction(function () use ($table, $idCol, $urlCol, $rowId, $rawUrl, $targetUrl) {
                        DB::table($table)
                            ->where($idCol, $rowId)
                            ->where($urlCol, $rawUrl)
                            ->update([$urlCol => $targetUrl]);
                    });

                    // Remove old source file safely
                    @unlink($sourcePath);

                    $this->manifest['converted_assets'][] = [
                        'table' => $table,
                        'record_id' => $rowId,
                        'original_path' => $relPath,
                        'new_path' => $targetRelPath,
                        'original_size' => $origSize,
                        'new_size' => $newSize,
                        'original_sha256' => $origSha,
                        'new_sha256' => $newSha,
                        'saved_bytes' => max(0, $origSize - $newSize),
                    ];

                    $convertedCount++;
                    $savedPct = round((($origSize - $newSize) / $origSize) * 100, 1);
                    $this->line("  ✔ [{$table}:{$rowId}] Converted {$relPath} ({$this->formatBytes($origSize)} -> {$this->formatBytes($newSize)}, -{$savedPct}%)");
                } catch (Throwable $e) {
                    $this->error("  ✖ Error converting {$relPath}: " . $e->getMessage());
                    $this->manifest['errors'][] = [
                        'asset' => $relPath,
                        'phase' => 'convert',
                        'error' => $e->getMessage(),
                    ];
                } finally {
                    if (file_exists($tempPath)) {
                        @unlink($tempPath);
                    }
                }
            }
        }

        $this->manifest['summary']['converted_count'] = $convertedCount;
    }

    /**
     * Scale down and re-encode excessively large WebP images (e.g. 2560px long edge).
     */
    private function optimizeOversizedWebp(bool $isDryRun): void
    {
        $maxLongEdge = (int) $this->option('max-long-edge');
        $optimizedCount = 0;

        $dirIterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->storageRoot));
        foreach ($dirIterator as $file) {
            if (!$file->isFile()) {
                continue;
            }

            if (strtolower($file->getExtension()) !== 'webp') {
                continue;
            }

            $sourcePath = $file->getPathname();
            $relPath = ltrim(str_replace($this->storageRoot, '', $sourcePath), '/');

            // Quick dimension check using getimagesize
            $info = @getimagesize($sourcePath);
            if (!$info) {
                continue;
            }

            $w = $info[0] ?? 0;
            $h = $info[1] ?? 0;
            $size = $file->getSize();

            // Only process if dimensions exceed max-long-edge AND size > 400 KB
            if (($w > $maxLongEdge || $h > $maxLongEdge) && $size > 400 * 1024) {
                if ($isDryRun) {
                    $this->line("  [DRY-RUN] Would resize WebP: {$relPath} ({$w}x{$h}, {$this->formatBytes($size)}) down to {$maxLongEdge}px max edge");
                    $optimizedCount++;
                    continue;
                }

                $tempPath = tempnam(sys_get_temp_dir(), 'ayaan_webp_opt_');
                try {
                    $img = @imagecreatefromwebp($sourcePath);
                    if (!$img) {
                        continue;
                    }

                    if ($w >= $h) {
                        $newW = $maxLongEdge;
                        $newH = (int) round(($h / $w) * $maxLongEdge);
                    } else {
                        $newH = $maxLongEdge;
                        $newW = (int) round(($w / $h) * $maxLongEdge);
                    }

                    $resized = imagecreatetruecolor($newW, $newH);
                    imagealphablending($resized, false);
                    imagesavealpha($resized, true);
                    imagecopyresampled($resized, $img, 0, 0, 0, 0, $newW, $newH, $w, $h);
                    imagedestroy($img);

                    imagewebp($resized, $tempPath, 80);
                    imagedestroy($resized);

                    $newSize = filesize($tempPath);
                    // Only replace if new size is smaller by at least 15%
                    if ($newSize < ($size * 0.85)) {
                        copy($tempPath, $sourcePath);
                        $savedPct = round((($size - $newSize) / $size) * 100, 1);
                        $this->line("  ✔ Resized {$relPath}: {$w}x{$h} -> {$newW}x{$newH} ({$this->formatBytes($size)} -> {$this->formatBytes($newSize)}, -{$savedPct}%)");

                        $this->manifest['optimized_webp_assets'][] = [
                            'path' => $relPath,
                            'original_size' => $size,
                            'new_size' => $newSize,
                            'original_dimensions' => "{$w}x{$h}",
                            'new_dimensions' => "{$newW}x{$newH}",
                            'saved_bytes' => $size - $newSize,
                        ];
                        $optimizedCount++;
                    }
                } catch (Throwable $e) {
                    $this->error("  ✖ Error optimizing WebP {$relPath}: " . $e->getMessage());
                } finally {
                    if (file_exists($tempPath)) {
                        @unlink($tempPath);
                    }
                }
            }
        }

        $this->manifest['summary']['optimized_webp_count'] = $optimizedCount;
    }

    /**
     * Deduplicate exact content duplicates by SHA-256 hash.
     */
    private function deduplicateExactFiles(bool $isDryRun): void
    {
        $hashes = [];
        $dirIterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->storageRoot));
        foreach ($dirIterator as $file) {
            if (!$file->isFile()) {
                continue;
            }
            $p = $file->getPathname();
            $hash = hash_file('sha256', $p);
            $rel = ltrim(str_replace($this->storageRoot, '', $p), '/');
            $hashes[$hash][] = [
                'full_path' => $p,
                'rel_path' => $rel,
                'size' => $file->getSize(),
            ];
        }

        $dupCount = 0;
        foreach ($hashes as $hash => $files) {
            if (count($files) <= 1) {
                continue;
            }

            // Pick canonical file: prefer WebP, prefer shorter path
            usort($files, function ($a, $b) {
                $aWebp = str_ends_with($a['rel_path'], '.webp') ? 0 : 1;
                $bWebp = str_ends_with($b['rel_path'], '.webp') ? 0 : 1;
                if ($aWebp !== $bWebp) return $aWebp <=> $bWebp;
                return strlen($a['rel_path']) <=> strlen($b['rel_path']);
            });

            $canonical = $files[0];
            $duplicates = array_slice($files, 1);

            foreach ($duplicates as $dup) {
                if ($isDryRun) {
                    $this->line("  [DRY-RUN] Duplicate: {$dup['rel_path']} identical to {$canonical['rel_path']} ({$this->formatBytes($dup['size'])})");
                    $dupCount++;
                    continue;
                }

                try {
                    // Update DB references from dup to canonical
                    $dupRel = $dup['rel_path'];
                    $canRel = $canonical['rel_path'];

                    DB::transaction(function () use ($dupRel, $canRel) {
                        $tables = [
                            ['table' => 'product_images', 'url_col' => 'image_url'],
                            ['table' => 'brands', 'url_col' => 'logo_url'],
                            ['table' => 'categories', 'url_col' => 'image_url'],
                            ['table' => 'homepage_banners', 'url_col' => 'image_url'],
                            ['table' => 'order_items', 'url_col' => 'product_image_url'],
                        ];

                        foreach ($tables as $t) {
                            $table = $t['table'];
                            $col = $t['url_col'];

                            $rows = DB::table($table)->where($col, 'like', "%{$dupRel}%")->get();
                            foreach ($rows as $r) {
                                $newUrl = str_replace($dupRel, $canRel, $r->{$col});
                                DB::table($table)->where('id', $r->id)->update([$col => $newUrl]);
                            }
                        }
                    });

                    // Remove redundant duplicate file
                    @unlink($dup['full_path']);

                    $this->manifest['deduplicated_assets'][] = [
                        'canonical_path' => $canRel,
                        'removed_path' => $dupRel,
                        'sha256' => $hash,
                        'saved_bytes' => $dup['size'],
                    ];
                    $dupCount++;
                    $this->line("  ✔ Merged duplicate {$dupRel} -> {$canRel} (saved {$this->formatBytes($dup['size'])})");
                } catch (Throwable $e) {
                    $this->error("  ✖ Error deduplicating {$dup['rel_path']}: " . $e->getMessage());
                }
            }
        }

        $this->manifest['summary']['dedup_count'] = $dupCount;
    }

    /**
     * Archive and reclaim orphaned files that have zero database references.
     */
    private function archiveAndReclaimOrphans(bool $isDryRun): void
    {
        // 1. Gather all referenced paths from all DB tables
        $referencedPaths = [];
        $tables = [
            ['table' => 'product_images', 'url_col' => 'image_url'],
            ['table' => 'brands', 'url_col' => 'logo_url'],
            ['table' => 'categories', 'url_col' => 'image_url'],
            ['table' => 'homepage_banners', 'url_col' => 'image_url'],
            ['table' => 'order_items', 'url_col' => 'product_image_url'],
        ];

        foreach ($tables as $t) {
            $urls = DB::table($t['table'])->whereNotNull($t['url_col'])->pluck($t['url_col']);
            foreach ($urls as $url) {
                $rel = $this->extractRelativePath($url);
                if ($rel) {
                    $referencedPaths[$rel] = true;
                }
            }
        }

        // Add system setting company logo if present
        $logo = DB::table('system_settings')->where('key', 'company_logo_url')->value('value');
        if ($logo) {
            $rel = $this->extractRelativePath($logo);
            if ($rel) {
                $referencedPaths[$rel] = true;
            }
        }

        // 2. Discover files on disk that are NOT in DB reference set
        $orphans = [];
        $dirIterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->storageRoot));
        foreach ($dirIterator as $file) {
            if (!$file->isFile()) {
                continue;
            }

            $sourcePath = $file->getPathname();
            $relPath = ltrim(str_replace($this->storageRoot, '', $sourcePath), '/');

            // Skip hidden or system files
            if (str_starts_with(basename($relPath), '.')) {
                continue;
            }

            // Do not delete branding folder or documents folder
            if (str_starts_with($relPath, 'branding/') || str_starts_with($relPath, 'documents/')) {
                continue;
            }

            if (!isset($referencedPaths[$relPath])) {
                $orphans[] = [
                    'full_path' => $sourcePath,
                    'rel_path' => $relPath,
                    'size' => $file->getSize(),
                ];
            }
        }

        $this->info("Found " . count($orphans) . " orphaned files not referenced in database.");

        if (empty($orphans)) {
            return;
        }

        $totalOrphanBytes = array_sum(array_column($orphans, 'size'));
        $this->info("Total orphaned space: " . $this->formatBytes($totalOrphanBytes));

        if ($isDryRun) {
            $this->line("  [DRY-RUN] Would archive and delete " . count($orphans) . " orphaned files ({$this->formatBytes($totalOrphanBytes)})");
            $this->manifest['summary']['orphans_reclaimed_count'] = count($orphans);
            return;
        }

        // Create backup archive before deletion
        $tarPath = $this->backupDir . '/orphaned_media_backup_' . date('Ymd_His') . '.tar.gz';
        $this->info("Creating pre-cleanup archive: {$tarPath} ...");

        $fileListPath = tempnam(sys_get_temp_dir(), 'ayaan_orphans_');
        $fileList = array_map(fn($o) => $o['full_path'], $orphans);
        file_put_contents($fileListPath, implode("\n", $fileList));

        $cmd = "tar -czf " . escapeshellarg($tarPath) . " -T " . escapeshellarg($fileListPath) . " 2>&1";
        exec($cmd, $output, $ret);
        @unlink($fileListPath);

        if ($ret !== 0 || !file_exists($tarPath) || filesize($tarPath) === 0) {
            $this->error("Failed to create orphaned media archive! Aborting orphan cleanup for safety.");
            return;
        }

        $this->info("Archive created and verified (" . $this->formatBytes(filesize($tarPath)) . "). Proceeding with safe removal...");

        $deletedCount = 0;
        foreach ($orphans as $orphan) {
            if (@unlink($orphan['full_path'])) {
                $this->manifest['orphaned_assets'][] = [
                    'path' => $orphan['rel_path'],
                    'size' => $orphan['size'],
                ];
                $deletedCount++;
            }
        }

        $this->info("✔ Safely reclaimed {$deletedCount} orphaned files.");
        $this->manifest['summary']['orphans_reclaimed_count'] = $deletedCount;
    }

    private function extractRelativePath(string $url): ?string
    {
        $url = trim($url);
        if (str_contains($url, '/storage/')) {
            $parts = explode('/storage/', $url, 2);
            return ltrim($parts[1], '/');
        }
        foreach (['products/', 'brands/', 'categories/', 'banners/', 'order-receipts/'] as $prefix) {
            if (str_starts_with($url, $prefix)) {
                return $url;
            }
        }
        return null;
    }

    private function calculateDirectoryBytes(string $dir): int
    {
        $bytes = 0;
        if (!is_dir($dir)) {
            return 0;
        }
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir));
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $bytes += $file->getSize();
            }
        }
        return $bytes;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024 * 1024) {
            return round($bytes / (1024 * 1024 * 1024), 2) . ' GB';
        }
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }

    /**
     * Remove orphaned incident directory .next.bak-incident if present.
     */
    private function cleanIncidentBak(bool $isDryRun): void
    {
        $incidentDir = '/var/www/ayaan/.next.bak-incident';
        if (!is_dir($incidentDir)) {
            return;
        }

        $bytes = $this->calculateDirectoryBytes($incidentDir);
        $this->info("Found obsolete incident backup: {$incidentDir} ({$this->formatBytes($bytes)})");

        if ($isDryRun) {
            $this->line("  [DRY-RUN] Would remove obsolete directory: {$incidentDir} ({$this->formatBytes($bytes)})");
        } else {
            exec("rm -rf " . escapeshellarg($incidentDir), $out, $ret);
            if ($ret === 0) {
                $this->info("  ✔ Successfully removed {$incidentDir} (reclaimed {$this->formatBytes($bytes)})");
            } else {
                $this->warn("  ✖ Failed to remove {$incidentDir}");
            }
        }
    }

    /**
     * Prune obsolete media backups keeping at least the latest $keepCount backups.
     */
    private function pruneOldMediaBackups(bool $isDryRun, int $keepCount = 7): void
    {
        $backupDir = '/var/backups/ayaan/media';
        if (!is_dir($backupDir)) {
            return;
        }

        $files = glob($backupDir . '/ayaan_media_*.tar.gz');
        if (count($files) <= $keepCount) {
            $this->info("Media backup count (" . count($files) . ") is within retention limit ({$keepCount}).");
            return;
        }

        // Sort by modification time ascending (oldest first)
        usort($files, fn($a, $b) => filemtime($a) <=> filemtime($b));

        $toPrune = array_slice($files, 0, count($files) - $keepCount);
        $prunedBytes = 0;

        $this->info("Found " . count($toPrune) . " expired media backups to prune (retaining latest {$keepCount})...");

        foreach ($toPrune as $f) {
            $sz = filesize($f);
            $prunedBytes += $sz;
            if ($isDryRun) {
                $this->line("  [DRY-RUN] Would prune old backup: " . basename($f) . " ({$this->formatBytes($sz)})");
            } else {
                if (@unlink($f)) {
                    $this->line("  ✔ Pruned old backup: " . basename($f) . " ({$this->formatBytes($sz)})");
                }
            }
        }

        $this->info("  ✔ Total space reclaimed from pruned media backups: " . $this->formatBytes($prunedBytes));
    }
}
