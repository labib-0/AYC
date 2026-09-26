<?php

namespace App\Services\Shipping;

use App\Models\Order;
use App\Models\OrderStatusEvent;
use App\Services\Shipping\Contracts\ShippingProviderInterface;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

class AramexShippingService implements ShippingProviderInterface
{
    protected string $baseUrl;
    protected array $clientInfo;
    protected array $shipperConfig;

    public function getProviderName(): string
    {
        return 'aramex';
    }

    public function getCarrierName(): string
    {
        return 'Aramex';
    }

    public function getSupportedMode(): string
    {
        return 'air';
    }

    public function calculateQuote(
        array $origin,
        array $destination,
        array $shipmentSpecs,
        float $goodsValue = 0.0
    ): array {
        return $this->calculateRate($destination, $shipmentSpecs, $goodsValue, 'PPX');
    }

    public function __construct()
    {
        $cfg = Config::get('services.aramex', []);

        $this->baseUrl = rtrim($cfg['base_url'] ?? 'https://ws.aramex.net/ShippingAPI.V2', '/');
        $this->clientInfo = [
            'UserName' => $cfg['username'] ?? '',
            'Password' => $cfg['password'] ?? '',
            'Version' => $cfg['version'] ?? 'v1.0',
            'AccountNumber' => $cfg['account_number'] ?? '',
            'AccountPin' => $cfg['account_pin'] ?? '',
            'AccountEntity' => $cfg['account_entity'] ?? 'DAC',
            'AccountCountryCode' => $cfg['account_country_code'] ?? 'BD',
        ];
        $this->shipperConfig = $cfg['shipper'] ?? [
            'name' => 'Ayaan Clothing Export Division',
            'company_name' => config('business.name', 'AYAAN CLOTHING'),
            'phone' => config('business.contact.phone', ''),
            'email' => config('business.contact.email', ''),
            'line1' => 'House #33 (2nd floor), Road #12, Sector #11',
            'line2' => 'Uttara',
            'city' => 'Dhaka',
            'state_or_province' => 'Dhaka',
            'postal_code' => '1230',
            'country_code' => 'BD',
        ];
    }

