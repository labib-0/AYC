<?php

namespace App\Http\Controllers\Api\V1\Internal;

use App\Http\Controllers\Controller;
use App\Services\Security\StorefrontCountryAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InternalStorefrontAccessController extends Controller
{
    public function __construct(
        private readonly StorefrontCountryAccessService $accessService
    ) {}

    /**
     * GET /api/v1/internal/storefront/access-check
     *
     * Protected internal server-to-server endpoint for Next.js proxy.
     * Evaluates whether a customer storefront page request should be allowed or blocked.
     *
     * Security:
     * - Requires valid X-Internal-Secret header.
     * - Requires valid X-Internal-Client-IP header established server-side by Next.js/Nginx.
     * - Strictly rejects arbitrary query-parameter IP spoofing (e.g. ?ip=...).
     * - Returns minimal response: { "allowed": true } or { "allowed": false }.
     */
    public function check(Request $request): JsonResponse
    {
        // 1. Enforce Server-to-Server Security Secret
        $configuredSecret = config('services.internal.secret');
        $providedSecret = $request->header('X-Internal-Secret');

        if (empty($configuredSecret) || empty($providedSecret) || !hash_equals((string) $configuredSecret, (string) $providedSecret)) {
            Log::warning('Internal storefront access check rejected: invalid or missing internal secret', [
                'remote_addr' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'error' => 'Unauthorized internal request.',
            ], 403);
        }

        // 2. Reject any attempt to spoof client IP via query parameters
        if ($request->has('ip')) {
            Log::warning('Internal storefront access check rejected: client attempted to supply forbidden query parameter ip', [
                'remote_addr' => $request->ip(),
                'attempted_ip' => $request->query('ip'),
            ]);

            return response()->json([
                'error' => 'Query parameter ip is forbidden. Client IP must be supplied via trusted internal header.',
            ], 400);
        }

        // 3. Extract Client IP strictly from trusted internal header
        $clientIp = $request->header('X-Internal-Client-IP');

        if (empty($clientIp) || !filter_var($clientIp, FILTER_VALIDATE_IP)) {
            Log::warning('Internal storefront access check rejected: missing or invalid X-Internal-Client-IP header', [
                'header_value' => $clientIp,
            ]);

            return response()->json([
                'error' => 'Missing or invalid X-Internal-Client-IP header.',
            ], 400);
        }

        // 4. Evaluate Access via StorefrontCountryAccessService
        $decision = $this->accessService->checkAccess($clientIp);

        // 5. Return minimal decision DTO (never exposing PII, city, ISP, ASN, or diagnostics)
        return response()->json([
            'allowed' => (bool) $decision['allowed'],
        ]);
    }
}
