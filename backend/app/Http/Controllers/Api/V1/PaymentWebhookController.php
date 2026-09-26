<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Order;
use App\Models\OrderStatusEvent;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentWebhookController extends ApiController
{
    /**
     * POST /api/v1/payments/webhook
     * Handles payment provider asynchronous webhooks (e.g. Stripe, PayPal)
     */
    public function handle(Request $request): JsonResponse
    {
        // 1. Signature Verification (when webhook secret is configured)
        $webhookSecret = config('services.stripe.webhook_secret') ?? env('STRIPE_WEBHOOK_SECRET') ?? env('PAYMENT_WEBHOOK_SECRET');
        if ($webhookSecret) {
            $headerSignature = $request->header('Stripe-Signature') ?? $request->header('X-Webhook-Signature');
            if (!$headerSignature) {
                return $this->forbidden('Missing webhook signature');
            }

            $rawContent = $request->getContent();
            $computedHash = hash_hmac('sha256', $rawContent, $webhookSecret);

            $isValid = hash_equals($computedHash, $headerSignature) || str_contains($headerSignature, $computedHash);
            if (!$isValid) {
                return $this->forbidden('Invalid webhook signature');
            }
        }

        $eventType = $request->input('event') ?? $request->input('type') ?? 'payment.succeeded';
        $transactionId = $request->input('transaction_id') ?? $request->input('data.object.id');
        $orderNumber = $request->input('order_number') ?? $request->input('data.object.metadata.order_number');
        $amount = $request->input('amount') ?? $request->input('data.object.amount');

        if (!$orderNumber && !$transactionId) {
            return $this->error('Missing order or transaction identifier', 400);
        }


        $order = Order::where('order_number', $orderNumber)->first();
        if (!$order && $transactionId) {
            $payment = Payment::where('transaction_id', $transactionId)->first();
            $order = $payment?->order;
        }

        if (!$order) {
            return $this->notFound('Order not found for webhook');
        }

        DB::transaction(function () use ($order, $eventType, $transactionId, $amount, $request) {
            if ($eventType === 'payment.succeeded' || $eventType === 'charge.succeeded' || $eventType === 'payment_intent.succeeded') {
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'payment_status' => 'paid',
                        'status' => 'processing',
                    ]);

                    Payment::updateOrCreate(
                        ['order_id' => $order->id],
                        [
                            'transaction_id' => $transactionId ?: ('txn_' . uniqid()),
                            'provider' => 'stripe',
                            'amount' => $amount ? ($amount / 100) : $order->total_amount,
                            'currency' => $order->currency,
                            'status' => 'succeeded',
                            'payload' => $request->all(),
                        ]
                    );

                    OrderStatusEvent::create([
                        'order_id' => $order->id,
                        'user_id' => $order->user_id,
                        'event_type' => 'payment_succeeded',
                        'message' => 'Payment confirmed via webhook callback.',
                    ]);
                }
            } elseif ($eventType === 'payment.failed' || $eventType === 'charge.failed') {
                $order->update(['payment_status' => 'failed']);

                Payment::updateOrCreate(
                    ['order_id' => $order->id],
                    [
                        'transaction_id' => $transactionId ?: ('txn_' . uniqid()),
                        'status' => 'failed',
                        'payload' => $request->all(),
                    ]
                );

                OrderStatusEvent::create([
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'event_type' => 'payment_failed',
                    'message' => 'Payment transaction failed or declined.',
                ]);
            }
        });

        return $this->success(null, 'Webhook processed successfully');
    }
}
