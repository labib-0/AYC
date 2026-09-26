<?php

namespace App\Services\Audit;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class ActivityLogger
{
    /**
     * Log a business or administrative action.
     *
     * @param string $action e.g. 'product.updated', 'admin.login', 'quotation.status_changed'
     * @param Model|null $subject The entity affected
     * @param array|null $metadata Contextual changes (old vs new, reason, notes)
     * @param User|null $user The user performing the action (defaults to authenticated user)
     */
    public static function log(
        string $action,
        ?Model $subject = null,
        ?array $metadata = null,
        ?User $user = null
    ): ?Activity {
        try {
            $currentUser = $user ?: auth('sanctum')->user() ?: auth()->user();
            $request = request();

            // Sanitize metadata: remove passwords, tokens, API keys
            $sanitizedMetadata = self::sanitizeMetadata($metadata);

            return Activity::create([
                'user_id' => $currentUser?->id,
                'action' => $action,
                'subject_type' => $subject ? get_class($subject) : null,
                'subject_id' => $subject ? (string) $subject->getKey() : null,
                'metadata' => $sanitizedMetadata,
                'ip_address' => $request ? $request->ip() : null,
                'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Activity logging must never fail the underlying transaction
            Log::error('Failed to record activity log', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Remove sensitive authentication or secret fields from audit metadata.
     */
    protected static function sanitizeMetadata(?array $metadata): ?array
    {
        if (!$metadata) {
            return null;
        }

        $sensitiveKeys = ['password', 'password_confirmation', 'token', 'access_token', 'secret', 'remember_token', 'api_key'];

        array_walk_recursive($metadata, function (&$value, $key) use ($sensitiveKeys) {
            if (in_array(strtolower($key), $sensitiveKeys, true)) {
                $value = '[REDACTED]';
            }
        });

        return $metadata;
    }
}