    /**
     * Create an official export shipment with Aramex for a confirmed order.
     * Uses the immutable order shipping snapshot.
     */
    public function createShipment(Order $order, array $options = []): array
    {
        // 1. Idempotency and Status Verification
        if (!empty($order->tracking_number)) {
            return [
                'success' => true,
                'is_duplicate_prevented' => true,
                'tracking_number' => $order->tracking_number,
                'shipment_id' => $order->shipment_id,
                'label_url' => $order->shipment_label_url,
                'carrier_status' => $order->carrier_status,
                'message' => "Order #{$order->order_number} already has an active Aramex shipment (AWB: {$order->tracking_number}). Duplicate creation prevented.",
                'order' => $order,
            ];
        }

        if ($order->status === 'cancelled') {
            throw new RuntimeException("Cannot create Aramex shipment for a cancelled order.");
        }

        // 2. Extract Data from Order and Shipping Snapshot
        $snapshot = $order->shipping_snapshot ?? [];
        $cartonCount = max(1, (int) ($snapshot['carton_count'] ?? 1));
        $grossWeight = max(0.5, (float) ($snapshot['gross_weight'] ?? 10.0));
        $dims = $snapshot['carton_dimensions'] ?? ['length' => 60, 'width' => 40, 'height' => 30, 'unit' => 'cm'];
        $dimUnit = strtoupper(substr($dims['unit'] ?? 'CM', 0, 2));

        $itemDescriptions = [];
        foreach ($order->items as $item) {
            $itemDescriptions[] = "{$item->product_name} ({$item->quantity} pcs)";
        }
        $goodsDesc = !empty($itemDescriptions) ? implode(', ', $itemDescriptions) : 'Wholesale Apparel Export Goods';
        if (strlen($goodsDesc) > 100) {
            $goodsDesc = substr($goodsDesc, 0, 97) . '...';
        }

        $shippingDateTime = "/Date(" . (time() * 1000) . ")/";
        $dueDate = "/Date(" . ((time() + (86400 * 5)) * 1000) . ")/";

        // 3. Assemble Aramex CreateShipments Payload
        $payload = [
            'ClientInfo' => $this->clientInfo,
            'Transaction' => [
                'Reference1' => $order->order_number,
                'Reference2' => $order->shipping_quote_id ?? 'DIRECT-ORDER',
                'Reference3' => (string) $order->id,
            ],
            'Shipments' => [
                [
                    'Reference1' => $order->order_number,
                    'Reference2' => (string) $order->id,
                    'Shipper' => [
                        'Reference1' => 'AYN-EXP-WH1',
                        'AccountNumber' => $this->clientInfo['AccountNumber'],
                        'PartyAddress' => [
                            'Line1' => $this->shipperConfig['line1'],
                            'Line2' => $this->shipperConfig['line2'] ?? '',
                            'City' => $this->shipperConfig['city'],
                            'StateOrProvinceCode' => $this->shipperConfig['state_or_province'] ?? 'Dhaka',
                            'PostCode' => $this->shipperConfig['postal_code'],
                            'CountryCode' => $this->shipperConfig['country_code'],
                        ],
                        'Contact' => [
                            'PersonName' => $this->shipperConfig['name'],
                            'CompanyName' => $this->shipperConfig['company_name'],
                            'PhoneNumber1' => $this->shipperConfig['phone'],
                            'CellPhone' => $this->shipperConfig['phone'],
                            'EmailAddress' => $this->shipperConfig['email'],
                            'Type' => 'Business',
                        ],
                    ],
                    'Consignee' => [
                        'Reference1' => (string) ($order->user_id ?? 'GUEST'),
                        'PartyAddress' => [
                            'Line1' => $order->shipping_address1,
                            'Line2' => $order->shipping_address2 ?? '',
                            'City' => $order->shipping_city,
                            'StateOrProvinceCode' => $order->shipping_region ?? $order->shipping_city,
                            'PostCode' => $order->shipping_postal_code,
                            'CountryCode' => strtoupper($order->shipping_country_code ?: 'US'),
                        ],
                        'Contact' => [
                            'PersonName' => $order->shipping_name,
                            'CompanyName' => $order->user?->company_name ?? $order->shipping_name,
                            'PhoneNumber1' => $order->shipping_phone ?: '+1000000000',
                            'CellPhone' => $order->shipping_phone ?: '+1000000000',
                            'EmailAddress' => $order->email,
                            'Type' => 'Business',
                        ],
                    ],
                    'ShippingDateTime' => $shippingDateTime,
                    'DueDate' => $dueDate,
                    'Comments' => "Order #{$order->order_number} Export Shipment",
                    'PickupLocation' => 'Reception',
                    'OperationsInstructions' => 'Commercial Wholesale Shipment. Fragile Garments.',
                    'Accounting' => [
                        'PaymentType' => 'P', // Prepaid
                    ],
                    'Details' => [
                        'Dimensions' => [
                            'Length' => (float) ($dims['length'] ?? 60),
                            'Width' => (float) ($dims['width'] ?? 40),
                            'Height' => (float) ($dims['height'] ?? 30),
                            'Unit' => $dimUnit === 'IN' ? 'IN' : 'CM',
                        ],
                        'ActualWeight' => [
                            'Value' => $grossWeight,
                            'Unit' => strtoupper(substr($snapshot['weight_unit'] ?? 'KG', 0, 2)),
                        ],
                        'ChargeableWeight' => [
                            'Value' => (float) ($snapshot['chargeable_weight'] ?? $grossWeight),
                            'Unit' => strtoupper(substr($snapshot['weight_unit'] ?? 'KG', 0, 2)),
                        ],
                        'ProductGroup' => 'EXP', // Express Export
                        'ProductType' => 'PPX',  // Priority Parcel Express
                        'PaymentType' => 'P',
                        'NumberOfPieces' => $cartonCount,
                        'DescriptionOfGoods' => $goodsDesc,
                        'GoodsOriginCountry' => 'BD',
                        'CustomsValueAmount' => [
                            'Value' => (float) $order->subtotal,
                            'CurrencyCode' => $order->currency ?: 'USD',
                        ],
                    ],
                ],
            ],
            'LabelInfo' => [
                'ReportID' => 9729,
                'ReportType' => 'URL',
            ],
        ];

        // 4. Send API Request to Aramex
        $endpoint = "{$this->baseUrl}/Shipping/Service_1_0.svc/json/CreateShipments";

        try {
            $response = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->post($endpoint, $payload);

            $resData = $response->json();
        } catch (\Throwable $e) {
            $errorMsg = "Aramex connection error: " . $e->getMessage();
            $this->recordShipmentFailure($order, $errorMsg);
            throw new RuntimeException($errorMsg, 502, $e);
        }

        // 5. Evaluate Aramex Response
        $hasErrors = $resData['HasErrors'] ?? false;
        $notifications = $resData['Notifications'] ?? [];
        $shipmentResults = $resData['Shipments'] ?? [];
        $firstShipment = $shipmentResults[0] ?? null;

        if ($hasErrors || empty($firstShipment) || ($firstShipment['HasErrors'] ?? false)) {
            $errorList = [];
            foreach ($notifications as $notif) {
                $errorList[] = "[{$notif['Code']}] {$notif['Message']}";
            }
            if (!empty($firstShipment['Notifications'])) {
                foreach ($firstShipment['Notifications'] as $notif) {
                    $errorList[] = "[{$notif['Code']}] {$notif['Message']}";
                }
            }

            $errorMsg = !empty($errorList) 
                ? implode(' | ', $errorList) 
                : "Aramex rejected shipment creation with unknown error";

            $this->recordShipmentFailure($order, $errorMsg);
            throw new RuntimeException("Aramex Shipment Creation Failed: {$errorMsg}", 422);
        }

        // 6. Success: Persist AWB, Shipment Details, and Transition Order State
        $awbNumber = (string) ($firstShipment['ID'] ?? $firstShipment['ShipmentLabel']['ShipmentNumber'] ?? '');
        $shipmentReference = (string) ($firstShipment['Reference1'] ?? $order->order_number);
        $labelUrl = (string) ($firstShipment['ShipmentLabel']['LabelURL'] ?? $firstShipment['ShipmentLabel']['LabelFileContents'] ?? '');

        $order->update([
            'carrier' => 'Aramex',
            'shipping_method' => $order->shipping_method ?: 'Aramex Priority Parcel Express (PPX)',
            'tracking_number' => $awbNumber,
            'shipment_id' => $awbNumber,
            'shipment_reference' => $shipmentReference,
            'shipment_label_url' => $labelUrl ?: null,
            'fulfillment_status' => 'shipped',
            'carrier_status' => 'Shipment Created',
            'last_carrier_update' => now(),
            'last_shipment_error' => null,
        ]);

        // Audit Event
        OrderStatusEvent::create([
            'order_id' => $order->id,
            'user_id' => auth()->id(),
            'event_type' => 'fulfillment_shipped',
            'message' => "Aramex shipment created successfully. AWB: {$awbNumber}. Carrier: Aramex.",
        ]);

        return [
            'success' => true,
            'tracking_number' => $awbNumber,
            'shipment_id' => $awbNumber,
            'shipment_reference' => $shipmentReference,
            'label_url' => $labelUrl,
            'carrier' => 'Aramex',
            'carrier_status' => 'Shipment Created',
            'order' => $order->fresh(),
        ];
    }

