<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductShippingPackageProfile;
use App\Models\Quotation;

class OfferSheetService
{
    public const DEFAULT_VALIDITY_DAYS = 7;
    public const VALIDITY_TEXT = '7 Days from date of issuance';

    /**
     * Build Offer Sheet document representation from an Order
     */
    public function generateForOrder(Order $order, string $docType = 'OFFER_SHEET'): array
    {
        $year = date('Y', strtotime($order->created_at ?: now()));
        $docSuffix = substr($order->order_number, -6);
        $docNumber = "ORD-{$year}-{$docSuffix}";
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $items = [];
        $allGalleryImages = [];

        // Preload products with images, brand, shippingPackageProfiles, and pricingTiers
        $products = collect();
        $missingProductIds = [];
        foreach ($order->items as $it) {
            if ($it->relationLoaded('product') && $it->product) {
                $products[(string) $it->product->id] = $it->product;
            } elseif ($it->product_id) {
                $missingProductIds[] = $it->product_id;
            }
        }
        if (!empty($missingProductIds)) {
            $fetched = Product::with(['images', 'brand', 'shippingPackageProfiles', 'pricingTiers'])->whereIn('id', array_unique($missingProductIds))->get()->keyBy(fn($p) => (string) $p->id);
            foreach ($fetched as $k => $v) {
                $products[$k] = $v;
            }
        }

        foreach ($order->items as $idx => $item) {
            $product = ($item->product_id && isset($products[(string) $item->product_id]))
                ? $products[(string) $item->product_id]
                : ($item->relationLoaded('product') ? $item->product : null);
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url ?? null);
            
            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            $brandModel = $product?->brand;
            $brand = $brandModel?->name ?? (is_string($product?->brand) ? $product->brand : 'AYAAN CLOTHING');
            $brandLogoRaw = $brandModel?->logo_url;
            $brandLogo = $brandLogoRaw ? DocumentHelper::resolvePdfImageSource($brandLogoRaw, true) : null;
            if ($brandLogo && !file_exists($brandLogo)) {
                $brandLogo = null;
            }
            $prodDesc = $product?->description ?: ($product?->short_description ?? '');
            $designType = !empty(trim($product?->design_type ?? '')) ? trim($product->design_type) : 'See Description';
            $material = !empty(trim($product?->material ?? ($product?->fabric ?? ''))) ? trim($product?->material ?? $product->fabric) : 'See Description';
            $sizeDesc = !empty(trim($product?->size_description ?? '')) ? trim($product->size_description) : 'See Description';
            // Authoritative Colour: strictly colour_description, never fall back to item variant color or BLACK
            $colourDesc = !empty(trim($product?->colour_description ?? '')) ? trim($product->colour_description) : 'See Description';

            $moqQty = $product?->moq ?: (int) $item->quantity;
            $moqProfile = $product?->findShippingPackageProfileForQuantity($moqQty);
            $cbmVal = $product?->cbm ?? ($moqProfile?->total_cbm);
            $cbmMoq = $cbmVal ? number_format((float) $cbmVal, 3) . ' m³' : 'See Description';
            $gwVal = $product?->gross_weight ?? ($moqProfile?->gross_weight);
            $gwMoq = self::formatGrossWeight($gwVal ? (float) $gwVal : null, $moqProfile);

            $tiers = self::buildPricingTiers($product, (float) $item->unit_price, (int) $item->quantity);
            $eligibleFsQty = self::resolveFullStockQuantity($product);

            $items[] = [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'brand' => $brand,
                'brand_logo' => $brandLogo,
                'brand_logo_url' => $brandLogo,
                'product_description' => $prodDesc,
                'design_type' => $designType,
                'material' => $material,
                'size_description' => $sizeDesc,
                'colour_description' => $colourDesc,
                'cbm_moq' => $cbmMoq,
                'gross_weight_moq' => $gwMoq,
                'pricing_tiers' => $tiers,
                'description' => $item->product_name,
                'sku' => ($item->sku ?? null) ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'product_image_url' => $gallery[0] ?? ($item->product_image_url ?? null),
                'product_images' => $gallery,
                'full_stock_quantity' => $eligibleFsQty,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'package_breakdown' => $item->package_breakdown ?? null,
                'details' => $item->variant_title ?? null,
                // ONLY the relevant applicable quantity pricing
                'applicable_pricing' => [
                    'order_quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total' => (float) $item->line_total,
                ],
            ];
        }

