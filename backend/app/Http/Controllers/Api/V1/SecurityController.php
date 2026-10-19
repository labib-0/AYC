<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Services\Security\NativeBotProtectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityController extends ApiController
{
    public function __construct(
        protected NativeBotProtectionService $botProtection
    ) {}

    /**
     * GET /api/v1/security/form-token?action={action}
     * Issues an action-bound, signed form token with timestamp for anti-bot validation.
     */
    public function getFormToken(Request $request): JsonResponse
    {
        $action = trim((string) $request->query('action', 'general'));
        $allowedActions = [
            'signup',
            'login',
            'admin-login',
            'forgot-password',
            'rfq-create',
            'order-checkout',
            'general',
        ];

        if (!in_array($action, $allowedActions, true)) {
            $action = 'general';
        }

        $tokenData = $this->botProtection->generateFormToken($action, $request);

        return $this->success($tokenData, 'Security form token generated');
    }
}
