<?php

namespace App\Services\Security;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class NativeBotProtectionService
{
    public const HONEYPOT_FIELD = 'website_url_hp';

    /**
     * Generate a short-lived, signed, action-bound form nonce.
     */
    public function generateFormToken(string $action, Request $request): array
    {
        $issuedAt = time();
        $nonce = Str::random(24);
        $ipHash = hash('sha256', ($request->ip() ?: '0.0.0.0') . config('app.key'));

        $payloadData = [
            'action' => $action,
            'iat' => $issuedAt,
            'nonce' => $nonce,
            'ip' => substr($ipHash, 0, 16),
        ];

        $payload = rtrim(strtr(base64_encode(json_encode($payloadData)), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $payload, (string) config('app.key'));

        return [
            'token' => $payload . '.' . $signature,
            'action' => $action,
            'issued_at' => $issuedAt,
            'expires_in' => 900, // 15 minutes
        ];
    }

    /**
     * Validate submission for honeypot, token signature, replay, and submission timing.
     *
     * @param Request $request
     * @param string $expectedAction
     * @param int $minSeconds Minimum submission time to reject inhuman speed (default 2s)
     * @param int $maxSeconds Maximum token lifetime before expiry (default 900s / 15m)
     * @param bool $requireToken Whether the signed token is strictly mandatory
     * @return string|null Error message on failure, or null if validation passes
     */
    public function validateSubmission(
        Request $request,
        string $expectedAction,
        int $minSeconds = 2,
        int $maxSeconds = 900,
        bool $requireToken = false
    ): ?string {
        // 1. Honeypot check: ordinary users never interact with or fill this field
        $honeypot = $request->input(self::HONEYPOT_FIELD) ?? $request->input('website_hp');
        if (!empty($honeypot)) {
            \Illuminate\Support\Facades\Log::warning("Bot detected: honeypot populated on action '{$expectedAction}' from IP {$request->ip()}");
            return 'Automated form submission detected.';
        }

        // 2. Token resolution
        $token = $request->header('X-Form-Token') ?: $request->input('form_token');

        if (empty($token)) {
            if ($requireToken) {
                return 'Missing security verification token. Please refresh the page and try again.';
            }
            return null; // Fallback to honeypot + rate limits if token is optional
        }

        $parts = explode('.', (string) $token);
        if (count($parts) !== 2) {
            return 'Invalid form security token format.';
        }

        [$payloadB64, $clientSignature] = $parts;

        // 3. Verify HMAC signature using server APP_KEY
        $expectedSignature = hash_hmac('sha256', $payloadB64, (string) config('app.key'));
        if (!hash_equals($expectedSignature, $clientSignature)) {
            \Illuminate\Support\Facades\Log::warning("Bot detected: forged security token signature on action '{$expectedAction}' from IP {$request->ip()}");
            return 'Invalid form security token signature.';
        }

        // 4. Decode payload
        $padded = str_pad(strtr($payloadB64, '-_', '+/'), strlen($payloadB64) % 4 === 0 ? strlen($payloadB64) : strlen($payloadB64) + (4 - strlen($payloadB64) % 4), '=', STR_PAD_RIGHT);
        $decoded = json_decode(base64_decode($padded), true);
        if (!is_array($decoded) || !isset($decoded['action'], $decoded['iat'], $decoded['nonce'])) {
            return 'Malformed form security token.';
        }

        // 5. Verify action binding
        if ($decoded['action'] !== $expectedAction) {
            return "Form security token was issued for '{$decoded['action']}', not '{$expectedAction}'.";
        }

        // 6. Timing verification
        $now = time();
        $issuedAt = (int) $decoded['iat'];
        $elapsed = $now - $issuedAt;

        if ($elapsed < $minSeconds) {
            \Illuminate\Support\Facades\Log::info("Bot detected: implausibly rapid form submission ({$elapsed}s < {$minSeconds}s) on action '{$expectedAction}' from IP {$request->ip()}");
            return 'Form submitted too quickly. Please take a moment and try again.';
        }

        if ($elapsed > $maxSeconds) {
            return 'Form security token has expired. Please refresh and try again.';
        }

        // 7. Single-use replay protection
        $nonce = $decoded['nonce'];
        $cacheKey = "used_form_nonce:{$nonce}";

        if (Cache::has($cacheKey)) {
            \Illuminate\Support\Facades\Log::warning("Bot detected: replayed form nonce '{$nonce}' on action '{$expectedAction}' from IP {$request->ip()}");
            return 'This form submission token has already been used. Please refresh the page.';
        }

        // Record nonce with remaining lifetime
        $ttl = max(60, $maxSeconds - $elapsed);
        Cache::put($cacheKey, 1, $ttl);

        return null;
    }
}
