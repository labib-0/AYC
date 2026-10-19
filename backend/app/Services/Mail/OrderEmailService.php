<?php

namespace App\Services\Mail;

use App\Jobs\SendOrderConfirmationEmailJob;
use App\Jobs\SendOrderConfirmedEmailJob;
use App\Jobs\SendPaymentProofReceivedEmailJob;
use App\Models\Order;
use App\Models\OrderEmailDispatch;
use Illuminate\Support\Facades\Log;

class OrderEmailService
{
    /**
     * Queue the authoritative order confirmation email after database commit.
     *
     * @param Order $order The committed order
     * @return OrderEmailDispatch|null The created or existing dispatch record, or null if flag is disabled
     */
    public function queueOrderConfirmation(Order $order): ?OrderEmailDispatch
    {
        // Safe Production Default: If disabled, do not queue jobs
        if (!config('order.emails.enabled', false)) {
            Log::debug("OrderEmailService: ORDER_EMAILS_ENABLED is false. Suppression active for Order #{$order->order_number}.");
            return null;
        }

        $recipientEmail = trim((string) ($order->email ?? ''));

        // Atomic outbox record creation
        $dispatch = OrderEmailDispatch::firstOrCreate([
            'idempotency_key' => "order_confirmation_{$order->id}",
        ], [
            'order_id' => $order->id,
            'notification_type' => OrderEmailDispatch::TYPE_ORDER_CONFIRMATION,
            'recipient_email' => $recipientEmail,
            'recipient_name' => $order->shipping_name ?? $order->user?->name,
            'status' => OrderEmailDispatch::STATUS_PENDING,
            'attempts' => 0,
        ]);

        // Duplicate protection: Do not re-queue if already sent
        if ($dispatch->status === OrderEmailDispatch::STATUS_SENT) {
            Log::info("OrderEmailService: Order #{$order->order_number} confirmation already delivered. Skipping duplicate queue dispatch.");
            return $dispatch;
        }

        // Suppress dispatch if recipient email is empty or POS synthetic
        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $dispatch->markAsFailed('invalid_recipient', 'Customer email is missing or malformed.');
            return $dispatch;
        }

        if (str_ends_with(strtolower($recipientEmail), '@ayaan.local')) {
            $dispatch->markAsSkipped("POS walk-in synthetic account address ({$recipientEmail}).");
            return $dispatch;
        }

        // Mark as queued and dispatch to asynchronous worker after transaction commit
        $dispatch->markAsQueued();
        SendOrderConfirmationEmailJob::dispatch($order->id, $dispatch->id)->afterCommit();

        Log::info("OrderEmailService: Queued order confirmation notification for Order #{$order->order_number} (Dispatch ID {$dispatch->id}).");