    /**
     * Track a shipment live through Aramex Tracking API
     */
    public function trackShipment(string $trackingNumber, ?Order $order = null): array
    {
        $cleanAwb = trim($trackingNumber);
        if (empty($cleanAwb)) {
            throw new InvalidArgumentException("AWB/Tracking number cannot be empty.");
        }

        $endpoint = "{$this->baseUrl}/Tracking/Service_1_0.svc/json/TrackShipments";

        $payload = [
            'ClientInfo' => $this->clientInfo,
            'Transaction' => [
                'Reference1' => $cleanAwb,
            ],
            'Shipments' => [$cleanAwb],
            'GetLastTrackingUpdateOnly' => false,
        ];

        try {
            $response = Http::timeout(20)
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->post($endpoint, $payload);

            $resData = $response->json();
        } catch (\Throwable $e) {
            throw new RuntimeException("Aramex tracking connection error: " . $e->getMessage(), 502, $e);
        }

        $hasErrors = $resData['HasErrors'] ?? false;
        if ($hasErrors) {
            $notif = $resData['Notifications'][0] ?? [];
            $errorMsg = $notif['Message'] ?? 'Failed to track shipment from Aramex';
            throw new RuntimeException("Aramex Tracking Error: {$errorMsg}", 422);
        }

        $trackingResults = $resData['TrackingResults'] ?? [];
        $targetResult = $trackingResults[0] ?? $resData['NonIdentifiedShipments'] ?? [];

        // Parse events
        $rawEvents = $targetResult['Value'] ?? $targetResult['TrackingData'] ?? [];
        $events = [];
        $latestStatus = 'Shipment Created';

        if (is_array($rawEvents) && count($rawEvents) > 0) {
            foreach ($rawEvents as $ev) {
                $statusDesc = $ev['UpdateDescription'] ?? $ev['Description'] ?? 'In Transit';
                $events[] = [
                    'update_code' => $ev['UpdateCode'] ?? '',
                    'status' => $statusDesc,
                    'location' => $ev['UpdateLocation'] ?? $ev['Location'] ?? 'Aramex Facility',
                    'timestamp' => $this->parseAramexDate($ev['UpdateDateTime'] ?? null) ?: date('c'),
                    'comments' => $ev['Comments'] ?? null,
                ];
            }
            $latestStatus = $events[count($events) - 1]['status'] ?? $latestStatus;
        }

        // Update associated order if provided
        if ($order) {
            $order->update([
                'carrier_status' => $latestStatus,
                'last_carrier_update' => now(),
            ]);

            // If carrier confirms delivered, update fulfillment_status
            if (stripos($latestStatus, 'delivered') !== false && $order->fulfillment_status !== 'delivered') {
                $order->update(['fulfillment_status' => 'delivered']);
                OrderStatusEvent::create([
                    'order_id' => $order->id,
                    'user_id' => null,
                    'event_type' => 'fulfillment_delivered',
                    'message' => "Aramex confirmed shipment delivery. AWB: {$cleanAwb}.",
                ]);
            }
        }

        return [
            'tracking_number' => $cleanAwb,
            'carrier' => 'Aramex',
            'carrier_status' => $latestStatus,
            'direct_tracking_url' => $this->getDirectTrackingUrl($cleanAwb),
            'events' => $events,
            'last_updated' => now()->toIso8601String(),
        ];
    }

