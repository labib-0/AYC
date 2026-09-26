<?php

namespace App\Services\Shipping\Contracts;

interface ShippingProviderInterface
{
    /**
     * Get unique provider identifier (e.g., 'aramex', 'akij')
     */
    public function getProviderName(): string;

    /**
     * Get commercial carrier display name (e.g., 'Aramex', 'Akij Logistics')
     */
    public function getCarrierName(): string;

    /**
     * Get primary freight mode (e.g., 'air', 'sea')
     */
    public function getSupportedMode(): string;

    /**
     * Calculate normalized freight quote based on authoritative physical packaging specifications
     */
    public function calculateQuote(
        array $origin,
        array $destination,
        array $shipmentSpecs,
        float $goodsValue = 0.0
    ): array;
}