        return $dispatch;
    }

    /**
     * Queue customer notification when payment proof is submitted and awaiting admin review.
     *
     * @param Order $order The order whose payment proof was persisted
     * @param string|null $receiptOriginalName The original filename of uploaded proof
     * @param string|null $paymentMethod Payment method submitted
     * @param string|null $submissionId Unique submission identifier (for per-submission deduplication)
     * @return OrderEmailDispatch|null
     */
    public function queuePaymentProofReceived(
        Order $order,
        ?string $receiptOriginalName = null,
        ?string $paymentMethod = null,
        ?string $submissionId = null
    ): ?OrderEmailDispatch {
        if (!config('order.emails.enabled', false)) {
            Log::debug("OrderEmailService: ORDER_EMAILS_ENABLED is false. Suppression active for Order #{$order->order_number} payment proof.");
            return null;
        }

        $recipientEmail = trim((string) ($order->email ?? ''));

        // Derive stable submission key for legitimate resubmission support
        $submissionKey = $submissionId ?: substr(md5(($order->payment_proof_url ?? '') . '_' . ($receiptOriginalName ?? '') . '_' . now()->toDateString()), 0, 16);
        $idempotencyKey = "payment_proof_{$order->id}_{$submissionKey}";

        $dispatch = OrderEmailDispatch::firstOrCreate([
            'idempotency_key' => $idempotencyKey,
        ], [
            'order_id' => $order->id,
            'notification_type' => OrderEmailDispatch::TYPE_PAYMENT_PROOF_RECEIVED,
            'recipient_email' => $recipientEmail,
            'recipient_name' => $order->shipping_name ?? $order->user?->name,
            'status' => OrderEmailDispatch::STATUS_PENDING,
            'attempts' => 0,
        ]);

        if ($dispatch->status === OrderEmailDispatch::STATUS_SENT) {
            Log::info("OrderEmailService: Order #{$order->order_number} payment proof notification already sent for key {$idempotencyKey}. Skipping duplicate.");
            return $dispatch;
        }

        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $dispatch->markAsFailed('invalid_recipient', 'Customer email is missing or malformed.');
            return $dispatch;
        }

        if (str_ends_with(strtolower($recipientEmail), '@ayaan.local')) {
            $dispatch->markAsSkipped("POS walk-in synthetic account address ({$recipientEmail}).");
            return $dispatch;
        }

        $dispatch->markAsQueued();
        SendPaymentProofReceivedEmailJob::dispatch(
            $order->id,
            $dispatch->id,
            $receiptOriginalName,
            $paymentMethod
        )->afterCommit();

        Log::info("OrderEmailService: Queued payment proof received notification for Order #{$order->order_number} (Dispatch ID {$dispatch->id}).");

        return $dispatch;
    }

    /**
     * Queue customer confirmation email when an administrator approves payment/order.
     *
     * @param Order $order The confirmed order
     * @return OrderEmailDispatch|null
     */
    public function queueOrderConfirmed(Order $order): ?OrderEmailDispatch
    {
        if (!config('order.emails.enabled', false)) {
            Log::debug("OrderEmailService: ORDER_EMAILS_ENABLED is false. Suppression active for Order #{$order->order_number} confirmation.");
            return null;
        }

        $recipientEmail = trim((string) ($order->email ?? ''));

        $dispatch = OrderEmailDispatch::firstOrCreate([
            'idempotency_key' => "order_confirmed_{$order->id}",
        ], [
            'order_id' => $order->id,
            'notification_type' => OrderEmailDispatch::TYPE_ORDER_CONFIRMED,
            'recipient_email' => $recipientEmail,
            'recipient_name' => $order->shipping_name ?? $order->user?->name,
            'status' => OrderEmailDispatch::STATUS_PENDING,
            'attempts' => 0,
        ]);

        if ($dispatch->status === OrderEmailDispatch::STATUS_SENT) {
            Log::info("OrderEmailService: Order #{$order->order_number} confirmed email already delivered. Skipping duplicate.");
            return $dispatch;
        }

        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $dispatch->markAsFailed('invalid_recipient', 'Customer email is missing or malformed.');
            return $dispatch;
        }

        if (str_ends_with(strtolower($recipientEmail), '@ayaan.local')) {
            $dispatch->markAsSkipped("POS walk-in synthetic account address ({$recipientEmail}).");
            return $dispatch;
        }

        $dispatch->markAsQueued();
        SendOrderConfirmedEmailJob::dispatch($order->id, $dispatch->id)->afterCommit();

        Log::info("OrderEmailService: Queued order confirmed notification for Order #{$order->order_number} (Dispatch ID {$dispatch->id}).");

        return $dispatch;
    }

    /**
     * Operator / Admin retry for a failed or stuck dispatch record.
     */
    public function retryDispatch(OrderEmailDispatch $dispatch): bool
    {
        if ($dispatch->status === OrderEmailDispatch::STATUS_SENT) {
            return false;
        }

        $dispatch->update([
            'status' => OrderEmailDispatch::STATUS_QUEUED,
            'error_category' => null,
            'error_message' => null,
        ]);

        match ($dispatch->notification_type) {
            OrderEmailDispatch::TYPE_PAYMENT_PROOF_RECEIVED => SendPaymentProofReceivedEmailJob::dispatch($dispatch->order_id, $dispatch->id),
            OrderEmailDispatch::TYPE_ORDER_CONFIRMED => SendOrderConfirmedEmailJob::dispatch($dispatch->order_id, $dispatch->id),
            default => SendOrderConfirmationEmailJob::dispatch($dispatch->order_id, $dispatch->id),
        };

        return true;
    }
}
