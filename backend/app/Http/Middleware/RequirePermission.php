<?php

namespace App\Http\Middleware;

use App\Services\Rbac\AdminAuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RequirePermission — enforces RBAC permission checks on admin routes.
 *
 * Usage in routes:
 *   Route::middleware(['auth:sanctum', 'role:admin', 'permission:product.publish'])
 *
 * Chain order must be:
 *   auth:sanctum → role:admin → permission:<slug>
 *
 * The middleware delegates to AdminAuthorizationService which handles:
 *   - Super Admin bypass
 *   - Effective permission resolution (with dependency expansion)
 *   - Cache-backed lookups
 *
 * Never bypass the role:admin middleware before this one.
 */
class RequirePermission
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  string  ...$permissions  One or more permission slugs (ALL must be present)
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (! $user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Administrator access required.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $user->isActiveAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Your administrator account has been deactivated.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Check all required permissions (ALL must be present)
        foreach ($permissions as $permission) {
            if (! $this->authorization->can($user, $permission)) {
                return response()->json([
                    'success' => false,
                    'message' => "Forbidden: you do not have the '{$permission}' permission.",
                ], Response::HTTP_FORBIDDEN);
            }
        }

        return $next($request);
    }
}
