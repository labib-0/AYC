<?php

namespace App\Services\Notification;

use App\Models\Quote;
use App\Models\User;
use App\Notifications\AdminRfqReceivedNotification;
use App\Notifications\RfqApprovedNotification;
use App\Notifications\RfqCreatedNotification;
use App\Notifications\RfqRejectedNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class RfqNotificationService
{
    /**
     * Notify customer and administrators upon new RFQ submission after transaction commit.
     */
    public function notifySubmission(Quote $rfq): void
    {
        DB::afterCommit(function () use ($rfq) {
            try {
                $this->sendCustomerSubmissionConfirmation($rfq);
                $this->sendAdminNewRfqAlert($rfq);
            } catch (\Throwable $e) {
                Log::error("Failed to dispatch RFQ submission notifications: " . $e->getMessage(), [
                    'rfq_id' => $rfq->id,
                    'rfq_number' => $rfq->rfq_number,
                    'exception' => $e,
                ]);
            }
        });
    }

    /**
     * Notify customer when RFQ is approved by administration after transaction commit.
     */
    public function notifyApproval(Quote $rfq, ?string $approvalNote = null): void
    {
        DB::afterCommit(function () use ($rfq, $approvalNote) {
            try {
                $customerEmail = $this->resolveCustomerEmail($rfq);
                if (!$this->isValidCustomerEmail($customerEmail)) {
                    Log::info("Skipping customer approval email: no valid customer email for RFQ {$rfq->rfq_number}");
                    return;
                }

                // Idempotency: prevent duplicate approval notification
                $cacheKey = "rfq_notified_approval_{$rfq->id}";
                if (!Cache::add($cacheKey, true, now()->addHours(24))) {
                    Log::info("Skipping duplicate RFQ approval notification for {$rfq->rfq_number}");
                    return;
                }

                $notifiable = $rfq->user && strtolower($rfq->user->email) === strtolower($customerEmail)
                    ? $rfq->user
                    : Notification::route('mail', $customerEmail);

                $notifiable->notify(new RfqApprovedNotification($rfq, $approvalNote));

                Log::info("Dispatched RFQ approval notification for {$rfq->rfq_number} to {$customerEmail}");
            } catch (\Throwable $e) {
                Log::error("Failed to dispatch RFQ approval notification: " . $e->getMessage(), [
                    'rfq_id' => $rfq->id,
                    'rfq_number' => $rfq->rfq_number,
                    'exception' => $e,
                ]);
            }
        });
    }

    /**
     * Notify customer when RFQ is rejected by administration after transaction commit.
     */
    public function notifyRejection(Quote $rfq, ?string $rejectionReason = null): void
    {
        DB::afterCommit(function () use ($rfq, $rejectionReason) {
            try {
                $customerEmail = $this->resolveCustomerEmail($rfq);
                if (!$this->isValidCustomerEmail($customerEmail)) {
                    Log::info("Skipping customer rejection email: no valid customer email for RFQ {$rfq->rfq_number}");
                    return;
                }

                // Idempotency: prevent duplicate rejection notification
                $cacheKey = "rfq_notified_rejection_{$rfq->id}";
                if (!Cache::add($cacheKey, true, now()->addHours(24))) {
                    Log::info("Skipping duplicate RFQ rejection notification for {$rfq->rfq_number}");
                    return;
                }

                $notifiable = $rfq->user && strtolower($rfq->user->email) === strtolower($customerEmail)
                    ? $rfq->user
                    : Notification::route('mail', $customerEmail);

                $notifiable->notify(new RfqRejectedNotification($rfq, $rejectionReason));

                Log::info("Dispatched RFQ rejection notification for {$rfq->rfq_number} to {$customerEmail}");
            } catch (\Throwable $e) {
                Log::error("Failed to dispatch RFQ rejection notification: " . $e->getMessage(), [
                    'rfq_id' => $rfq->id,
                    'rfq_number' => $rfq->rfq_number,
                    'exception' => $e,
                ]);
            }
        });
    }

    /**
     * Send submission confirmation to the buyer.
     */
    protected function sendCustomerSubmissionConfirmation(Quote $rfq): void
    {
        $customerEmail = $this->resolveCustomerEmail($rfq);
        if (!$this->isValidCustomerEmail($customerEmail)) {
            Log::info("Skipping customer submission confirmation: no valid email address for RFQ {$rfq->rfq_number}");
            return;
        }

        $cacheKey = "rfq_notified_submission_{$rfq->id}";
        if (!Cache::add($cacheKey, true, now()->addHours(24))) {
            Log::info("Skipping duplicate customer submission confirmation for {$rfq->rfq_number}");
            return;
        }

        $notifiable = $rfq->user && strtolower($rfq->user->email) === strtolower($customerEmail)
            ? $rfq->user
            : Notification::route('mail', $customerEmail);

        $notifiable->notify(new RfqCreatedNotification($rfq));

        Log::info("Dispatched RFQ submission confirmation for {$rfq->rfq_number} to {$customerEmail}");
    }

    /**
     * Send new RFQ inquiry alert to configured administrators.
     */
    protected function sendAdminNewRfqAlert(Quote $rfq): void
    {
        $recipients = $this->getAdminRecipients();

        if (empty($recipients)) {
            Log::info("No administrator recipients configured for RFQ notifications. Configure RFQ_ADMIN_EMAILS in .env.");
            return;
        }

        $cacheKey = "rfq_notified_admin_alert_{$rfq->id}";
        if (!Cache::add($cacheKey, true, now()->addHours(24))) {
            Log::info("Skipping duplicate admin RFQ alert for {$rfq->rfq_number}");
            return;
        }

        foreach ($recipients as $adminEmail) {
            Notification::route('mail', $adminEmail)->notify(new AdminRfqReceivedNotification($rfq));
            Log::info("Dispatched new RFQ alert for {$rfq->rfq_number} to admin {$adminEmail}");
        }
    }

    /**
     * Resolve the most accurate customer email from RFQ or user record.
     */
    public function resolveCustomerEmail(Quote $rfq): ?string
    {
        $email = $rfq->buyer_email ?: $rfq->user?->email;
        return $email ? trim($email) : null;
    }

    /**
     * Verify whether an email address is valid, non-empty, and realistic.
     */
    public function isValidCustomerEmail(?string $email): bool
    {
        if (empty($email)) {
            return false;
        }

        $email = trim(strtolower($email));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        // Reject synthetic or placeholder domains
        $domain = substr(strrchr($email, "@"), 1);
        $syntheticDomains = ['example.com', 'example.org', 'example.net', 'test.local', 'invalid', 'localhost'];
        if (in_array($domain, $syntheticDomains, true)) {
            return false;
        }

        return true;
    }

    /**
     * Load authorized administrative recipient email addresses from configuration.
     *
     * @return list<string>
     */
    public function getAdminRecipients(): array
    {
        $raw = config('mail.admin_recipients', env('RFQ_ADMIN_EMAILS', env('ADMIN_NOTIFICATION_EMAIL', '')));

        if (empty($raw)) {
            return [];
        }

        $candidates = preg_split('/[,;]+/', (string) $raw, -1, PREG_SPLIT_NO_EMPTY);
        $recipients = [];

        foreach ($candidates as $candidate) {
            $candidate = trim(strtolower($candidate));
            if (filter_var($candidate, FILTER_VALIDATE_EMAIL)) {
                $recipients[] = $candidate;
            }
        }

        return array_values(array_unique($recipients));
    }
}
