<?php

namespace App\Services\Shipping;

use App\Services\Shipping\Contracts\ShippingProviderInterface;

class ShippingManagerService
{
    protected AramexShippingService $aramexService;
    protected AkijSeaShippingService $akijService;

    public function __construct(
        AramexShippingService $aramexService,
        AkijSeaShippingService $akijService
    ) {
        $this->aramexService = $aramexService;
        $this->akijService = $akijService;
    }

    /**
     * Get Air Shipping Provider (Aramex)
     */
    public function getAirProvider(): ShippingProviderInterface
    {
        return $this->aramexService;
    }

    /**
     * Get Sea / Ocean Freight Provider (Akij Logistics)
     */
    public function getSeaProvider(): ShippingProviderInterface
    {
        return $this->akijService;
    }

    /**
     * Get configured company export origin
     */
    public function getOriginAddress(): array
    {
        return $this->aramexService->getOriginAddress();
    }

    /**
     * Get real-time & tariff quotes across all supported providers based on freight mode
     * 
     * @param array $destination [country_code, city, postal_code, line1]
     * @param array $shipmentSpecs [package_quantity, carton_count, carton_dimensions, gross_weight, net_weight, cbm]
     * @param float $goodsValue Goods declared commercial value in USD
     * @param string $mode 'all', 'air', or 'sea'
     * @return array Normalized list of quote options
     */
    public function getQuotes(
        array $destination,
        array $shipmentSpecs,
        float $goodsValue = 0.0,
        string $mode = 'all'
    ): array {
        $origin = $this->getOriginAddress();
        $quotes = [];

        // 1. AIR FREIGHT: Aramex Priority Express
        if ($mode === 'all' || $mode === 'air') {
            try {
                $airQuote = $this->aramexService->calculateQuote($origin, $destination, $shipmentSpecs, $goodsValue);
                $quotes[] = $airQuote;
            } catch (\Throwable $e) {
                $quotes[] = [
                    'is_available' => false,
                    'provider' => 'aramex',
                    'carrier' => 'Aramex',
                    'service_name' => 'Aramex Priority Parcel Express',
                    'mode' => 'air',
                    'error_message' => 'Air rate calculator unavailable for this destination.',
                    'amount' => null,
                    'currency' => 'USD',
                ];
            }
        }

        // 2. SEA FREIGHT: Akij Logistics Ocean Container Freight (Chattogram Sea Port)
        if ($mode === 'all' || $mode === 'sea') {
            try {
                $seaQuote = $this->akijService->calculateQuote($origin, $destination, $shipmentSpecs, $goodsValue);
                $quotes[] = $seaQuote;
            } catch (\Throwable $e) {
                $quotes[] = [
                    'is_available' => false,
                    'provider' => 'akij',
                    'carrier' => 'Akij Logistics',
                    'service_name' => 'Akij LCL Ocean Container Freight',
                    'mode' => 'sea',
                    'error_message' => 'Akij sea freight tariff calculation unavailable for this destination.',
                    'amount' => null,
                    'currency' => 'USD',
                ];
            }
        }

        return $quotes;
    }
}
