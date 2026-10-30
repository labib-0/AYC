<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthController extends ApiController
{
    /**
     * GET /api/health or /api/v1/health
     * Lightweight system health probe.
     */
    public function check(): JsonResponse
    {
        $dbStatus = 'ok';
        $cacheStatus = 'ok';

        // 1. Database Connectivity Probe
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbStatus = 'error';
            Log::error('Health check DB probe failed', ['error' => $e->getMessage()]);
        }

        // 2. Cache / Redis Probe
        try {
            $probeKey = '__health_probe__' . uniqid();
            Cache::put($probeKey, 'ok', 10);
            $val = Cache::get($probeKey);
            Cache::forget($probeKey);
            if ($val !== 'ok') {
                $cacheStatus = 'degraded';
            }
        } catch (\Throwable $e) {
            $cacheStatus = 'degraded';
            Log::warning('Health check cache probe degraded', ['error' => $e->getMessage()]);
        }

        $overallStatus = 'ok';
        $statusCode = 200;

        if ($dbStatus !== 'ok') {
            $overallStatus = 'error';
            $statusCode = 503;
        } elseif ($cacheStatus !== 'ok') {
            $overallStatus = 'degraded';
            $statusCode = 200;
        }

        // 3. Runtime Release Identity Probe (Loaded code identity via ReleaseIdentity)
        // Uses class constants in compiled OPcache bytecode or the physical release directory.
        // Never resolves through mutable 'current' symlinks or base_path() lookups.
        $releaseIdentity = \App\Support\ReleaseIdentity::get();
        $commitSha = $releaseIdentity['commit_sha'] ?? null;
        $releaseId = $releaseIdentity['release_id'] ?? null;

        // 4. Determine Internal vs Public Caller for Privacy Protection
        $isInternal = false;
        $clientIp = (string) request()->ip();
        // Strictly allow machine-local loopbacks; public server IPs must authenticate with secret
        $internalIps = ['127.0.0.1', '::1'];
        if (in_array($clientIp, $internalIps, true)) {
            $isInternal = true;
        }
        $internalSecret = (string) (config('services.internal.secret') ?: env('INTERNAL_API_SECRET', ''));
        $headerSecret = (string) (request()->header('x-internal-secret') ?: request()->header('x-release-gate-secret', ''));
        if (!empty($internalSecret) && !empty($headerSecret) && hash_equals($internalSecret, $headerSecret)) {
            $isInternal = true;
        }

        // 5. Runtime Queue Worker Health & Release Identity Probe (From Cache/Redis)
        $queueStatus = 'ok';
        $workerDiagnostics = [];
        $now = time();
        $retryAfter = (int) config('queue.connections.redis.retry_after', 90);

        try {
            $activePids = Cache::get('ayaan:workers:active_pids', []);
            if (!is_array($activePids)) {
                $activePids = [];
            }

            // Single-worker fallback if registry key is not yet set
            if (empty($activePids)) {
                $primary = Cache::get('ayaan:worker:release_identity');
                if (is_array($primary) && !empty($primary['pid'])) {
                    $activePids[] = (int) $primary['pid'];
                }
            }

            $livePids = [];
            $prunedPids = false;

            foreach ($activePids as $pid) {
                $pidInt = (int) $pid;
                $cached = Cache::get("ayaan:worker:{$pidInt}");
                if (!is_array($cached) && $pidInt === (int) (Cache::get('ayaan:worker:release_identity')['pid'] ?? 0)) {
                    $cached = Cache::get('ayaan:worker:release_identity');
                }

                // If cached heartbeat has expired, worker is dead/unresponsive; prune from registry
                if (!is_array($cached) || empty($cached['pid'])) {
                    $prunedPids = true;
                    continue;
                }

                // Process liveness verification: check if OS process is actually alive
                $isProcessAlive = true;
                if (function_exists('posix_kill')) {
                    if (!posix_kill($pidInt, 0) && posix_get_last_error() !== 1) { // 1 = EPERM (alive under other user)
                        $isProcessAlive = false;
                    }
                } elseif (is_dir('/proc') && !file_exists("/proc/{$pidInt}")) {
                    $isProcessAlive = false;
                }

                if (!$isProcessAlive) {
                    Cache::forget("ayaan:worker:{$pidInt}");
                    $prunedPids = true;
                    continue;
                }

                $livePids[] = $pidInt;
                $status = $cached['status'] ?? 'idle';
                $recordedAt = (int) ($cached['recorded_at'] ?? 0);
                $jobStartedAt = (int) ($cached['job_started_at'] ?? 0);

                // Freshness determination:
                // - Idle worker: fresh if recorded within last 45 seconds
                // - Busy worker: fresh if active job started within max retry_after window (90s)
                $isFresh = false;
                if ($status === 'busy' && $jobStartedAt > 0) {
                    $isFresh = ($now - $jobStartedAt) >= 0 && ($now - $jobStartedAt) <= $retryAfter;
                } else {
                    $isFresh = ($now - $recordedAt) >= 0 && ($now - $recordedAt) <= 45;
                }

                $workerDiagnostics[] = [
                    'pid' => (int) $cached['pid'],
                    'instance_id' => $cached['instance_id'] ?? null,
                    'commit_sha' => $cached['commit_sha'] ?? null,
                    'release_id' => $cached['release_id'] ?? null,
                    'build_id' => $cached['build_id'] ?? null,
                    'status' => $status,
                    'booted_at' => (int) ($cached['booted_at'] ?? 0),
                    'recorded_at' => $recordedAt,
                    'job_started_at' => $jobStartedAt > 0 ? $jobStartedAt : null,
                    'active' => $isFresh,
                ];
            }

            // Keep registry pruned and current
            if ($prunedPids || count($livePids) !== count($activePids)) {
                Cache::put('ayaan:workers:active_pids', $livePids, 180);
            }
        } catch (\Throwable $e) {
            Log::debug('Health check worker probe notice: ' . $e->getMessage());
        }

        if (empty($workerDiagnostics)) {
            $queueStatus = 'no_workers';
        } else {
            foreach ($workerDiagnostics as $w) {
                if (empty($w['active'])) {
                    $queueStatus = 'degraded';
                    break;
                }
            }
        }

        $payload = [
            'status' => $overallStatus,
            'app_name' => config('app.name'),
            'environment' => config('app.env'),
            'api_version' => 'v1',
            'commit_sha' => $commitSha,
            'release_id' => $releaseId,
            'services' => [
                'database' => $dbStatus,
                'cache' => $cacheStatus,
                'queue' => $queueStatus,
            ],
            // Backwards compatibility aliases
            'database' => $dbStatus,
            'redis' => $cacheStatus,
            'timestamp' => now()->toIso8601String(),
        ];

        // Privacy Boundary: Internal worker PIDs and UUIDs are NEVER exposed publicly.
        // They are strictly included only for verified internal callers (loopback or X-Internal-Secret).
        if ($isInternal) {
            $payload['queue_workers'] = $workerDiagnostics;
            $payload['queue_worker'] = !empty($workerDiagnostics) ? $workerDiagnostics[0] : null;
        }

        return response()->json([
            'success' => $overallStatus !== 'error',
            'message' => $overallStatus === 'ok' ? 'API is healthy' : ($overallStatus === 'degraded' ? 'API degraded' : 'API service unavailable'),
            'data' => $payload,
        ], $statusCode);
    }
}
