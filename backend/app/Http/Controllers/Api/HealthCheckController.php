<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthCheckController extends Controller
{
    /**
     * GET /api/health
     * Lightweight system health probe.
     */
    public function __invoke(): JsonResponse
    {
        $dbStatus = 'ok';
        $cacheStatus = 'ok';

        // 1. Database Probe
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbStatus = 'error';
            Log::error('Health check database probe failed', ['error' => $e->getMessage()]);
        }

        // 2. Cache / Redis Probe
        try {
            $testKey = '__health_probe__' . uniqid();
            Cache::put($testKey, 'probe', 10);
            $val = Cache::get($testKey);
            Cache::forget($testKey);
            if ($val !== 'probe') {
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

        return response()->json([
            'status' => $overallStatus,
            'timestamp' => now()->toIso8601String(),
            'environment' => config('app.env'),
            'services' => [
                'database' => $dbStatus,
                'cache' => $cacheStatus,
            ],
        ], $statusCode);
    }
}
