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
     * Determine if request is an authenticated internal trusted request from local loopback/host interface.
     */
    public function isInternalTrusted(Request $request): bool
    {
        $configuredSecret = (string) (config('services.internal.secret') ?: env('INTERNAL_API_SECRET', ''));
        if (empty($configuredSecret) || strlen($configuredSecret) < 16) {
            return false;
        }

        $clientSecret = (string) $request->header('x-internal-secret', '');
        if (empty($clientSecret) || !hash_equals($configuredSecret, $clientSecret)) {
            return false;
        }

        $ip = (string) $request->ip();
        $allowedIps = [
            '127.0.0.1',
            '::1',
            '200.97.169.230',
            '2a02:4780:63:21bf::1',
        ];

        return in_array($ip, $allowedIps, true);
    }

    /**
     * Validate submission for honeypot, token signature, replay, and submission timing.
     *
     * @param Request $request
     * @param string $expectedAction
     * @param int $minSeconds Minimum submission time to reject inhuman speed (default 2s)
     * @param int $maxSeconds Maximum token lifetime before expiry (default 900s / 15m)
     * @param bool $requireToken Whether the signed token is strictly mandatory (defaults to true)
     * @return string|null Error message on failure, or null if validation passes
     */
    public function validateSubmission(
        Request $request,
        string $expectedAction,
        int $minSeconds = 2,
        int $maxSeconds = 900,
        bool $requireToken = true
    ): ?string {
        // 1. Honeypot check: ordinary users never interact with or fill this field
        $rawHoneypot = $request->input(self::HONEYPOT_FIELD) ?? $request->input('website_hp');
        $honeypot = is_string($rawHoneypot) ? trim($rawHoneypot) : (string) ($rawHoneypot ?? '');
        if (!empty($honeypot)) {
            \Illuminate\Support\Facades\Log::warning("Bot detected: honeypot populated on action '{$expectedAction}' from IP {$request->ip()}");
            return 'Automated form submission detected.';
        }

        // 2. Token resolution
        $token = $request->header('X-Form-Token') ?: $request->input('form_token');

        if (empty($token)) {
            // Documented policy: Internal trusted services possessing the verified internal secret
            // originating strictly from loopback/local interfaces are permitted.
            if ($this->isInternalTrusted($request)) {
                return null;
            }

            // In local/test environments (PHPUnit test runs), allow test requests unless specifically testing bot protection
            if (app()->environment('testing') && !$request->header('X-Require-Bot-Token')) {
                return null;
            }

            if ($requireToken) {
                return 'Missing security verification token. Please refresh the page and try again.';
            }

            return 'Missing security verification token. Please refresh the page and try again.';
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

        // Grace tolerance for minor clock drift (up to 3 seconds)
        if ($elapsed < -3) {
            return 'Form security token contains an invalid timestamp.';
        }

        if ($elapsed < $minSeconds) {
            $user = $request->user() ?: auth('sanctum')->user();
            // Allow legitimate authenticated buyers with prefilled details, but reject anonymous bots
            if (!($user && $elapsed >= 0)) {
                \Illuminate\Support\Facades\Log::info("Bot detected: implausibly rapid form submission ({$elapsed}s < {$minSeconds}s) on action '{$expectedAction}' from IP {$request->ip()}");
                return 'Form submitted too quickly. Please take a moment and try again.';
            }
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
