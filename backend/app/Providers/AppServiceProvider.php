<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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
        // Global API limiter
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
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
            return Limit::perMinute(5)->by($request->ip());
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
