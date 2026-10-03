<?php

namespace App\Services\Security;

use App\Models\SystemSetting;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use MaxMind\Db\Reader;
use PharData;
use RecursiveIteratorIterator;
use Throwable;

class GeoIpDatabaseManager
{
    public const SETTING_LAST_SUCCESS = 'geoip_db_last_success_at';
    public const SETTING_LAST_ERROR = 'geoip_db_last_error';
    public const SETTING_LAST_ERROR_AT = 'geoip_db_last_error_at';
    public const SETTING_LAST_ATTEMPT_AT = 'geoip_db_last_attempt_at';
    public const CACHE_SALT_KEY = 'geoip_country_cache_salt';

    /**
     * Get the absolute path to the active GeoLite2 Country database.
     */
    public function getDatabasePath(): string
    {
        $path = config('location.maxmind.local.path');

        if (empty($path)) {
            return database_path('maxmind/GeoLite2-Country.mmdb');
        }

        // If path is already absolute, return as-is
        if (str_starts_with($path, '/') || str_starts_with($path, '\\') || preg_match('/^[a-zA-Z]:[\\\\\/]/', $path)) {
            return $path;
        }

        return database_path($path);
    }

    /**
     * Get the absolute path to the temporary backup file used during atomic swaps.
     */
    public function getBackupPath(): string
    {
        return $this->getDatabasePath() . '.backup';
    }

    /**
     * Gather comprehensive health, metadata, and diagnostic information.
     * Strictly omits license keys, passwords, and sensitive internal secrets.
     */
    public function getStatus(): array
    {
        $path = $this->getDatabasePath();
        $exists = file_exists($path);
        $sizeBytes = $exists ? filesize($path) : 0;
        $fileMtime = $exists ? filemtime($path) : null;

        $meta = null;
        $isValid = false;
        $errorMessage = null;

        if ($exists) {
            try {
                $reader = new Reader($path);
                $metadata = $reader->metadata();
                $meta = [
                    'database_type' => $metadata->databaseType,
                    'build_epoch' => $metadata->buildEpoch,
                    'build_date' => date('Y-m-d H:i:s T', $metadata->buildEpoch),
                    'ip_version' => $metadata->ipVersion === 6 ? 'IPv4 & IPv6' : 'IPv' . $metadata->ipVersion,
                    'binary_format' => $metadata->binaryFormatMajorVersion . '.' . $metadata->binaryFormatMinorVersion,
                    'node_count' => $metadata->nodeCount,
                ];
                $reader->close();
                $isValid = ($metadata->databaseType === 'GeoLite2-Country');
            } catch (Throwable $e) {
                $isValid = false;
                $errorMessage = 'Corrupt or unreadable database: ' . $e->getMessage();
            }
        }

        // Determine health
        $health = 'HEALTHY';
        if (!$exists) {
            $health = 'MISSING';
        } elseif (!$isValid) {
            $health = 'CORRUPT';
        } elseif ($meta && (time() - $meta['build_epoch']) > (45 * 86400)) {
            $health = 'OUTDATED';
        }

        $lastSuccess = SystemSetting::get(self::SETTING_LAST_SUCCESS);
        $lastError = SystemSetting::get(self::SETTING_LAST_ERROR);
        $lastErrorAt = SystemSetting::get(self::SETTING_LAST_ERROR_AT);
        $lastAttemptAt = SystemSetting::get(self::SETTING_LAST_ATTEMPT_AT);

        $hasLicenseKey = !empty(config('location.maxmind.license_key'));

        return [
            'database_exists' => $exists,
            'database_path' => $path,
            'file_size_bytes' => $sizeBytes,
            'file_size_human' => $exists ? $this->formatBytes($sizeBytes) : '0 B',
            'file_modified_at' => $fileMtime ? date('Y-m-d H:i:s T', $fileMtime) : null,
            'metadata' => $meta,
            'is_valid' => $isValid,
            'health_status' => $health,
            'validation_error' => $errorMessage,
            'license_key_configured' => $hasLicenseKey,
            'last_successful_update' => $lastSuccess,
            'last_attempt_at' => $lastAttemptAt,
            'last_error' => $lastError,
            'last_error_at' => $lastErrorAt,
        ];
    }

