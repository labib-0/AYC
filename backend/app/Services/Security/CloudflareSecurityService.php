<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * CloudflareSecurityService
 *
 * Dedicated, secure service for managing Cloudflare Rulesets API
 * and specifically the Bangladesh Storefront access restriction rule.
 */
class CloudflareSecurityService
{
    private ?string $apiToken;
    private ?string $zoneId;
    private ?string $rulesetId;
    private ?string $ruleId;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiToken = config('services.cloudflare.api_token') ?: env('CLOUDFLARE_API_TOKEN');
        $this->zoneId = config('services.cloudflare.zone_id') ?: env('CLOUDFLARE_ZONE_ID');
        $this->rulesetId = config('services.cloudflare.ruleset_id') ?: env('CLOUDFLARE_RULESET_ID');
        $this->ruleId = config('services.cloudflare.rule_id') ?: env('CLOUDFLARE_RULE_ID');
        $this->baseUrl = 'https://api.cloudflare.com/client/v4';
    }

    /**
     * Check whether Cloudflare API credentials and rule IDs are configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiToken) &&
               !empty($this->zoneId) &&
               !empty($this->rulesetId) &&
               !empty($this->ruleId);
    }

    /**
     * Get the current state of the Bangladesh Storefront rule from Cloudflare Rulesets API.
     *
     * @return array{configured: bool, exists: bool, enabled: bool, rule?: array, error?: string}
     */
    public function getStorefrontRule(): array
    {
        if (!$this->isConfigured()) {
            return [
                'configured' => false,
                'exists' => false,
                'enabled' => false,
                'message' => 'Cloudflare API credentials not configured in server environment.',
            ];
        }

        try {
            $url = "{$this->baseUrl}/zones/{$this->zoneId}/rulesets/{$this->rulesetId}/rules/{$this->ruleId}";

            $response = Http::withToken($this->apiToken)
                ->timeout(10)
                ->acceptJson()
                ->get($url);

            if (!$response->successful()) {
                $err = $response->json('errors.0.message') ?: "HTTP status {$response->status()}";
                Log::warning('Cloudflare API getStorefrontRule error', [
                    'status' => $response->status(),
                    'error' => $err,
                ]);

                return [
                    'configured' => true,
                    'exists' => false,
                    'enabled' => false,
                    'error' => "Cloudflare API error: {$err}",
                ];
            }

            $rule = $response->json('result') ?: [];
            $this->validateRuleStructure($rule);

            return [
                'configured' => true,
                'exists' => true,
                'enabled' => (bool) ($rule['enabled'] ?? false),
                'rule' => [
                    'id' => $rule['id'] ?? $this->ruleId,
                    'description' => $rule['description'] ?? '',
                    'action' => $rule['action'] ?? '',
                    'expression' => $rule['expression'] ?? '',
                    'enabled' => (bool) ($rule['enabled'] ?? false),
                    'last_updated' => $rule['last_updated'] ?? null,
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('CloudflareSecurityService::getStorefrontRule failed', [
                'error' => $e->getMessage(),
            ]);

            return [
                'configured' => true,
                'exists' => false,
                'enabled' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update the enabled state of the Bangladesh Storefront rule in Cloudflare.
     *
     * @param bool $enabled True to enable block (ON), False to disable block (OFF)
     * @param bool $dryRun If true, validates with Cloudflare without applying
     * @return array
     */
    public function updateStorefrontRule(bool $enabled, bool $dryRun = false): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('Cloudflare credentials not configured in server environment.');
        }

        // 1. Fetch current rule to validate expression targets Bangladesh storefront
        $current = $this->getStorefrontRule();
        if (!$current['exists'] || empty($current['rule'])) {
            throw new RuntimeException($current['error'] ?? 'Target Cloudflare rule could not be verified.');
        }

        $ruleData = $current['rule'];
        $this->validateRuleExpression($ruleData['expression'] ?? '');

        // 2. Perform PATCH update on individual rule
        $url = "{$this->baseUrl}/zones/{$this->zoneId}/rulesets/{$this->rulesetId}/rules/{$this->ruleId}";
        if ($dryRun) {
            $url .= '?dry_run=true';
        }

        $payload = [
            'enabled' => $enabled,
        ];

        $response = Http::withToken($this->apiToken)
            ->timeout(15)
            ->acceptJson()
            ->patch($url, $payload);

        if (!$response->successful()) {
            $err = $response->json('errors.0.message') ?: "HTTP status {$response->status()}";
            Log::error('Cloudflare rule update failed', [
                'status' => $response->status(),
                'error' => $err,
            ]);
            throw new RuntimeException("Cloudflare update rejected: {$err}");
        }

        $resultRule = $response->json('result') ?: [];

        Log::info('Cloudflare Bangladesh storefront rule updated', [
            'rule_id' => $this->ruleId,
            'enabled' => $enabled,
            'dry_run' => $dryRun,
        ]);

        return [
            'success' => true,
            'enabled' => (bool) ($resultRule['enabled'] ?? $enabled),
            'rule' => $resultRule,
        ];
    }

    /**
     * Validate that the rule expression is specifically designed for Bangladesh storefront restriction.
     * Prevents accidental modification of unsafe or overly broad rules.
     */
    public function validateRuleExpression(string $expression): void
    {
        $normalized = strtolower($expression);

        // Must target Bangladesh
        if (!str_contains($normalized, 'ip.src.country eq "bd"') &&
            !str_contains($normalized, "ip.src.country eq 'bd'")) {
            throw new RuntimeException('Rule expression validation failed: Rule does not target ip.src.country "BD".');
        }

        // Must NOT be an unconditional or catch-all block
        if (!str_contains($normalized, 'http.request.uri.path') &&
            !str_contains($normalized, 'starts_with')) {
            throw new RuntimeException('Rule expression validation failed: Rule lacks route matching constraints.');
        }

        // Must NOT block admin (/ayc)
        if (str_contains($normalized, 'http.request.uri.path eq "/ayc"') ||
            str_contains($normalized, 'starts_with(http.request.uri.path, "/ayc")')) {
            throw new RuntimeException('Rule expression validation failed: Rule illegally targets Admin (/ayc) route.');
        }
    }

    /**
     * Validate that the rule response contains required fields and block action.
     */
    private function validateRuleStructure(array $rule): void
    {
        if (empty($rule['id']) || !isset($rule['enabled'])) {
            throw new RuntimeException('Invalid rule structure returned from Cloudflare API.');
        }

        if (isset($rule['action']) && strtolower((string) $rule['action']) !== 'block') {
            throw new RuntimeException('Target Cloudflare rule action is not "block". Expected a block action rule.');
        }
    }
}
