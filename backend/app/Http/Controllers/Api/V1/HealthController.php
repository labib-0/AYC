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

        $payload = [
            'status' => $overallStatus,
            'app_name' => config('app.name'),
            'environment' => config('app.env'),
            'api_version' => 'v1',
            'services' => [
                'database' => $dbStatus,
                'cache' => $cacheStatus,
            ],
            // Backwards compatibility aliases
            'database' => $dbStatus,
            'redis' => $cacheStatus,
            'timestamp' => now()->toIso8601String(),
        ];

        return response()->json([
            'success' => $overallStatus !== 'error',
            'message' => $overallStatus === 'ok' ? 'API is healthy' : ($overallStatus === 'degraded' ? 'API degraded' : 'API service unavailable'),
            'data' => $payload,
        ], $statusCode);
    }
}
