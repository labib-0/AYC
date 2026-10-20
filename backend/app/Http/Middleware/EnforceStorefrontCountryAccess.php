<?php

namespace App\Http\Middleware;

use App\Services\Security\StorefrontCountryAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceStorefrontCountryAccess
{
    public function __construct(
        private readonly StorefrontCountryAccessService $accessService
    ) {}

    /**
     * Handle an incoming request.
     *
     * Enforces the Bangladesh customer storefront restriction on public catalog APIs.
     *
     * Rules:
     * 1. If restriction is OFF -> allow access.
     * 2. If authenticated user is an active administrator -> allow access (admin safety).
     * 3. Evaluate client IP via StorefrontCountryAccessService:
     *    - Bangladesh (BD) -> deny access (HTTP 403 Forbidden).
     *    - Other countries -> allow access.
     *    - Unresolvable IP / GeoIP lookup failure -> fail-open (allow access).
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. If restriction is disabled globally, immediately pass through
        if (!$this->accessService->isBlockEnabled()) {
            return $next($request);
        }

        // 2. Preserve administrative access: authenticated active admins are never restricted
        $user = $request->user('sanctum') ?? $request->user();
        if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return $next($request);
        }

        // 3. Resolve client IP from trusted request
        $clientIp = $request->ip();

        // 4. Evaluate access policy
        $decision = $this->accessService->checkAccess($clientIp);

        if ($decision['blocked']) {
            return response()->json([
                'success' => false,
                'message' => 'Storefront access is restricted in Bangladesh.',
                'error_code' => 'GEO_BLOCKED_BANGLADESH',
            ], Response::HTTP_FORBIDDEN, [
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
            ]);
        }

        return $next($request);
    }
}
