<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subtotal = (float) $this->subtotal;
        $shippingCost = (float) $this->shipping_cost;
        $taxAmount = (float) $this->tax_amount;
        $otherCharges = (float) ($this->other_charges ?? 0.0);
        $discountAmount = (float) $this->discount_amount;
        $totalAmount = (float) $this->total_amount;

        return [
            'id' => (string) $this->id,
            'order_number' => $this->order_number,
            'user_id' => $this->user_id ? (string) $this->user_id : null,
            'status' => $this->status ?: 'pending',
            'payment_status' => $this->payment_status ?: 'pending',
            'fulfillment_status' => $this->fulfillment_status ?: 'unfulfilled',
            'currency' => $this->currency ?: 'USD',
            'goods_value' => $subtotal,
            'subtotal' => $subtotal,
            'subtotal_cents' => (int) round($subtotal * 100),
            'shipping_cost' => $shippingCost,
            'shipping_cents' => (int) round($shippingCost * 100),
            'tax_amount' => $taxAmount,
            'tax_cents' => (int) round($taxAmount * 100),
            'other_charges' => $otherCharges,
            'other_charges_cents' => (int) round($otherCharges * 100),
            'discount_amount' => $discountAmount,
            'discount_cents' => (int) round($discountAmount * 100),
            'total_amount' => $totalAmount,
            'total_cents' => (int) round($totalAmount * 100),
            'email' => $this->email,
            'shipping_name' => $this->shipping_name,
            'shipping_phone' => $this->shipping_phone,
            'shipping_address1' => $this->shipping_address1,
            'shipping_address2' => $this->shipping_address2,
            'shipping_city' => $this->shipping_city,
            'shipping_region' => $this->shipping_region,
            'shipping_postal_code' => $this->shipping_postal_code,
            'shipping_country_code' => $this->shipping_country_code ?: 'US',
            'shipping_method' => $this->shipping_method,
            'carrier' => $this->carrier,
            'tracking_number' => $this->tracking_number,
            'shipment_id' => $this->shipment_id,
            'shipment_reference' => $this->shipment_reference,
            'shipment_label_url' => $this->shipment_label_url,
            'carrier_status' => $this->carrier_status,
            'last_carrier_update' => $this->last_carrier_update?->toISOString(),
            'last_shipment_error' => $this->last_shipment_error,
            'shipping_quote_id' => $this->shipping_quote_id,
            'shipping_snapshot' => $this->shipping_snapshot,
            'direct_tracking_url' => $this->getDirectTrackingUrl(),
            'can_create_aramex_shipment' => $this->canCreateAramexShipment(),
            'billing_address' => $this->billing_address,
            'payment_method' => $this->payment_method ?: 'card',
            'payment_proof_url' => $this->payment_proof_url,
            'notes' => $this->notes,
            'payment_details' => $this->when($this->payment_details !== null, function () use ($request) {
                if (!$request->user() || $request->user()->role !== 'admin') {
                    $details = is_array($this->payment_details) ? $this->payment_details : json_decode($this->payment_details, true);
                    if (is_array($details)) {
                        unset($details['confirmed_by_id']);
                    }
                    return $details;
                }
                return $this->payment_details;
            }),
            'payment_confirmed_at' => $this->payment_confirmed_at?->toISOString(),
            'payment_confirmed_by' => $this->when($request->user()?->role === 'admin', fn () => $this->payment_confirmed_by ? (string) $this->payment_confirmed_by : null),
            'placed_at' => $this->placed_at?->toISOString() ?: $this->created_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'status_events' => $this->whenLoaded('statusEvents', function () {
                return $this->statusEvents->map(function ($event) {
                    return [
                        'id' => (string) $event->id,
                        'order_id' => (string) $event->order_id,
                        'user_id' => $event->user_id ? (string) $event->user_id : null,
                        'event_type' => $event->event_type,
                        'message' => $event->message,
                        'created_at' => $event->created_at?->toISOString(),
                    ];
                });
            }),
            'payments' => $this->whenLoaded('payments', function () {
                return $this->payments->map(function ($payment) {
                    return [
                        'id' => (string) $payment->id,
                        'order_id' => (string) $payment->order_id,
                        'customer_id' => $payment->customer_id ? (string) $payment->customer_id : null,
                        'transaction_id' => $payment->transaction_id,
                        'provider' => $payment->provider,
                        'payment_method' => $payment->payment_method ?: $payment->provider,
                        'amount' => (float) $payment->amount,
                        'currency' => $payment->currency ?: 'USD',
                        'status' => $payment->status,
                        'payer_name' => $payment->payer_name,
                        'bank_name' => $payment->bank_name,
                        'account_number' => $payment->account_number,
                        'payment_date' => $payment->payment_date?->format('Y-m-d') ?: null,
                        'notes' => $payment->notes,
                        'receipt_url' => $payment->receipt_url,
                        'receipt_original_name' => $payment->receipt_original_name,
                        'receipt_mime_type' => $payment->receipt_mime_type,
                        'submitted_at' => $payment->submitted_at?->toISOString(),
                        'confirmed_at' => $payment->confirmed_at?->toISOString(),
                        'created_at' => $payment->created_at?->toISOString(),
                    ];
                });
            }),
        ];
    }
}
