<?php

namespace App\Services\Security;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;

/**
 * BangladeshStorefrontAccessService
 *
 * Orchestrates Bangladesh Customer Storefront IP restriction across
 * the active enforcement tiers:
 * 1. Origin Nginx GeoIP2 layer (active on production VPS)
 * 2. Cloudflare WAF Rulesets API (when configured via env credentials)
 */
class BangladeshStorefrontAccessService
{
    private const SCRIPT_PATH = '/usr/local/bin/toggle-bd-storefront';
    private const NGINX_CONF_PATH = '/etc/nginx/conf.d/bd_block_status.conf';
    private const SETTING_KEY = 'bangladesh_storefront_blocked';

    public function __construct(
        private readonly CloudflareSecurityService $cloudflareService
    ) {}

    /**
     * Retrieve the authoritative real-time state of the Bangladesh storefront restriction.
     *
     * @return array
     */
    public function getStatus(): array
    {
        $cfConfigured = $this->cloudflareService->isConfigured();
        $cfRuleState = null;

        if ($cfConfigured) {
            $cfRuleState = $this->cloudflareService->getStorefrontRule();
        }

        // Determine Origin Nginx state
        $originEnabled = $this->readOriginNginxState();

        // Authoritative enabled state:
        // If Cloudflare is configured, both should match, but Origin Nginx is the final gateway
        $enabled = $cfConfigured && isset($cfRuleState['enabled'])
            ? (bool) $cfRuleState['enabled']
            : $originEnabled;

        $layer = 'origin_nginx_geoip2';
        if ($cfConfigured) {
            $layer = 'dual_layer';
        }

        return [
            'enabled' => $enabled,
            'status' => $enabled ? 'blocked' : 'accessible',
            'display_label' => $enabled
                ? 'Storefront blocked in Bangladesh'
                : 'Storefront accessible in Bangladesh',
            'helper_text' => 'Block customer storefront access from Bangladesh IP addresses.',
            'enforcement_layer' => $layer,
            'origin_nginx_active' => $originEnabled,
            'cloudflare_configured' => $cfConfigured,
            'cloudflare_rule' => $cfRuleState,
            'error' => $cfRuleState['error'] ?? null,
            'updated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Update the Bangladesh storefront restriction across all active tiers.
     *
     * @param bool $enabled True = Blocked in BD (ON), False = Accessible in BD (OFF)
     * @param User|null $user The admin performing the modification
     * @return array The updated authoritative state
     */
    public function setEnabled(bool $enabled, ?User $user = null): array
    {
        $previousState = $this->getStatus();
        $previousEnabled = $previousState['enabled'];

        $cfUpdated = false;
        $cfResult = null;

        // 1. Cloudflare Tier: Enforce and update Cloudflare rule if configured
        if ($this->cloudflareService->isConfigured()) {
            try {
                $cfResult = $this->cloudflareService->updateStorefrontRule($enabled);
                $cfUpdated = true;
            } catch (\Throwable $e) {
                Log::error('Cloudflare rule update failed during toggle', [
                    'error' => $e->getMessage(),
                    'requested_enabled' => $enabled,
                ]);
                throw new RuntimeException("Cloudflare update failed: " . $e->getMessage());
            }
        } else {
            Log::info('Cloudflare API credentials not configured in environment; managing active origin Nginx GeoIP2 tier');
        }

        // 2. Origin Nginx Tier: Update active reverse-proxy restriction
        $nginxUpdated = $this->setOriginNginxState($enabled);

        // 3. Database SystemSetting persistence
        SystemSetting::set(self::SETTING_KEY, $enabled, 'boolean', 'security');

        // 4. Audit Trail Recording (Section 17: BANGLADESH_STOREFRONT_BLOCK)
        ActivityLogger::log(
            action: 'BANGLADESH_STOREFRONT_BLOCK',
            subject: null,
            metadata: [
                'setting' => 'BANGLADESH_STOREFRONT_ACCESS',
                'action' => $enabled ? 'ENABLED' : 'DISABLED',
                'status' => $enabled ? 'blocked' : 'accessible',
                'previous_enabled' => $previousEnabled,
                'new_enabled' => $enabled,
                'enforcement_layer' => $this->cloudflareService->isConfigured() ? 'dual_layer' : 'origin_nginx_geoip2',
                'cloudflare_updated' => $cfUpdated,
                'origin_nginx_updated' => $nginxUpdated,
                'changed_by' => $user?->email ?? 'System',
                'timestamp' => now()->toIso8601String(),
            ],
            user: $user
        );

        Log::info('Bangladesh storefront access state changed', [
            'action' => $enabled ? 'ENABLED' : 'DISABLED',
            'user' => $user?->email ?? 'anonymous',
            'origin_nginx_updated' => $nginxUpdated,
            'cloudflare_updated' => $cfUpdated,
        ]);

        // 5. Re-fetch and return the verified real state
        return $this->getStatus();
    }

    /**
     * Read the active Origin Nginx GeoIP2 restriction state.
     */
    private function readOriginNginxState(): bool
    {
        // Method A: Check Nginx config file directly if readable
        if (file_exists(self::NGINX_CONF_PATH) && is_readable(self::NGINX_CONF_PATH)) {
            $conf = file_get_contents(self::NGINX_CONF_PATH);
            if (str_contains($conf, 'default 1;')) {
                return true;
            }
            if (str_contains($conf, 'default 0;')) {
                return false;
            }
        }

        // Method B: Run status script via sudo
        if (file_exists(self::SCRIPT_PATH)) {
            try {
                $process = Process::run(['sudo', self::SCRIPT_PATH, 'status']);
                if ($process->successful()) {
                    $out = trim($process->output());
                    return $out === 'on';
                }
            } catch (\Throwable $e) {
                Log::debug('Failed to read status via script', ['error' => $e->getMessage()]);
            }
        }

        // Method C: Fall back to SystemSetting
        return (bool) SystemSetting::get(self::SETTING_KEY, true);
    }

    /**
     * Update the active Origin Nginx GeoIP2 restriction state.
     */
    private function setOriginNginxState(bool $enabled): bool
    {
        $action = $enabled ? 'on' : 'off';

        if (file_exists(self::SCRIPT_PATH)) {
            try {
                $process = Process::run(['sudo', self::SCRIPT_PATH, $action]);
                if ($process->successful()) {
                    return true;
                }

                Log::error('Nginx toggle script failed', [
                    'exit_code' => $process->exitCode(),
                    'error' => $process->errorOutput(),
                    'output' => $process->output(),
                ]);
            } catch (\Throwable $e) {
                Log::error('Exception running Nginx toggle script', ['error' => $e->getMessage()]);
            }
        }

        // In environments without the script (e.g. local dev), setting is recorded in DB
        return false;
    }
}
