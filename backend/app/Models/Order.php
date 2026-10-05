<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'user_id',
        'coupon_id',
        'coupon_code',
        'status',
        'payment_status',
        'fulfillment_status',
        'currency',
        'subtotal',
        'shipping_cost',
        'tax_amount',
        'other_charges',
        'discount_amount',
        'total_amount',
        'email',
        'shipping_name',
        'shipping_phone',
        'shipping_address1',
        'shipping_address2',
        'shipping_city',
        'shipping_region',
        'shipping_postal_code',
        'shipping_country_code',
        'shipping_method',
        'carrier',
        'tracking_number',
        'shipment_id',
        'shipment_reference',
        'shipment_label_url',
        'carrier_status',
        'last_carrier_update',
        'last_shipment_error',
        'shipping_quote_id',
        'shipping_snapshot',
        'billing_address',
        'payment_method',
        'payment_proof_url',
        'payment_details',
        'payment_confirmed_at',
        'payment_confirmed_by',
        'notes',
        'placed_at',
        'is_demo',
        'order_source',
        'created_by_admin_id',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'billing_address' => 'array',
        'shipping_snapshot' => 'array',
        'payment_details' => 'array',
        'payment_confirmed_at' => 'datetime',
        'last_carrier_update' => 'datetime',
        'placed_at' => 'datetime',
        'is_demo' => 'boolean',
        'coupon_id' => 'integer',
        'created_by_admin_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_admin_id');
    }

    public function isPos(): bool
    {
        return $this->order_source === 'pos';
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(OrderStatusEvent::class)->orderBy('created_at', 'asc');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentConfirmedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payment_confirmed_by');
    }

    /**
     * Scope query to qualifying orders attributed to coupons bound to the given admin.
     * Enforces strict server-side scoping:
     * - Resolves bound coupon IDs from CouponAdminBindingService.
     * - If admin is not Super Admin, filters strictly to coupon_id IN (boundCouponIds).
     * - If admin has no bound coupons and is not Super Admin, returns an empty set.
     */
    public function scopeForCouponSalesAdmin(Builder $query, User $adminUser, ?int $filterCouponId = null): Builder
    {
        $bindingService = app(\App\Services\Coupon\CouponAdminBindingService::class);
        $boundIds = $bindingService->getBoundCouponIds($adminUser);

        if (!$adminUser->isSuperAdmin()) {
            if (empty($boundIds)) {
                return $query->whereRaw('1 = 0');
            }

            if ($filterCouponId !== null) {
                // Reject/clamp any requested coupon outside the admin's bound scope
                if (!in_array($filterCouponId, $boundIds, true)) {
                    return $query->whereRaw('1 = 0');
                }
                return $query->where('coupon_id', $filterCouponId);
            }

            return $query->whereIn('coupon_id', $boundIds);
        }

        // Super Admin / privileged view:
        if ($filterCouponId !== null) {
            return $query->where('coupon_id', $filterCouponId);
        }

        return $query->whereNotNull('coupon_id');
    }

    /**
     * Scope query to canonical completed/qualifying sales.
     * Excludes cancelled, refunded, soft-deleted, and unconfirmed pending orders.
     */
    public function scopeQualifyingSales(Builder $query): Builder
    {
        return $query->whereNull('deleted_at')
            ->where('status', '!=', 'cancelled')
            ->where('payment_status', '!=', 'refunded')
            ->where(function (Builder $q) {
                $q->whereIn('status', ['confirmed', 'processing', 'shipped', 'delivered'])
                  ->orWhere('payment_status', 'paid');
            });
    }

    /**
     * Check if this order is eligible for Admin Aramex shipment creation
     */
    public function canCreateAramexShipment(): bool
    {
        if (!empty($this->tracking_number)) {
            return false; // Already created
        }

        if ($this->status === 'cancelled') {
            return false;
        }

        // Allow when order is paid, confirmed, processing, or approved B2B terms
        $isPaid = $this->payment_status === 'paid';
        $isTerms = in_array($this->payment_method, ['net_30', 'net_60', 'terms']);
        $isConfirmedOrProcessing = in_array($this->status, ['confirmed', 'processing']);

        return ($isPaid || $isTerms || $isConfirmedOrProcessing) && $this->fulfillment_status !== 'shipped';
    }

    /**
     * Get direct tracking URL on carrier portal
     */
    public function getDirectTrackingUrl(): ?string
    {
        if (empty($this->tracking_number)) {
            return null;
        }

        $encoded = urlencode(trim($this->tracking_number));
        if (strtolower($this->carrier ?? '') === 'aramex') {
            return "https://www.aramex.com/us/en/track/shipments?ShipmentNumber={$encoded}";
        }

        return "https://www.aramex.com/us/en/track/shipments?ShipmentNumber={$encoded}";
    }

    /**
     * Generate standardized Commercial Document (PI, Order Sheet, Commercial Invoice, Packing List)
     * strictly from the immutable order and shipping snapshot.
     */
    public function getCommercialDocument(string $docType): array
    {
        $normalizedType = strtoupper(str_replace('-', '_', trim($docType)));
        $snapshot = $this->shipping_snapshot ?? [];

        $docTitle = match ($normalizedType) {
            'PROFORMA_INVOICE' => 'PROFORMA INVOICE',
            'ORDER_SHEET' => 'COMMERCIAL ORDER SHEET',
            'COMMERCIAL_INVOICE' => 'COMMERCIAL INVOICE',
            'PACKING_LIST' => 'COMMERCIAL PACKING LIST',
            'CHALAN' => 'DELIVERY CHALAN / GATE PASS',
            default => 'COMMERCIAL ORDER DOCUMENT',
        };

        $prefix = match ($normalizedType) {
            'PROFORMA_INVOICE' => 'PI',
            'ORDER_SHEET' => 'ORD',
            'COMMERCIAL_INVOICE' => 'INV',
            'PACKING_LIST' => 'PL',
            default => 'DOC',
        };

        $year = date('Y', strtotime($this->created_at ?: now()));
        $docSuffix = substr($this->order_number, -6);
        $docNumber = "{$prefix}-{$year}-{$docSuffix}";
        $invNumber = "INV-{$year}-{$docSuffix}";
        $piNumber = "PI-{$year}-{$docSuffix}";
        $ordNumber = "ORD-{$year}-{$docSuffix}";
        $plNumber = "PL-{$year}-{$docSuffix}";

        $isPaid = in_array($this->payment_status, ['paid'])
            || in_array($this->status, ['processing', 'shipped', 'delivered', 'confirmed'])
            || in_array($this->payment_method, ['net_30', 'net_60', 'terms']);

        $isGated = in_array($normalizedType, ['COMMERCIAL_INVOICE', 'PACKING_LIST']) && !$isPaid;

        $items = $this->items->map(function ($item, $idx) {
            $hsCode = '6105.10.00';
            if (stripos($item->product_name, 't-shirt') !== false || stripos($item->product_name, 'tee') !== false) {
                $hsCode = '6109.10.00';
            } elseif (stripos($item->product_name, 'trouser') !== false || stripos($item->product_name, 'pant') !== false) {
                $hsCode = '6203.42.00';
            } elseif (stripos($item->product_name, 'hoodie') !== false || stripos($item->product_name, 'sweater') !== false) {
                $hsCode = '6110.20.00';
            }

            $product = $item->product_id ? \App\Models\Product::with('images')->find($item->product_id) : null;
            $gallery = \App\Services\Documents\DocumentHelper::getProductGallery($product, $item->product_image_url);

            return [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'description' => $item->product_name . ($item->size ? " (Size: {$item->size})" : " (Assorted Package)"),
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'hs_code' => $hsCode,
                'marks_and_numbers' => "AYN/{$this->order_number}/ITEM-" . ($idx + 1),
                'product_image_url' => $gallery[0] ?? $item->product_image_url ?: '/placeholder.jpg',
                'product_images' => $gallery,
                'size' => $item->size,
                'color' => $item->color,
                'package_breakdown' => $item->package_breakdown,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'details' => $item->variant_title,
            ];
        })->toArray();

        $allGalleryImages = [];
        foreach ($items as $it) {
            foreach ($it['product_images'] ?? [] as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }
        }

        $cartonCount = (int) ($snapshot['carton_count'] ?? 1);
        $grossWeight = (float) ($snapshot['gross_weight'] ?? 20.0);
        $netWeight = isset($snapshot['net_weight']) ? (float) $snapshot['net_weight'] : round($grossWeight * 0.9, 2);
        $cbm = (float) ($snapshot['cbm'] ?? $snapshot['total_cbm'] ?? 0.072);
        $dims = $snapshot['carton_dimensions'] ?? ['length' => 60, 'width' => 40, 'height' => 30, 'unit' => 'cm'];

        // Itemized Cartons Schedule for Packing List
        $packingCartons = [];
        $pcsPerCarton = $cartonCount > 0 ? (int) ceil($this->items->sum('quantity') / $cartonCount) : $this->items->sum('quantity');
        for ($c = 1; $c <= $cartonCount; $c++) {
            $packingCartons[] = [
                'carton_no' => sprintf('CTN #%02d/%02d', $c, $cartonCount),
                'marks_and_numbers' => "AYN/{$this->order_number}/C-{$c}",
                'description' => $this->items->pluck('product_name')->join(', '),
                'quantity_pcs' => $c === $cartonCount ? ($this->items->sum('quantity') - ($pcsPerCarton * ($cartonCount - 1))) : $pcsPerCarton,
                'packaging' => 'Master Export Carton (5-Ply Corrugated)',
                'dimensions' => "{$dims['length']}x{$dims['width']}x{$dims['height']} {$dims['unit']}",
                'gross_weight' => round($grossWeight / $cartonCount, 2),
                'net_weight' => round($netWeight / $cartonCount, 2),
                'cbm' => round($cbm / $cartonCount, 4),
            ];
        }

        $isSea = ($snapshot['mode'] ?? '') === 'sea' 
            || ($snapshot['provider'] ?? '') === 'akij' 
            || stripos($this->carrier ?: '', 'Akij') !== false 
            || stripos($this->shipping_method ?: '', 'Sea') !== false;

        $carrierName = $isSea ? 'Akij Logistics' : ($this->carrier ?: 'Aramex');
        $shippingMethodName = $isSea 
            ? ($this->shipping_method ?: 'Akij LCL Ocean Container Freight') 
            : ($this->shipping_method ?: 'Aramex Priority Parcel Express');

        return [
            'id' => "doc_{$normalizedType}_{$this->id}",
            'order_id' => (string) $this->id,
            'order_number' => $this->order_number,
            'doc_number' => $docNumber,
            'doc_type' => $normalizedType,
            'document_type' => strtolower($normalizedType),
            'title' => $docTitle,
            'date' => date('Y-m-d', strtotime($this->created_at ?: now())),
            'valid_until' => date('Y-m-d', strtotime('+30 days', strtotime($this->created_at ?: now()))),
            'related_invoice_number' => $invNumber,
            'pi_number' => $piNumber,
            'order_sheet_number' => $ordNumber,
            'packing_list_number' => $plNumber,
            'is_payment_verified' => $isPaid,
            'is_gated' => $isGated,
            'payment_status' => $this->payment_status,
            'fulfillment_status' => $this->fulfillment_status,
            'exporter' => [
                'company_name' => config('business.name', 'AYAAN CLOTHING'),
                'brand' => config('business.name', 'AYAAN CLOTHING'),
                'brand_mark' => config('business.brand_mark', 'AYC'),
                'business_type' => config('business.business_type', 'Ready-made Garments Manufacturer & Exporter'),
                'address' => config('business.address.formatted', 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh'),
                'city' => config('business.address.city', 'Dhaka'),
                'postal_code' => config('business.address.postal_code', '1230'),
                'country' => config('business.address.country', 'Bangladesh'),
                'country_code' => config('business.address.country_code', 'BD'),
                'phone' => config('business.contact.phone'),
                'email' => config('business.contact.email'),
                'whatsapp' => config('business.contact.whatsapp'),
                'whatsapp_number' => config('business.contact.whatsapp_number'),
                'whatsapp_url' => config('business.contact.whatsapp_url'),
                'web' => config('business.contact.website', 'www.ayaanclothing.com'),
                'reg_number' => config('business.legal.registration_number'),
                'tin_number' => config('business.legal.tin_number'),
                'bin_number' => config('business.legal.bin_number'),
                'bgmea_reg' => config('business.legal.bgmea_reg'),
                'est_year' => config('business.established_year', 2010),
            ],
            'buyer' => [
                'name' => $this->shipping_name,
                'company_name' => $this->user?->company_name ?? $this->shipping_name,
                'email' => $this->email,
                'phone' => $this->shipping_phone,
                'address1' => $this->shipping_address1,
                'address2' => $this->shipping_address2,
                'city' => $this->shipping_city,
                'region' => $this->shipping_region,
                'postal_code' => $this->shipping_postal_code,
                'country_code' => $this->shipping_country_code,
            ],
            'notify_party' => [
                'name' => $this->shipping_name,
                'company_name' => $this->user?->company_name ?? $this->shipping_name,
                'address' => $this->shipping_address1 . ($this->shipping_address2 ? ', ' . $this->shipping_address2 : ''),
                'city' => $this->shipping_city,
                'country' => $this->shipping_country_code,
                'contact' => "Email: {$this->email} | Phone: " . ($this->shipping_phone ?: 'N/A'),
            ],
            'logistics' => [
                'country_of_origin' => 'Bangladesh',
                'place_of_receipt' => $isSea ? 'Chattogram Sea Port / Dhaka Hub, Bangladesh' : 'Uttara Office / Dhaka Hub, Bangladesh',
                'port_of_loading' => $isSea
                    ? 'Chattogram Sea Port (CGP), Bangladesh'
                    : 'Hazrat Shahjalal International Airport (DAC), Dhaka',
                'port_of_discharge' => ($this->shipping_city ?: 'Destination City') . ($isSea ? ' Sea Port' : ' Airport / Port'),
                'final_destination' => ($this->shipping_city ?: 'Destination') . ', ' . ($this->shipping_country_code ?: 'US'),
                'terms_of_delivery' => 'DAP (Delivered at Place, Incoterms 2020)',
                'mode_of_shipment' => $isSea
                    ? 'Ocean Freight Vessel (Akij Logistics LCL Container)'
                    : 'Air Cargo Express (Aramex Priority Express)',
                'carrier' => $carrierName,
                'provider' => $isSea ? 'akij' : 'aramex',
                'awb_number' => $this->tracking_number,
                'carrier_status' => $this->carrier_status ?: 'Pending Dispatch',
            ],
            'shipping_snapshot' => [
                'provider' => $isSea ? 'akij' : ($snapshot['provider'] ?? 'aramex'),
                'shipping_method' => $shippingMethodName,
                'carrier' => $carrierName,
                'tracking_number' => $this->tracking_number,
                'carton_count' => $cartonCount,
                'carton_dimensions' => $dims,
                'gross_weight' => $grossWeight,
                'net_weight' => $netWeight,
                'weight_unit' => $snapshot['weight_unit'] ?? 'kg',
                'cbm' => $cbm,
                'chargeable_weight' => isset($snapshot['chargeable_weight']) ? (float) $snapshot['chargeable_weight'] : ($isSea ? $cbm * 1000 : $grossWeight),
                'is_provisional' => (bool) ($snapshot['is_provisional'] ?? false),
                'quote_reference_id' => $this->shipping_quote_id ?? $snapshot['quote_reference_id'] ?? null,
                'quoted_at' => $snapshot['quoted_at'] ?? $this->created_at?->toIso8601String(),
                'port_of_loading' => $isSea ? 'Chattogram Sea Port (CGP), Bangladesh' : 'Hazrat Shahjalal International Airport (DAC), Dhaka',
                'notes' => $snapshot['notes'] ?? null,
            ],
            'financials' => [
                'currency' => $this->currency ?: 'USD',
                'goods_value' => (float) $this->subtotal,
                'subtotal' => (float) $this->subtotal,
                'shipping_charge' => (float) $this->shipping_cost,
                'tax_amount' => (float) $this->tax_amount,
                'other_charges' => (float) $this->other_charges,
                'discount_amount' => (float) $this->discount_amount,
                'total_payable' => (float) $this->total_amount,
                'grand_total' => (float) $this->total_amount,
                'amount_in_words' => self::numberToWords((float) $this->total_amount),
            ],
            'items' => $items,
            'product_gallery' => $allGalleryImages,
            'packing_cartons' => $packingCartons,
            'totals_summary' => [
                'total_quantity' => $this->items->sum('quantity'),
                'total_cartons' => $cartonCount,
                'total_gross_weight' => $grossWeight,
                'total_net_weight' => $netWeight,
                'total_cbm' => $cbm,
                'weight_unit' => 'KG',
            ],
            'payment_terms' => $this->payment_method === 'net_30' ? 'Commercial Credit Net 30' : ($this->payment_method === 'card' ? 'Prepaid Credit/Debit Card (Full In Advance)' : 'Bank Wire Transfer (T/T Advance)'),
            'shipping_terms' => $isSea ? 'Ocean Container Freight (DAP / CIF)' : 'Express Air Freight (DAP / DDP)',
            'incoterm' => 'DAP',
            'notes' => $this->notes ?: 'Commercial Wholesale Export Order. Ready-made Garments Manufactured in Bangladesh.',
            'bank_details' => [
                'is_configured' => (bool) config('business.banking.is_configured', false),
                'beneficiary_name' => config('business.banking.beneficiary_name', 'AYAAN CLOTHING'),
                'bank_name' => config('business.banking.bank_name'),
                'account_number' => config('business.banking.account_number'),
                'swift_code' => config('business.banking.swift_code'),
                'branch' => config('business.banking.branch'),
                'routing_no' => config('business.banking.routing_no'),
            ],
            'payment_details' => $this->payment_details ?? [
                'payment_status' => $this->payment_status === 'paid' ? 'PAID' : strtoupper($this->payment_status),
                'payment_method' => $this->payment_method === 'net_30' ? 'Commercial Credit Net 30' : ($this->payment_method === 'card' ? 'Prepaid Credit/Debit Card' : 'Bank Wire Transfer (T/T Advance)'),
                'transaction_id' => $this->payments()->whereIn('status', ['confirmed', 'succeeded'])->latest()->value('transaction_id') ?? null,
                'payer_name' => $this->shipping_name,
                'bank_name' => config('business.banking.bank_name', 'Pubali Bank Limited'),
                'payment_date' => $this->payment_confirmed_at?->format('Y-m-d') ?? ($this->payment_status === 'paid' ? date('Y-m-d', strtotime($this->updated_at)) : null),
                'amount_paid' => (float) $this->total_amount,
                'receipt_reference' => $this->payments()->latest()->value('receipt_original_name') ?? null,
            ],
        ];
    }

    /**
     * Convert currency amount to official written words in USD
     */
    public static function numberToWords(float $amount): string
    {
        $dollars = (int) floor($amount);
        $cents = (int) round(($amount - $dollars) * 100);

        $words = self::convertIntegerToWords($dollars);
        $result = "US Dollars " . trim($words);
        if ($cents > 0) {
            $result .= " and " . sprintf('%02d', $cents) . "/100";
        } else {
            $result .= " and 00/100";
        }
        return $result . " Only";
    }

    private static function convertIntegerToWords(int $number): string
    {
        if ($number === 0) {
            return 'Zero';
        }

        if ($number < 0) {
            return 'Negative ' . self::convertIntegerToWords(abs($number));
        }

        $units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        $words = '';

        if ($number >= 1000000) {
            $millions = (int) ($number / 1000000);
            $words .= self::convertIntegerToWords($millions) . ' Million ';
            $number %= 1000000;
        }

        if ($number >= 1000) {
            $thousands = (int) ($number / 1000);
            $words .= self::convertIntegerToWords($thousands) . ' Thousand ';
            $number %= 1000;
        }

        if ($number >= 100) {
            $hundreds = (int) ($number / 100);
            $words .= $units[$hundreds] . ' Hundred ';
            $number %= 100;
        }

        if ($number > 0) {
            if ($number < 20) {
                $words .= $units[$number] . ' ';
            } else {
                $t = (int) ($number / 10);
                $u = $number % 10;
                $words .= $tens[$t] . ($u > 0 ? '-' . $units[$u] : '') . ' ';
            }
        }

        return trim($words);
    }
}