        $canonicalDocType = strtoupper(trim($docType));

        return [
            'id' => "doc_{$canonicalDocType}_{$order->id}",
            'docNumber' => $docNumber,
            'doc_number' => $docNumber,
            'docType' => $canonicalDocType,
            'doc_type' => $canonicalDocType,
            'document_type' => strtolower($canonicalDocType),
            'title' => 'COMMERCIAL OFFER SHEET',
            'date' => date('Y-m-d', strtotime($order->created_at ?: now())),
            'validUntil' => date('Y-m-d', strtotime('+30 days', strtotime($order->created_at ?: now()))),
            'orderNumber' => $order->order_number,
            'order_id' => (string) $order->id,
            'companyName' => $order->user?->company_name ?? $order->shipping_name,
            'buyerName' => $order->shipping_name,
            'buyerEmail' => $order->email,
            'buyerPhone' => $order->shipping_phone,
            'buyerAddress' => $order->shipping_address1 . ($order->shipping_address2 ? ', ' . $order->shipping_address2 : ''),
            'buyerCountry' => $order->shipping_country_code ?: 'United States',
            'exporter' => DocumentHelper::getExporterProfile(),
            'items' => $items,
            'product_gallery' => $allGalleryImages,
            'financials' => [
                'currency' => $order->currency ?: 'USD',
                'goods_value' => (float) $order->subtotal,
                'subtotal' => (float) $order->subtotal,
                'shipping_charge' => (float) $order->shipping_cost,
                'tax_amount' => (float) $order->tax_amount,
                'other_charges' => (float) ($order->other_charges ?? 0),
                'discount_amount' => (float) $order->discount_amount,
                'total_payable' => (float) $order->total_amount,
                'grand_total' => (float) $order->total_amount,
            ],
            'subtotal' => (float) $order->subtotal,
            'shipping' => (float) $order->shipping_cost,
            'tax' => (float) $order->tax_amount,
            'discount' => (float) $order->discount_amount,
            'grandTotal' => (float) $order->total_amount,
            'currency' => $order->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $order->payment_method === 'card' ? 'Prepaid Full in Advance' : ($docDefaults['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)'),
            'shippingTerms' => $docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)',
            'incoterm' => $docDefaults['incoterm'] ?? 'FOB',
            'notes' => $docDefaults['offer_sheet_notes'] ?? 'Commercial Offer only — Not an invoice. Shipping arranged separately.',
            'bankDetails' => DocumentHelper::getBankDetails(),
            'bank_details' => DocumentHelper::getBankDetails(),
            // Intentionally NO volume pricing tiers table! Only relevant pricing shown.
            'show_all_pricing_tiers' => false,
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Build Offer Sheet document representation from a Quotation
     */
    public function generateForQuotation(Quotation $quotation): array
    {
        $year = date('Y', strtotime($quotation->created_at ?: now()));
        $docNumber = $quotation->quotation_number;
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $items = [];
        $allGalleryImages = [];

        // Preload products with images, brand, shippingPackageProfiles, and pricingTiers
        $products = collect();
        $missingProductIds = [];
        foreach ($quotation->items as $it) {
            if ($it->relationLoaded('product') && $it->product) {
                $products[(string) $it->product->id] = $it->product;
            } elseif ($it->product_id) {
                $missingProductIds[] = $it->product_id;
            }
        }
        if (!empty($missingProductIds)) {
            $fetched = Product::with(['images', 'brand', 'shippingPackageProfiles', 'pricingTiers'])->whereIn('id', array_unique($missingProductIds))->get()->keyBy(fn($p) => (string) $p->id);
            foreach ($fetched as $k => $v) {
                $products[$k] = $v;
            }
        }

        foreach ($quotation->items as $idx => $item) {
            $product = ($item->product_id && isset($products[(string) $item->product_id]))
                ? $products[(string) $item->product_id]
                : ($item->relationLoaded('product') ? $item->product : null);
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);

            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            $brandModel = $product?->brand;
            $brand = $brandModel?->name ?? (is_string($product?->brand) ? $product->brand : 'AYAAN CLOTHING');
            $brandLogoRaw = $brandModel?->logo_url;
            $brandLogo = $brandLogoRaw ? DocumentHelper::resolvePdfImageSource($brandLogoRaw, true) : null;
            if ($brandLogo && !file_exists($brandLogo)) {
                $brandLogo = null;
            }
            $prodDesc = $product?->description ?: ($product?->short_description ?? '');
            $designType = !empty(trim($product?->design_type ?? '')) ? trim($product->design_type) : 'See Description';
            $material = !empty(trim($product?->material ?? ($product?->fabric ?? ''))) ? trim($product?->material ?? $product->fabric) : 'See Description';
            $sizeDesc = !empty(trim($product?->size_description ?? '')) ? trim($product->size_description) : 'See Description';
            // Authoritative Colour: strictly colour_description, never fall back to item variant color or BLACK
            $colourDesc = !empty(trim($product?->colour_description ?? '')) ? trim($product->colour_description) : 'See Description';

            $moqQty = $product?->moq ?: (int) $item->quantity;
            $moqProfile = $product?->findShippingPackageProfileForQuantity($moqQty);
            $cbmVal = $product?->cbm ?? ($moqProfile?->total_cbm);
            $cbmMoq = $cbmVal ? number_format((float) $cbmVal, 3) . ' m³' : 'See Description';
            $gwVal = $product?->gross_weight ?? ($moqProfile?->gross_weight);
            $gwMoq = self::formatGrossWeight($gwVal ? (float) $gwVal : null, $moqProfile);

            $tiers = self::buildPricingTiers($product, (float) $item->unit_price, (int) $item->quantity);
            $eligibleFsQty = self::resolveFullStockQuantity($product);

            $items[] = [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'brand' => $brand,
                'brand_logo' => $brandLogo,
                'brand_logo_url' => $brandLogo,
                'product_description' => $prodDesc,
                'design_type' => $designType,
                'material' => $material,
                'size_description' => $sizeDesc,
                'colour_description' => $colourDesc,
                'cbm_moq' => $cbmMoq,
                'gross_weight_moq' => $gwMoq,
                'pricing_tiers' => $tiers,
                'description' => $item->product_name,
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'product_image_url' => $gallery[0] ?? $item->product_image_url,
                'product_images' => $gallery,
                'full_stock_quantity' => $eligibleFsQty,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
                'applicable_pricing' => [
                    'order_quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total' => (float) $item->line_total,
                ],
            ];
        }

        return [
            'id' => "doc_QUOTATION_{$quotation->id}",
            'docNumber' => $docNumber,
            'docType' => 'QUOTATION',
            'title' => 'COMMERCIAL OFFER SHEET',
            'date' => date('Y-m-d', strtotime($quotation->created_at ?: now())),
            'validUntil' => $quotation->valid_until ? $quotation->valid_until->format('Y-m-d') : date('Y-m-d', strtotime('+30 days')),
            'quotationNumber' => $quotation->quotation_number,
            'rfqNumber' => $quotation->quote?->rfq_number,
            'companyName' => $quotation->company_name,
            'buyerName' => $quotation->buyer_name,
            'buyerEmail' => $quotation->buyer_email,
            'buyerPhone' => $quotation->buyer_phone,
            'buyerAddress' => "{$quotation->destination_city}, {$quotation->destination_country}",
            'buyerCountry' => $quotation->destination_country,
            'exporter' => DocumentHelper::getExporterProfile(),
            'items' => $items,
            'product_gallery' => $allGalleryImages,
            'subtotal' => (float) $quotation->subtotal,
            'shipping' => (float) $quotation->shipping_fee,
            'tax' => (float) $quotation->tax_amount,
            'discount' => (float) $quotation->discount_total,
            'grandTotal' => (float) $quotation->grand_total,
            'currency' => $quotation->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $quotation->payment_terms ?: ($docDefaults['payment_terms'] ?? '30% T/T Advance, 70% against B/L'),
            'shippingTerms' => $quotation->shipping_terms ?: ($docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)'),
            'incoterm' => $quotation->incoterm ?: ($docDefaults['incoterm'] ?? 'FOB'),
            'notes' => $quotation->admin_notes ?: ($docDefaults['offer_sheet_notes'] ?? 'Commercial Offer only — Not an invoice. Valid for 30 days.'),
            'bankDetails' => DocumentHelper::getBankDetails(),
            'bank_details' => DocumentHelper::getBankDetails(),
            // Intentionally NO volume pricing tiers table! Only relevant pricing shown.
            'show_all_pricing_tiers' => false,
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Build canonical Offer Sheet document representation for a single Product.
     */
    public function generateForProduct(Product $product, array $options = []): array
    {
        $docDefaults = DocumentHelper::getDocumentDefaults();
        $cleanSku = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($product->sku ?: "PROD-{$product->id}"));
        $docNumber = "OS-{$cleanSku}";

        $gallery = DocumentHelper::getProductGallery($product);

        $brandModel = $product->brand;
        $rawBrand = $brandModel?->name ?? (is_string($product->brand) ? $product->brand : 'AYAAN CLOTHING');
        $brand = DocumentHelper::normalizeUnicode($rawBrand);
        $brandLogoRaw = $brandModel?->logo_url;
        $brandLogo = $brandLogoRaw ? DocumentHelper::resolvePdfImageSource($brandLogoRaw, true) : null;
        if ($brandLogo && !file_exists($brandLogo)) {
            $brandLogo = null;
        }

        $productName = DocumentHelper::normalizeUnicode($product->name);
        $prodDesc = DocumentHelper::normalizeUnicode($product->description ?: ($product->short_description ?? ''));
        $designType = DocumentHelper::normalizeUnicode(!empty(trim($product->design_type ?? '')) ? trim($product->design_type) : 'See Description');
        $material = DocumentHelper::normalizeUnicode(!empty(trim($product->material ?? ($product->fabric ?? ''))) ? trim($product->material ?? $product->fabric) : 'See Description');
        $sizeDesc = DocumentHelper::normalizeUnicode(!empty(trim($product->size_description ?? '')) ? trim($product->size_description) : 'See Description');
        $colourDesc = DocumentHelper::normalizeUnicode(!empty(trim($product->colour_description ?? '')) ? trim($product->colour_description) : 'See Description');

        $moqQty = $product->moq ?: 1;
        $moqProfile = $product->findShippingPackageProfileForQuantity($moqQty);
        $cbmVal = $product->cbm ?? ($moqProfile?->total_cbm);
        $cbmMoq = $cbmVal ? number_format((float) $cbmVal, 3) . ' m³' : 'See Description';
        $gwVal = $product->gross_weight ?? ($moqProfile?->gross_weight);
        $gwMoq = self::formatGrossWeight($gwVal ? (float) $gwVal : null, $moqProfile);

        $tiers = self::buildPricingTiers($product);
        $stdPrice = (float) ($tiers[0]['unitPrice'] ?? $product->wholesale_price ?? 0);
        $eligibleFsQty = self::resolveFullStockQuantity($product);

        $items = [
            [
                'id' => (string) $product->id,
                'item_no' => 1,
                'product_id' => (string) $product->id,
                'product_name' => $productName,
                'brand' => $brand,
                'brand_logo' => $brandLogo,
                'brand_logo_url' => $brandLogo,
                'product_description' => $prodDesc,
                'design_type' => $designType,
                'material' => $material,
                'size_description' => $sizeDesc,
                'colour_description' => $colourDesc,
                'cbm_moq' => $cbmMoq,
                'gross_weight_moq' => $gwMoq,
                'pricing_tiers' => $tiers,
                'description' => $productName,
                'sku' => $product->sku ?: "AYN-SKU-" . str_pad($product->id, 3, '0', STR_PAD_LEFT),
                'product_image_url' => $gallery[0] ?? null,
                'product_images' => $gallery,
                'full_stock_quantity' => $eligibleFsQty,
                'moq' => $moqQty,
                'quantity' => $moqQty,
                'unit_price' => $stdPrice,
                'line_total' => round($stdPrice * $moqQty, 2),
                'package_breakdown' => null,
                'details' => $sizeDesc,
                'applicable_pricing' => [
                    'order_quantity' => $moqQty,
                    'unit_price' => $stdPrice,
                    'total' => round($stdPrice * $moqQty, 2),
                ],
            ]
        ];

        $docDefaults = DocumentHelper::getDocumentDefaults();
        $validityDays = self::DEFAULT_VALIDITY_DAYS;
        $validityLabel = self::VALIDITY_TEXT;

        return [
            'id' => "doc_OFFER_SHEET_PROD_{$product->id}",
            'docNumber' => $docNumber,
            'doc_number' => $docNumber,
            'docType' => 'OFFER_SHEET',
            'doc_type' => 'OFFER_SHEET',
            'document_type' => 'offer_sheet',
            'title' => 'COMMERCIAL OFFER SHEET',
            'date' => date('Y-m-d'),
            'validUntil' => self::VALIDITY_TEXT,
            'valid_until' => self::VALIDITY_TEXT,
            'validity_days' => self::DEFAULT_VALIDITY_DAYS,
            'order_number' => 'CATALOG',
            'orderNumber' => 'CATALOG',
            'product_id' => (string) $product->id,
            'sku' => $product->sku,
            'companyName' => 'Wholesale / Private Label Commercial Partner',
            'buyerName' => 'Valued Commercial Buyer',
            'buyerEmail' => 'export@ayaanclothing.com',
            'buyerPhone' => '+880 1620-853502',
            'buyerAddress' => 'International Export Market (Worldwide)',
            'buyerCountry' => 'International (Worldwide)',
            'exporter' => DocumentHelper::getExporterProfile(),
            'items' => $items,
            'product_gallery' => $gallery,
            'financials' => [
                'currency' => 'USD',
                'goods_value' => round($stdPrice * $moqQty, 2),
                'subtotal' => round($stdPrice * $moqQty, 2),
                'shipping_charge' => 0.00,
                'tax_amount' => 0.00,
                'other_charges' => 0.00,
                'discount_amount' => 0.00,
                'total_payable' => round($stdPrice * $moqQty, 2),
                'grand_total' => round($stdPrice * $moqQty, 2),
            ],
            'subtotal' => round($stdPrice * $moqQty, 2),
            'shipping' => 0.00,
            'tax' => 0.00,
            'discount' => 0.00,
            'grandTotal' => round($stdPrice * $moqQty, 2),
            'currency' => 'USD',
            'paymentTerms' => '100% Advance Bank Wire Transfer (T/T) or Confirmed L/C at Sight',
            'shippingTerms' => 'FOB Dhaka (Port / Airport) Export',
            'incoterm' => 'FOB',
            'notes' => 'Commercial Merchandising Offer Sheet. Quotation pricing valid for order placement within 7 calendar days from date of receipt / issuance.',
            'bankDetails' => DocumentHelper::getBankDetails('USD'),
            'bank_details' => DocumentHelper::getBankDetails('USD'),
            'show_all_pricing_tiers' => true,
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Generate PDF object for asynchronous job pipeline
     */
    public function generate(Quotation $quotation): DocumentPdfService
    {
        $payload = $this->generateForQuotation($quotation);
        $pdfService = app(DocumentPdfService::class);
        return $pdfService->render($payload);
    }

    /**
     * Format Gross Weight display string communicating both total and per-carton weight accurately.
     */
    public static function formatGrossWeight(?float $gwVal, ?ProductShippingPackageProfile $moqProfile): string
    {
        if (!$gwVal || $gwVal <= 0) {
            return 'See Description';
        }

        $cartonCount = (int) ($moqProfile?->carton_count ?? 1);
        if ($cartonCount > 1) {
            $totalGw = round($gwVal * $cartonCount, 1);
            return number_format($totalGw, 1) . ' KG total (' . number_format($gwVal, 1) . ' KG/carton)';
        }

        return number_format($gwVal, 1) . ' KG';
    }

    /**
     * Resolve authoritative full-stock quantity for a product.
     * Returns null strictly if stock is untracked/unknown, or the non-negative integer stock (including 0).
     */
    public static function resolveFullStockQuantity(?Product $product): ?int
    {
        if (!$product) {
            return null;
        }

        if (method_exists($product, 'getEligibleFullStockQuantity')) {
            $eligible = (int) $product->getEligibleFullStockQuantity();
            if ($eligible > 0) {
                return $eligible;
            }
        }

        if (method_exists($product, 'getTotalAvailableStock')) {
            $avail = $product->getTotalAvailableStock();
            if ($avail !== null) {
                return max(0, (int) $avail);
            }
        }

        if (isset($product->stock) && $product->stock !== null) {
            return max(0, (int) $product->stock);
        }

        return null;
    }

    /**
     * Build the full configured pricing schedule for a product.
     * Includes all active tiers: Standard (MOQ), Bulk (if enabled), Full Stock (if configured & stock available),
     * and any distinct breaks from product_pricing_tiers.
     * Removes only demonstrably redundant automatically derived tiers, preserving all genuine custom tiers.
     */
    public static function buildPricingTiers(?Product $product, ?float $fallbackUnitPrice = null, ?int $fallbackMoq = null): array
    {
        if (!$product) {
            $uPrice = (float) ($fallbackUnitPrice ?: 0);
            $qty = max(1, (int) ($fallbackMoq ?: 100));
            return [
                [
                    'tierName' => 'Standard',
                    'quantityBasis' => "{$qty}+ pcs (Minimum Order)",
                    'unitPrice' => $uPrice,
                    'totalPrice' => round($uPrice * $qty, 2),
                ],
            ];
        }

        $moq = max(1, (int) ($product->moq ?: ($fallbackMoq ?: 100)));
        $stdPrice = (float) ($product->wholesale_price ?? $product->standard_price ?? ($fallbackUnitPrice ?: 0));
        $hasBulkTier = (bool) ($product->bulk_pricing_enabled && $product->bulk_price && (float) $product->bulk_price > 0 && $product->bulk_threshold && (int) $product->bulk_threshold > $moq);
        $bulkThreshold = $hasBulkTier ? (int) $product->bulk_threshold : null;
        $bulkPrice = $hasBulkTier ? (float) $product->bulk_price : null;

        // Collect and normalize custom tiers from product_pricing_tiers
        $rawCustomTiers = $product->relationLoaded('pricingTiers') ? $product->pricingTiers : $product->pricingTiers()->get();
        $customTiers = [];
        if ($rawCustomTiers && $rawCustomTiers->isNotEmpty()) {
            foreach ($rawCustomTiers as $cTier) {
                $cMin = (int) $cTier->min_quantity;
                $cMax = $cTier->max_quantity !== null ? (int) $cTier->max_quantity : null;
                $cPrice = (float) $cTier->unit_price;

                if ($cMin <= 0 || $cPrice <= 0) {
                    continue;
                }

                $customTiers[] = [
                    'id' => $cTier->id ?? null,
                    'min' => $cMin,
                    'max' => $cMax,
                    'price' => $cPrice,
                    'label' => (!empty($cTier->tier_name) && is_string($cTier->tier_name)) ? $cTier->tier_name : 'Volume Tier',
                ];
            }
        }

        // Deduplicate custom tiers that are identical to each other
        $uniqueCustomTiers = [];
        foreach ($customTiers as $c) {
            $isDupe = false;
            foreach ($uniqueCustomTiers as $u) {
                if ($u['min'] === $c['min'] && $u['max'] === $c['max'] && abs($u['price'] - $c['price']) < 0.001) {
                    $isDupe = true;
                    break;
                }
            }
            if (!$isDupe) {
                $uniqueCustomTiers[] = $c;
            }
        }

        // Identify custom tier that corresponds to the MOQ bracket
        $standardMaxQty = null;
        $filteredCustomTiers = [];
        foreach ($uniqueCustomTiers as $c) {
            if ($c['min'] === $moq) {
                // This custom tier represents the standard MOQ tier
                if ($c['max'] !== null && $c['max'] >= $moq) {
                    $standardMaxQty = $c['max'];
                }
                // If custom tier has price matching or overriding standard price, absorb it
                if (abs($c['price'] - $stdPrice) < 0.001) {
                    // Exact price match: absorb into Standard tier without adding as Volume Tier
                    continue;
                }
            }
            $filteredCustomTiers[] = $c;
        }

        // Determine lowest higher tier threshold above MOQ to bound Standard tier if not already bounded
        $higherThresholds = [];
        if ($hasBulkTier && $bulkThreshold > $moq) {
            $higherThresholds[] = $bulkThreshold;
        }
        foreach ($filteredCustomTiers as $c) {
            if ($c['min'] > $moq) {
                $higherThresholds[] = $c['min'];
            }
        }

        if (!empty($higherThresholds)) {
            $lowestHigherMin = min($higherThresholds);
            if ($standardMaxQty === null || $standardMaxQty >= $lowestHigherMin) {
                $standardMaxQty = $lowestHigherMin - 1;
            }
        }

        // 1. Standard Tier
        $standardBasis = $standardMaxQty
            ? "{$moq}–{$standardMaxQty} pcs"
            : "{$moq}+ pcs (Minimum Order)";

        $tiers = [];
        $tiers[] = [
            'tierName' => 'Standard',
            'quantityBasis' => $standardBasis,
            'unitPrice' => $stdPrice,
            'totalPrice' => round($stdPrice * $moq, 2),
            '_min_qty' => $moq,
            '_max_qty' => $standardMaxQty,
            '_is_custom' => false,
        ];

        // 2. Custom Pricing Tiers
        foreach ($filteredCustomTiers as $c) {
            $cMin = $c['min'];
            $cMax = $c['max'];
            $cPrice = $c['price'];
            $tierLabel = $c['label'];

            // Deduplicate if identical in min and price to Standard
            if ($cMin === $moq && abs($cPrice - $stdPrice) < 0.001) {
                continue;
            }

            $cBasis = $cMax ? "{$cMin}–{$cMax} pcs" : "{$cMin}+ pcs";
            $tiers[] = [
                'tierName' => $tierLabel,
                'quantityBasis' => $cBasis,
                'unitPrice' => $cPrice,
                'totalPrice' => round($cPrice * $cMin, 2),
                '_min_qty' => $cMin,
                '_max_qty' => $cMax,
                '_is_custom' => true,
            ];
        }

        // 3. Bulk Tier (if enabled and not already covered by a custom tier)
        if ($hasBulkTier) {
            $isDuplicateBulk = false;
            foreach ($tiers as $existingTier) {
                if (($existingTier['_min_qty'] ?? 0) === $bulkThreshold && abs(($existingTier['unitPrice'] ?? 0) - $bulkPrice) < 0.001) {
                    $isDuplicateBulk = true;
                    break;
                }
            }
            if (!$isDuplicateBulk) {
                $tiers[] = [
                    'tierName' => 'Bulk',
                    'quantityBasis' => "{$bulkThreshold}+ pcs",
                    'unitPrice' => $bulkPrice,
                    'totalPrice' => round($bulkPrice * $bulkThreshold, 2),
                    '_min_qty' => $bulkThreshold,
                    '_max_qty' => null,
                    '_is_custom' => false,
                ];
            }
        }

        // 4. Full Stock Tier
        $fsQty = (int) (self::resolveFullStockQuantity($product) ?? 0);
        if ($product->full_stock_price !== null && (float) $product->full_stock_price > 0 && $fsQty > 0) {
            $fsPrice = (float) $product->getResolvedFullStockPrice($fsQty);
            // Prevent emitting redundant derived Full Stock row when quantity basis and unit price are identical to the Standard row
            $isRedundantWithStandard = ($fsQty <= $moq && abs($fsPrice - $stdPrice) < 0.001);

            // Also prevent duplicate if identical to an existing tier
            $isDuplicateOfExisting = false;
            foreach ($tiers as $existingTier) {
                if (($existingTier['_min_qty'] ?? 0) === $fsQty && abs(($existingTier['unitPrice'] ?? 0) - $fsPrice) < 0.001) {
                    $isDuplicateOfExisting = true;
                    break;
                }
            }

            if (!$isRedundantWithStandard && !$isDuplicateOfExisting) {
                $tiers[] = [
                    'tierName' => 'Full Stock',
                    'quantityBasis' => number_format($fsQty) . " pcs (Available Stock)",
                    'unitPrice' => $fsPrice,
                    'totalPrice' => round($fsPrice * $fsQty, 2),
                    'quantity' => $fsQty,
                    '_min_qty' => $fsQty,
                    '_max_qty' => null,
                    '_is_custom' => false,
                ];
            }
        }

        // Sort logically by _min_qty ascending, then by unitPrice descending for ties at same quantity
        usort($tiers, function ($a, $b) {
            $cmp = ($a['_min_qty'] ?? 0) <=> ($b['_min_qty'] ?? 0);
            if ($cmp !== 0) {
                return $cmp;
            }
            return ($b['unitPrice'] ?? 0) <=> ($a['unitPrice'] ?? 0);
        });

        return array_map(function ($t) {
            unset($t['_min_qty'], $t['_max_qty'], $t['_is_custom']);
            return $t;
        }, $tiers);
    }
}
