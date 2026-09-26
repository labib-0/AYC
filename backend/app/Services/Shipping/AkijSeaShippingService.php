<?php

namespace App\Services\Shipping;

use App\Models\Order;
use App\Models\OrderStatusEvent;
use App\Services\Shipping\Contracts\ShippingProviderInterface;
use Illuminate\Support\Facades\Config;

/**
 * Akij Logistics Sea & Ocean Freight Service Provider
 * 
 * Provides Ocean Freight (LCL / FCL Container) quotation, routing via Chattogram Sea Port (CGP),
 * and freight forwarding integration with Akij Logistics (Akij Freight Forwarding & Ocean Logistics Ltd).
 * Note: Akij operates international maritime and freight forwarding services on spot rates and tariff schedules;
 * this service integrates authoritative export tariff matrices and admin quotation workflows.
 */
class AkijSeaShippingService implements ShippingProviderInterface
{
    protected array $config;

    public function __construct()
    {
        $this->config = Config::get('services.akij_logistics', [
            'enabled' => true,
            'carrier_name' => 'Akij Logistics',
            'service_name' => 'Akij LCL Ocean Container Freight',
            'division' => 'Akij Freight Forwarding & Ocean Logistics Ltd.',
            'port_of_loading' => 'Chattogram Sea Port (CGP), Bangladesh',
            'contact_email' => 'freight@akijlogistics.com',
            'contact_phone' => '+880 9612 888 888',
            'default_validity_days' => 30,
            'rates' => [
                'base_export_fee' => 50.00,
                'cbm_rates' => [
                    'US' => 180.00,
                    'CA' => 185.00,
                    'GB' => 150.00,
                    'DE' => 150.00,
                    'FR' => 150.00,
                    'IT' => 155.00,
                    'NL' => 150.00,
                    'ES' => 155.00,
                    'AE' => 130.00,
                    'SA' => 140.00,
                    'AU' => 175.00,
                    'DEFAULT' => 200.00,
                ],
                'min_billable_cbm' => 1.0,
            ],
        ]);
    }

    public function getProviderName(): string
    {
        return 'akij';
    }

    public function getCarrierName(): string
    {
        return $this->config['carrier_name'] ?? 'Akij Logistics';
    }

    public function getSupportedMode(): string
    {
        return 'sea';
    }

    /**
     * Calculate Sea Freight quote based on authoritative physical packaging specifications
     */
    public function calculateQuote(
        array $origin,
        array $destination,
        array $shipmentSpecs,
        float $goodsValue = 0.0
    ): array {
        $cbm = max(0.001, (float) ($shipmentSpecs['total_cbm'] ?? $shipmentSpecs['cbm'] ?? 0.1));
        $grossWeight = max(1.0, (float) ($shipmentSpecs['gross_weight'] ?? 10.0));
        $netWeight = isset($shipmentSpecs['net_weight']) ? (float) $shipmentSpecs['net_weight'] : round($grossWeight * 0.9, 2);
        $cartonCount = max(1, (int) ($shipmentSpecs['carton_count'] ?? 1));
        $countryCode = strtoupper(trim($destination['country_code'] ?? 'US'));

        $ratesConfig = $this->config['rates'] ?? [];
        $minCbm = (float) ($ratesConfig['min_billable_cbm'] ?? 1.0);
        $baseFee = (float) ($ratesConfig['base_export_fee'] ?? 50.00);
        $cbmRates = $ratesConfig['cbm_rates'] ?? [];

        $ratePerCbm = $cbmRates[$countryCode] ?? ($cbmRates['DEFAULT'] ?? 200.00);
        $billableCbm = max($minCbm, $cbm);

        // Standard Ocean LCL Billing: (Billable CBM * Port Rate) + Terminal Documentation Fee
        $freightAmount = round(($billableCbm * $ratePerCbm) + $baseFee, 2);

        $quoteReference = 'QT-AKJ-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
        $now = now();
        $validityDays = (int) ($this->config['default_validity_days'] ?? 30);

        return [
            'is_available' => true,
            'provider' => 'akij',
            'quote_id' => $quoteReference,
            'carrier' => $this->getCarrierName(),
            'service_name' => $this->config['service_name'] ?? 'Akij LCL Ocean Container Freight',
            'division' => $this->config['division'] ?? 'Akij Freight Forwarding & Ocean Logistics Ltd.',
            'mode' => 'sea',
            'amount' => $freightAmount,
            'currency' => 'USD',
            'estimated_days' => '25-35 business days',
            'gross_weight' => $grossWeight,
            'net_weight' => $netWeight,
            'chargeable_weight' => $billableCbm * 1000.0, // Standard 1 CBM = 1,000 KG maritime freight rule
            'weight_unit' => 'KG',
            'carton_count' => $cartonCount,
            'cbm' => $cbm,
            'billable_cbm' => $billableCbm,
            'rate_per_cbm' => $ratePerCbm,
            'port_of_loading' => $this->config['port_of_loading'] ?? 'Chattogram Sea Port (CGP), Bangladesh',
            'destination_country' => $countryCode,
            'is_provisional' => true,
            'requires_quote' => false,
            'notes' => 'Port-to-Port / DAP Ocean LCL container freight via Akij Logistics. Final bill of lading issued upon vessel departure from Chattogram Port.',
            'quoted_at' => $now->toIso8601String(),
            'expires_at' => $now->copy()->addDays($validityDays)->toIso8601String(),
        ];
    }

