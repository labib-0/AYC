<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind AdminAuthorizationService as a singleton so permission caches
        // are reused within the same request lifecycle.
        $this->app->singleton(AdminAuthorizationService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production') || request()->isSecure()) {
            URL::forceScheme('https');
        }

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
            return "{$frontendUrl}/reset-password?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });

        // System-role Gates (preserved from original architecture)
        Gate::define('admin',    fn (User $user) => $user->isAdmin());
        Gate::define('customer', fn (User $user) => $user->isCustomer());

        // RBAC Gates — layer 2 (on top of the role gate)
        Gate::define('super_admin', fn (User $user) => $user->isSuperAdmin());

        // Generic permission gate: Gate::allows('can_permission', 'product.publish')
        Gate::define('can_permission', function (User $user, string $permissionSlug) {
            /** @var AdminAuthorizationService $authz */
            $authz = app(AdminAuthorizationService::class);
            return $authz->can($user, $permissionSlug);
        });

        // ── API Rate Limiters ─────────────────────────────────────────────
        $this->configureRateLimiting();
    }

    /**
     * Configure the custom rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // Secure verification for internal Next.js SSR requests:
        // 1. Must be from an internal loopback or host address
        // 2. INTERNAL_API_SECRET must be configured and non-empty (min 16 chars)
        // 3. X-Internal-Secret header must match via constant-time hash_equals()
        // If the secret is missing or empty, NO request can ever be exempted.
        $isInternalTrusted = function (Request $request): bool {
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
        };

        // Global API default limiter (120/min per user or IP; unmetered only for verified internal SSR)
        RateLimiter::for('api', function (Request $request) use ($isInternalTrusted) {
            if ($isInternalTrusted($request)) {
                return Limit::none();
            }
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Dedicated search suggestions limiter (60/min per IP)
        RateLimiter::for('search-suggestions', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // Dedicated product catalog browsing limiter (120/min; unmetered only for verified internal SSR)
        RateLimiter::for('products-browse', function (Request $request) use ($isInternalTrusted) {
            if ($isInternalTrusted($request)) {
                return Limit::none();
            }
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Dedicated commercial document PDF generation/download limiter (15/min per user or IP)
        RateLimiter::for('documents-pdf', function (Request $request) {
            return Limit::perMinute(15)->by($request->user()?->id ?: $request->ip());
        });

        // Dedicated cart mutation limiter (60/min per user or IP)
        RateLimiter::for('cart-mutations', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Dedicated payment proof upload limiter (10/min per user or IP)
        RateLimiter::for('payment-proof-upload', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        // Dedicated administrator login limiter (5/min per email + IP)
        RateLimiter::for('admin-login', function (Request $request) {
            $email = (string) $request->input('email', '');
            return Limit::perMinute(5)->by(strtolower($email) . '|' . $request->ip());
        });

        // Authentication limits
        RateLimiter::for('auth-login', function (Request $request) {
            $email = (string) $request->input('email', '');
            return Limit::perMinute(10)->by(strtolower($email) . '|' . $request->ip());
        });

        RateLimiter::for('auth-register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('password-reset', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', '')));
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perHour(5)->by($email ?: $request->ip()),
            ];
        });

        // Email Verification limits
        RateLimiter::for('verification-resend', function (Request $request) {
            $key = $request->user()?->id ?: (string) $request->input('email', $request->ip());
            return Limit::perMinute(3)->by($key);
        });

        RateLimiter::for('verification-verify', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // B2B & Purchasing limits
        RateLimiter::for('rfq-create', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('rfq-message', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('checkout-order', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('coupons-validate', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('quotation-action', function (Request $request) {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });
    }
}
