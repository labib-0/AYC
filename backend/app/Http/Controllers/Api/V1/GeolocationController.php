<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Security\StorefrontCountryAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeolocationController extends Controller
{
    public function __construct(
        private readonly StorefrontCountryAccessService $accessService
    ) {}

    /**
     * GET /api/v1/geolocation/detect
     * GET /api/v1/location/detect
     *
     * Detect visitor's country based on request IP.
     * Reuses stevebauman/location and local MaxMind GeoLite2 database.
     *
     * Returns:
     * - Detected: { "success": true, "detected": true, "country_code": "BD", "country_name": "Bangladesh" }
     * - Fallback: { "success": true, "detected": false, "country_code": null, "country_name": null }
     */
    public function detect(Request $request): JsonResponse
    {
        // Authoritative request IP via Laravel's trusted proxy configuration
        $clientIp = $request->ip();

        // Support test IP injection only with internal secret or in debug/local environments
        $testIp = $request->header('X-Test-Client-IP');
        if (!empty($testIp) && filter_var($testIp, FILTER_VALIDATE_IP)) {
            $internalSecret = config('services.internal.secret');
            $providedSecret = $request->header('X-Internal-Secret');

            $isAuthorizedTest = (
                app()->environment('local', 'testing')
                || config('app.debug')
                || (!empty($internalSecret) && !empty($providedSecret) && hash_equals((string) $internalSecret, (string) $providedSecret))
            );

            if ($isAuthorizedTest) {
                $clientIp = $testIp;
            }
        }

        $details = $this->accessService->resolveCountryDetails($clientIp);

        if (!$details) {
            return response()->json([
                'success' => true,
                'detected' => false,
                'country_code' => null,
                'country_name' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'detected' => true,
            'country_code' => $details['country_code'],
            'country_name' => $details['country_name'],
        ]);
    }
}