    /**
     * Update order with authoritative Akij sea freight quote from admin or logistics rep
     */
    public function updateOrderFreightQuote(Order $order, array $quoteData): Order
    {
        $amount = (float) ($quoteData['amount'] ?? 0.0);
        $reference = trim($quoteData['quote_reference'] ?? ('QT-AKJ-' . strtoupper(substr(md5(uniqid()), 0, 8))));
        $notes = trim($quoteData['notes'] ?? 'Akij Sea Freight Quote Confirmed');
        $validUntil = $quoteData['valid_until'] ?? now()->addDays(30)->toDateString();

        $existingSnapshot = is_array($order->shipping_snapshot) ? $order->shipping_snapshot : [];

        $updatedSnapshot = array_merge($existingSnapshot, [
            'provider' => 'akij',
            'carrier' => $this->getCarrierName(),
            'shipping_method' => $this->config['service_name'] ?? 'Akij LCL Ocean Container Freight',
            'mode' => 'sea',
            'quoted_shipping_charge' => $amount,
            'currency' => 'USD',
            'quote_reference_id' => $reference,
            'quoted_at' => now()->toIso8601String(),
            'valid_until' => $validUntil,
            'is_provisional' => false,
            'port_of_loading' => $this->config['port_of_loading'] ?? 'Chattogram Sea Port (CGP), Bangladesh',
            'notes' => $notes,
        ]);

        $subtotal = (float) $order->subtotal;
        $tax = (float) $order->tax_amount;
        $other = (float) $order->other_charges;
        $discount = (float) $order->discount_amount;
        $newTotal = round($subtotal + $amount + $tax + $other - $discount, 2);

        $order->update([
            'carrier' => $this->getCarrierName(),
            'shipping_method' => $this->config['service_name'] ?? 'Akij LCL Ocean Container Freight',
            'shipping_cost' => $amount,
            'shipping_quote_id' => $reference,
            'shipping_snapshot' => $updatedSnapshot,
            'total_amount' => $newTotal,
        ]);

        OrderStatusEvent::create([
            'order_id' => $order->id,
            'user_id' => auth()->id(),
            'event_type' => 'sea_quote_updated',
            'message' => "Akij Sea Freight quote updated: \${$amount} USD (Ref: {$reference})",
        ]);

        return $order->fresh();
    }
}