    /**
     * Validate an mmdb file thoroughly before activating it.
     * Ensures minimum size, valid header, correct schema, and functional IP resolution.
     */
    public function validateDatabaseFile(string $filePath): bool
    {
        if (!file_exists($filePath) || filesize($filePath) < 1000000) {
            return false;
        }

        try {
            $reader = new Reader($filePath);
            $metadata = $reader->metadata();

            if ($metadata->databaseType !== 'GeoLite2-Country') {
                $reader->close();
                return false;
            }

            // Test lookups against known IP addresses
            // US lookup test
            $recordUs = $reader->get('8.8.8.8');
            if (empty($recordUs) || ($recordUs['country']['iso_code'] ?? null) !== 'US') {
                $reader->close();
                return false;
            }

            // BD lookup test
            $recordBd = $reader->get('103.230.104.1');
            if (empty($recordBd) || ($recordBd['country']['iso_code'] ?? null) !== 'BD') {
                $reader->close();
                return false;
            }

            $reader->close();
            return true;
        } catch (Throwable $e) {
            Log::warning('GeoIpDatabaseManager: validation failed for mmdb', [
                'path' => $filePath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Safely download, validate, and atomically replace the MaxMind database.
     * Includes automatic rollback to previous database if validation fails.
     */
    public function updateDatabase(?string $licenseKey = null): array
    {
        $licenseKey = $licenseKey ?: config('location.maxmind.license_key');

        SystemSetting::set(self::SETTING_LAST_ATTEMPT_AT, now()->toIso8601String(), 'string', 'security');

        if (empty($licenseKey)) {
            $msg = 'MAXMIND_LICENSE_KEY is not configured in server environment.';
            Log::warning('GeoIpDatabaseManager update aborted: ' . $msg);
            SystemSetting::set(self::SETTING_LAST_ERROR, $msg, 'string', 'security');
            SystemSetting::set(self::SETTING_LAST_ERROR_AT, now()->toIso8601String(), 'string', 'security');
            return [
                'success' => false,
                'message' => $msg,
            ];
        }

        $targetPath = $this->getDatabasePath();
        $targetDir = dirname($targetPath);
        $backupPath = $this->getBackupPath();

        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }

        $tmpDir = $targetDir . '/tmp_update_' . Str::random(8);
        @mkdir($tmpDir, 0755, true);
        $tmpTarPath = $tmpDir . '/maxmind.tar.gz';

        try {
            $downloadUrl = sprintf(
                'https://download.maxmind.com/app/geoip_download_by_token?edition_id=GeoLite2-Country&license_key=%s&suffix=tar.gz',
                urlencode($licenseKey)
            );

            // Stream download directly to temporary archive
            $response = Http::withOptions([
                'sink' => $tmpTarPath,
                'timeout' => 120,
                'connect_timeout' => 15,
            ])->get($downloadUrl);

            if ($response->failed() || !file_exists($tmpTarPath) || filesize($tmpTarPath) < 500000) {
                throw new Exception('Download failed with HTTP ' . $response->status() . ' or incomplete archive received.');
            }

            // Extract archive
            $archive = new PharData($tmpTarPath);
            $extractedMmdb = $this->extractDatabaseFromArchive($archive, $tmpDir);

            if (!$extractedMmdb || !file_exists($extractedMmdb)) {
                throw new Exception('No valid GeoLite2-Country.mmdb discovered inside downloaded archive.');
            }

            // Thorough validation
            if (!$this->validateDatabaseFile($extractedMmdb)) {
                throw new Exception('Downloaded database file failed integrity or geolocation resolution validation.');
            }

            // Safe Atomic Replacement with Backup
            if (file_exists($targetPath)) {
                @copy($targetPath, $backupPath);
            }

            // Copy validated file to target path
            $copied = copy($extractedMmdb, $targetPath);
            if (!$copied) {
                // If copy failed, restore backup immediately if target missing
                if (!file_exists($targetPath) && file_exists($backupPath)) {
                    @copy($backupPath, $targetPath);
                }
                throw new Exception('Failed to copy validated database to active target path.');
            }

            // Re-validate the active file in-place
            if (!$this->validateDatabaseFile($targetPath)) {
                // Rollback immediately from backup!
                if (file_exists($backupPath)) {
                    copy($backupPath, $targetPath);
                }
                throw new Exception('Active database failed post-replacement validation. Restored previous valid database from backup.');
            }

            // Invalidate GeoIP Cache
            $this->invalidateGeoIpCache();

            // Record success
            SystemSetting::set(self::SETTING_LAST_SUCCESS, now()->toIso8601String(), 'string', 'security');
            SystemSetting::forget(self::SETTING_LAST_ERROR);
            SystemSetting::forget(self::SETTING_LAST_ERROR_AT);

            Log::info('GeoIpDatabaseManager: MaxMind GeoLite2-Country database successfully updated and verified.');

            return [
                'success' => true,
                'message' => 'MaxMind database updated, verified, and activated successfully.',
                'status' => $this->getStatus(),
            ];
        } catch (Throwable $e) {
            $errorMsg = $e->getMessage();
            Log::error('GeoIpDatabaseManager update failed: ' . $errorMsg);

            SystemSetting::set(self::SETTING_LAST_ERROR, $errorMsg, 'string', 'security');
            SystemSetting::set(self::SETTING_LAST_ERROR_AT, now()->toIso8601String(), 'string', 'security');

            // Rollback safety: Ensure targetPath is restored if corrupted
            if ((!file_exists($targetPath) || filesize($targetPath) < 1000000) && file_exists($backupPath)) {
                @copy($backupPath, $targetPath);
                Log::info('GeoIpDatabaseManager: Restored database from backup after failed update.');
            }

            return [
                'success' => false,
                'message' => 'GeoIP database update failed: ' . $errorMsg,
            ];
        } finally {
            // Clean up temporary files
            $this->cleanDirectory($tmpDir);
        }
    }

    /**
     * Invalidate all cached IP -> country resolutions instantly.
     * Uses dynamic cache salt bump and Redis pattern scan if available.
     */
    public function invalidateGeoIpCache(): void
    {
        // 1. Increment cache salt so all future cache lookups immediately miss old entries
        try {
            $currentSalt = (int) Cache::get(self::CACHE_SALT_KEY, 1);
            Cache::forever(self::CACHE_SALT_KEY, $currentSalt + 1);
        } catch (Throwable $e) {
            // Non-fatal
        }

        // 2. If Redis is active, delete matching keys safely without affecting other caches
        try {
            if (config('cache.default') === 'redis') {
                $redis = Cache::getStore()->getRedis();
                $prefix = config('database.redis.options.prefix', '') . Cache::getPrefix();
                $keys = $redis->keys($prefix . 'geoip_country:*');
                if (!empty($keys)) {
                    foreach ($keys as $k) {
                        $cleanKey = Str::after($k, $prefix);
                        Cache::forget($cleanKey);
                    }
                }
            }
        } catch (Throwable $e) {
            // Non-fatal
        }
    }

    /**
     * Discover and extract the .mmdb file inside the downloaded archive.
     */
    protected function extractDatabaseFromArchive(PharData $archive, string $tmpDir): ?string
    {
        foreach (new RecursiveIteratorIterator($archive) as $file) {
            if (pathinfo($file->getFilename(), PATHINFO_EXTENSION) === 'mmdb') {
                $relativeArchivePath = str_replace($archive->getPath() . '/', '', $file->getPathname());
                $archive->extractTo($tmpDir, $relativeArchivePath, true);
                $extractedPath = $tmpDir . '/' . $relativeArchivePath;
                if (file_exists($extractedPath)) {
                    return $extractedPath;
                }
            }
        }

        return null;
    }

    /**
     * Recursively delete a directory and its contents.
     */
    protected function cleanDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        try {
            $files = array_diff(scandir($dir) ?: [], ['.', '..']);
            foreach ($files as $file) {
                $item = "$dir/$file";
                is_dir($item) ? $this->cleanDirectory($item) : @unlink($item);
            }
            @rmdir($dir);
        } catch (Throwable $e) {
            // Non-fatal temporary file cleanup
        }
    }

    /**
     * Format byte count into human-readable representation.
     */
    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $power = $bytes > 0 ? floor(log($bytes, 1024)) : 0;
        return number_format($bytes / pow(1024, $power), 2) . ' ' . ($units[$power] ?? 'B');
    }
}
