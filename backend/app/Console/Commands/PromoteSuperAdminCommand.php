<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Audit\ActivityLogger;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Console\Command;

/**
 * php artisan rbac:promote-super-admin {email}
 *
 * Safely promotes an existing admin account to Super Admin.
 * This is the ONLY authorized bootstrap path for Super Admin creation.
 *
 * Safety rules enforced:
 *  - Target must already be role = admin
 *  - Requires explicit confirmation unless --force is used
 *  - Logs the promotion to the audit trail
 *  - Does NOT modify any other user's is_super_admin
 *
 * To demote: php artisan rbac:promote-super-admin {email} --demote
 */
class PromoteSuperAdminCommand extends Command
{
    protected $signature = 'rbac:promote-super-admin
                            {email : Email address of the admin to promote}
                            {--demote : Demote this Super Admin back to normal admin}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Promote (or demote) an administrator to Super Admin authority';

    public function handle(AdminAuthorizationService $authorization): int
    {
        $email  = $this->argument('email');
        $demote = (bool) $this->option('demote');
        $action = $demote ? 'demote' : 'promote';

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User not found: {$email}");
            return self::FAILURE;
        }

        if (! $user->isAdmin()) {
            $this->error("User '{$email}' is not an administrator (role = {$user->role}). Only admins can be Super Admin.");
            return self::FAILURE;
        }

        if ($demote && ! $user->isSuperAdmin()) {
            $this->warn("User '{$email}' is not currently a Super Admin. Nothing to demote.");
            return self::SUCCESS;
        }

        if (! $demote && $user->isSuperAdmin()) {
            $this->info("User '{$email}' is already a Super Admin.");
            return self::SUCCESS;
        }

        // Safety check: prevent demoting the only Super Admin
        if ($demote) {
            $superAdminCount = User::where('is_super_admin', true)->where('role', 'admin')->count();
            if ($superAdminCount <= 1) {
                $this->error('Cannot demote the only Super Admin in the system. Promote another admin first.');
                return self::FAILURE;
            }
        }

        $confirmMessage = $demote
            ? "Demote '{$email}' from Super Admin to normal admin?"
            : "Promote '{$email}' to Super Admin? This grants unrestricted administrative authority.";

        if (! $this->option('force') && ! $this->confirm($confirmMessage)) {
            $this->info('Aborted.');
            return self::SUCCESS;
        }

        $before = ['is_super_admin' => $user->is_super_admin];
        $user->update(['is_super_admin' => ! $demote]);
        $after = ['is_super_admin' => $user->is_super_admin];

        // Invalidate permission cache for this user
        $authorization->invalidateUser($user);

        // Audit log
        ActivityLogger::log(
            $demote ? 'super_admin.demoted' : 'super_admin.promoted',
            $user,
            ['before' => $before, 'after' => $after, 'actor' => 'artisan_command'],
        );

        $verb = $demote ? 'demoted' : 'promoted';
        $this->info("✓ Successfully {$verb} '{$email}' as Super Admin.");

        return self::SUCCESS;
    }
}