    /**
     * Get configured company export origin
     */
    public function getOriginAddress(): array
    {
        return $this->shipperConfig;
    }

    /**
     * Calculate live shipping rate using Aramex Rate Calculator API
     * POST {baseUrl}/Shipping/Service_1_0.svc/json/CalculateRate
     *
     * @param array $destination [country_code, city, postal_code, line1, state_or_province]
     * @param array $shipmentSpecs [carton_count, gross_weight, weight_unit, carton_dimensions, cbm]
     * @param float $declaredValue Goods value in USD
     * @param string $productType e.g. 'PPX' (Priority Express) or 'EPX' (Economy Express)
     * @return array
     */
    public function calculateRate(
        array $destination,
        array $shipmentSpecs,
        float $declaredValue = 0.0,
        string $productType = 'PPX'
    ): array {
        $countryCode = strtoupper(trim($destination['country_code'] ?? 'US'));
        $city = trim($destination['city'] ?? 'New York');
        $postCode = trim($destination['postal_code'] ?? '10001');
        $line1 = trim($destination['line1'] ?? $destination['address1'] ?? 'Destination Street');
        $stateOrProvince = trim($destination['state_or_province'] ?? $destination['region'] ?? $city);

        $cartonCount = max(1, (int) ($shipmentSpecs['carton_count'] ?? 1));
        $grossWeight = max(0.5, (float) ($shipmentSpecs['gross_weight'] ?? 1.0));
        $dims = $shipmentSpecs['carton_dimensions'] ?? ['length' => 60, 'width' => 40, 'height' => 30, 'unit' => 'cm'];
        $dimUnit = strtoupper(substr($dims['unit'] ?? 'CM', 0, 2));

        $endpoint = "{$this->baseUrl}/Shipping/Service_1_0.svc/json/CalculateRate";

        $payload = [
            'ClientInfo' => $this->clientInfo,
            'Transaction' => [
                'Reference1' => 'RATE-' . uniqid(),
            ],
            'OriginAddress' => [
                'Line1' => $this->shipperConfig['line1'],
                'City' => $this->shipperConfig['city'],
                'StateOrProvinceCode' => $this->shipperConfig['state_or_province'] ?? 'Dhaka',
                'PostCode' => $this->shipperConfig['postal_code'],
                'CountryCode' => $this->shipperConfig['country_code'],
            ],
            'DestinationAddress' => [
                'Line1' => $line1,
                'City' => $city,
                'StateOrProvinceCode' => $stateOrProvince,
                'PostCode' => $postCode,
                'CountryCode' => $countryCode,
            ],
            'ShipmentDetails' => [
                'Dimensions' => [
                    'Length' => (float) ($dims['length'] ?? 60),
                    'Width' => (float) ($dims['width'] ?? 40),
                    'Height' => (float) ($dims['height'] ?? 30),
                    'Unit' => $dimUnit,
                ],
                'ActualWeight' => [
                    'Value' => $grossWeight,
                    'Unit' => strtoupper($shipmentSpecs['weight_unit'] ?? 'KG'),
                ],
                'ChargeableWeight' => null,
                'DescriptionOfGoods' => 'Wholesale Apparel Export Goods',
                'GoodsOriginCountry' => 'BD',
                'NumberOfPieces' => $cartonCount,
                'ProductGroup' => 'EXP',
                'ProductType' => $productType,
                'PaymentType' => 'P',
                'PaymentOptions' => '',
                'CustomsValueAmount' => [
                    'Value' => max(1.0, (float) $declaredValue),
                    'CurrencyCode' => 'USD',
                ],
            ],
            'PreferredCurrencyCode' => 'USD',
        ];

        try {
            $response = Http::timeout(15)
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->post($endpoint, $payload);

            $resData = $response->json();
        } catch (\Throwable $e) {
            throw new RuntimeException("Aramex Rate Calculator connection failed: " . $e->getMessage(), 502, $e);
        }

        $hasErrors = $resData['HasErrors'] ?? false;
        if ($hasErrors) {
            $notif = $resData['Notifications'][0] ?? [];
            $errorMsg = $notif['Message'] ?? 'Service unavailable for destination';
            $errorCode = $notif['Code'] ?? 'ERR_RATE';

            return [
                'is_available' => false,
                'provider' => 'aramex',
                'carrier' => 'Aramex',
                'service_name' => $productType === 'PPX' ? 'Aramex Priority Parcel Express' : 'Aramex Value Express',
                'mode' => 'air',
                'error_code' => $errorCode,
                'error_message' => $errorMsg,
                'amount' => null,
                'currency' => 'USD',
            ];
        }

        $totalAmount = (float) ($resData['TotalAmount']['Value'] ?? 0.0);
        $currency = $resData['TotalAmount']['CurrencyCode'] ?? 'USD';
        $chargeableWeight = isset($resData['RateDetails']['ChargeableWeight']['Value'])
            ? (float) $resData['RateDetails']['ChargeableWeight']['Value']
            : $grossWeight;

        $quoteReference = 'QT-ARX-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
        $now = now();

        return [
            'is_available' => true,
            'provider' => 'aramex',
            'quote_id' => $quoteReference,
            'carrier' => 'Aramex',
            'service_name' => $productType === 'PPX' ? 'Aramex Priority Parcel Express' : 'Aramex Value Express',
            'mode' => 'air',
            'amount' => round($totalAmount, 2),
            'currency' => $currency,
            'estimated_days' => $productType === 'PPX' ? '3-5 business days' : '5-8 business days',
            'gross_weight' => $grossWeight,
            'chargeable_weight' => $chargeableWeight,
            'weight_unit' => strtoupper($shipmentSpecs['weight_unit'] ?? 'KG'),
            'carton_count' => $cartonCount,
            'cbm' => (float) ($shipmentSpecs['total_cbm'] ?? $shipmentSpecs['cbm'] ?? 0.0),
            'is_provisional' => false,
            'quoted_at' => $now->toIso8601String(),
            'expires_at' => $now->copy()->addMinutes(15)->toIso8601String(),
        ];
    }

    /**
     * Get official direct tracking URL for Aramex
     */
    public function getDirectTrackingUrl(string $trackingNumber): string
    {
        $encoded = urlencode(trim($trackingNumber));
        return "https://www.aramex.com/us/en/track/shipments?ShipmentNumber={$encoded}";
    }

    /**
     * Record failure safely without breaking order or changing fulfillment status to shipped
     */
    protected function recordShipmentFailure(Order $order, string $errorMsg): void
    {
        $order->update([
            'last_shipment_error' => $errorMsg,
        ]);

        OrderStatusEvent::create([
            'order_id' => $order->id,
            'user_id' => auth()->id(),
            'event_type' => 'shipment_creation_failed',
            'message' => "Aramex shipment creation failed: {$errorMsg}",
        ]);
    }

    /**
     * Parse Aramex Microsoft .NET JSON date format (/Date(1756598400000+0000)/)
     */
    protected function parseAramexDate(?string $rawDate): ?string
    {
        if (!$rawDate) return null;
        if (preg_match('/\/Date\((\d+)(?:[+-]\d+)?\)\//', $rawDate, $matches)) {
            $ms = (int) $matches[1];
            return date('c', (int) ($ms / 1000));
        }
        return date('c', strtotime($rawDate));
    }
}

