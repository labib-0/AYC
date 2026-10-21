<?php

namespace Tests\Feature\Documents;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductPricingTier;
use App\Models\ProductShippingPackageProfile;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Documents\CommercialPdfArtifactService;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProductOfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

class ProformaInvoiceConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private ProformaInvoiceService $piService;
    private OfferSheetService $offerSheetService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);

        $this->customer = User::factory()->create([
            'name' => 'Synthetic Test Buyer',
            'email' => 'synthetic-buyer@example.test',
            'role' => 'customer',
            'company_name' => 'Synthetic Retail Corp',
        ]);

        $this->piService = app(ProformaInvoiceService::class);
        $this->offerSheetService = app(OfferSheetService::class);

        SystemSetting::set('business_email', 'sales@ayaanclothing.com');
    }

    /**
     * Test A4 / C1: The supplied regression case (100 pcs @ 4.30, 50 pcs @ 7.00, 1000 pcs @ 4.20)
     * reconciles strictly to $4,980.00 with $0.00 tax and unpriced shipping.
     * Reconciles Denim SKU to HER-PAN-MEN-1125-01 per visual baseline.
     * Verifies standard-package labeling (MOQ basis for item 3).
     */
    public function test_pi_total_calculation_reconciles_regression_case_to_4980(): void
    {
        $prod1 = Product::factory()->create([
            'name' => 'Interlock Jacket',
            'sku' => 'JAC-JAC-MEN-1363-01',
            'wholesale_price' => 4.50,
            'full_stock_price' => 4.30,
            'moq' => 100,
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $prod1->id,
            'package_quantity' => 100,
            'carton_count' => 9,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'gross_weight' => 16.0,
            'is_active' => true,
        ]);

        $prod2 = Product::factory()->create([
            'name' => 'Sherpa Jacket',
            'sku' => 'OLD-JAC-MEN-8087-01',
            'wholesale_price' => 7.00,
            'moq' => 50,
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $prod2->id,
            'package_quantity' => 50,
            'carton_count' => 3,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'gross_weight' => 16.0,
            'is_active' => true,
        ]);

        $prod3 = Product::factory()->create([
            'name' => 'Denim Long Pant',
            'sku' => 'HER-PAN-MEN-1125-01', // Reconciled SKU matching visual regression baseline
            'wholesale_price' => 4.20,
            'full_stock_price' => 4.00,
            'moq' => 500,
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $prod3->id,
            'package_quantity' => 500,
            'carton_count' => 18,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'gross_weight' => 22.0,
            'is_active' => true,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-TEST-4980',
            'carrier' => 'AYAAN CLOTHING Export Desk',
            'shipping_method' => 'Discuss Directly — Freight Arranged by Export Team',
            'shipping_cost' => 0.00,
            'tax_amount' => 249.00, // Simulates legacy storefront checkout 5% tax stored on order
            'discount_amount' => 0.00,
            'subtotal' => 4980.00,
            'total_amount' => 5229.00, // Legacy total including tax
            'currency' => 'USD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $prod1->id,
            'product_name' => $prod1->name,
            'sku' => $prod1->sku,
            'quantity' => 100,
            'unit_price' => 4.30, // Order-specific negotiated/full-stock price
            'line_total' => 430.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $prod2->id,
            'product_name' => $prod2->name,
            'sku' => $prod2->sku,
            'quantity' => 50,
            'unit_price' => 7.00,
            'line_total' => 350.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $prod3->id,
            'product_name' => $prod3->name,
            'sku' => $prod3->sku,
            'quantity' => 1000, // Ordered quantity 1,000 pcs (vs MOQ profile 500 pcs)
            'unit_price' => 4.20,
            'line_total' => 4200.00,
        ]);

        $order->load(['items.product.shippingPackageProfiles', 'user']);

        $payload = $this->piService->generateForOrder($order);

        // Subtotal must be exactly 4980.00
        $this->assertEquals(4980.00, $payload['subtotal']);
        $this->assertEquals(4980.00, $payload['financials']['subtotal']);

        // Tax must be strictly 0.00 (Zero-rated B2B export)
        $this->assertEquals(0.00, $payload['tax']);
        $this->assertEquals(0.00, $payload['financials']['tax_amount']);

        // Shipping is excluded / unpriced (0.00)
        $this->assertEquals(0.00, $payload['shipping']);

        // Grand total / merchandise payable must reconcile to 4980.00 (NOT 5229.00)
        $this->assertEquals(4980.00, $payload['grandTotal']);
        $this->assertEquals(4980.00, $payload['financials']['grand_total']);
        $this->assertEquals(4980.00, $payload['financials']['total_payable']);

        // Standard Package labeling check:
        // Item 1: ordered 100 pcs matches profile 100 pcs
        $this->assertEquals('Standard Package: 100 pcs (9 cartons)', $payload['items'][0]['standard_package']);
        // Item 2: ordered 50 pcs matches profile 50 pcs
        $this->assertEquals('Standard Package: 50 pcs (3 cartons)', $payload['items'][1]['standard_package']);
        // Item 3: ordered 1,000 pcs vs profile 500 pcs -> unambiguously labeled as MOQ basis
        $this->assertEquals('Standard Package (MOQ basis): 500 pcs (18 cartons)', $payload['items'][2]['standard_package']);

        // Render Blade template to verify HTML presentation
        $html = View::make('pdf.proforma-invoice', ['doc' => $payload])->render();

        // A1: No HS Code column
        $this->assertStringNotContainsString('HS Code', $html);
        $this->assertStringNotContainsString('HS CODE', $html);

        // A2: Description of Goods without Assortment
        $this->assertStringContainsString('Description of Goods', $html);
        $this->assertStringNotContainsString('& Package Assortment', $html);
        $this->assertStringNotContainsString('Assortment:', $html);
        $this->assertStringNotContainsString('standard export assortment', $html);

        // A3: Estimated Tax presentation with Zero-rated together
        $this->assertStringContainsString('Estimated Tax (B2B Export):', $html);
        $this->assertStringContainsString('(Zero-rated)', $html);
        $this->assertStringContainsString('$0.00 &nbsp;<span style="font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 8.0pt; font-weight: normal; color: #64748b;">(Zero-rated)</span>', $html);

        // A4: Reconciled totals in rendered HTML
        $this->assertStringContainsString('MERCHANDISE TOTAL:', $html);
        $this->assertStringContainsString('$4,980.00 USD', $html);
        $this->assertStringNotContainsString('$5,229.00', $html);
        $this->assertStringNotContainsString('TOTAL PAYABLE:', $html);

        // Confirmed shipping exclusion notices
        $this->assertStringContainsString('Shipping arrangements to be confirmed separately.', $html);
        $this->assertStringContainsString('Shipping charges are NOT included in the merchandise total below.', $html);

        // A5: Single coherent signature block
        $this->assertStringContainsString('class="sig-block"', $html);
        $this->assertStringContainsString('Authorized Signatory', $html);
        $this->assertStringContainsString('Ayaan Clothing Ltd • Dhaka, Bangladesh', $html);

        // A6: SWIFT / BIC label
        $this->assertStringContainsString('SWIFT / BIC:', $html);

        // A7: Authoritative email in both header and beneficiary card
        $this->assertStringContainsString('Email: sales@ayaanclothing.com', $html);
        $this->assertStringContainsString('Contact: sales@ayaanclothing.com', $html);
        $this->assertStringNotContainsString('export@ayaanclothing.com', $html);

        // Standard Package (MOQ basis) rendered in HTML
        $this->assertStringContainsString('Standard Package (MOQ basis): 500 pcs (18 cartons)', $html);
    }

    /**
     * Test A4: Legitimate order-specific price overrides are preserved and not overwritten by catalog prices.
     */
    public function test_pi_preserves_legitimate_order_specific_price_overrides(): void
    {
        $product = Product::factory()->create([
            'name' => 'Custom Negotiated Blazer',
            'sku' => 'BLZ-NEG-001',
            'wholesale_price' => 35.00, // Catalog price
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-OVERRIDE-001',
            'shipping_cost' => 0.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'subtotal' => 2800.00, // 100 pcs @ 28.00 negotiated override
            'total_amount' => 2800.00,
            'currency' => 'USD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 100,
            'unit_price' => 28.00, // Negotiated unit price
            'line_total' => 2800.00,
        ]);

        $order->load(['items.product', 'user']);

        $payload = $this->piService->generateForOrder($order);

        $this->assertEquals(28.00, $payload['items'][0]['unit_price']);
        $this->assertEquals(2800.00, $payload['items'][0]['line_total']);
        $this->assertEquals(2800.00, $payload['subtotal']);
        $this->assertEquals(2800.00, $payload['grandTotal']);

        $html = View::make('pdf.proforma-invoice', ['doc' => $payload])->render();
        $this->assertStringContainsString('$28.00', $html);
        $this->assertStringContainsString('$2,800.00', $html);
        $this->assertStringNotContainsString('$35.00', $html);
    }

    /**
     * Test: Positive stored shipping charges (Aramex) do not change the PI merchandise total ($4,980.00).
     * No shipping monetary line is rendered, and MERCHANDISE TOTAL is strictly maintained.
     */
    public function test_pi_with_positive_explicitly_priced_shipping_aramex(): void
    {
        $product = Product::factory()->create([
            'name' => 'Export Hoodie',
            'sku' => 'HOD-EXP-001',
            'wholesale_price' => 10.00,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-SHP-ARAMEX',
            'carrier' => 'Aramex Priority Air Express',
            'shipping_method' => 'Aramex Air Express',
            'shipping_cost' => 350.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'subtotal' => 4980.00,
            'total_amount' => 5330.00,
            'currency' => 'USD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 498,
            'unit_price' => 10.00,
            'line_total' => 4980.00,
        ]);

        $order->load(['items.product', 'user']);

        $payload = $this->piService->generateForOrder($order);

        // Subtotal must be 4980.00
        $this->assertEquals(4980.00, $payload['subtotal']);
        // Shipping is strictly excluded from PI monetary calculation
        $this->assertEquals(0.00, $payload['shipping']);
        $this->assertEquals(0.00, $payload['financials']['shipping_charge']);
        // Grand total / merchandise payable must remain 4980.00 (NOT 5330.00)
        $this->assertEquals(4980.00, $payload['grandTotal']);
        $this->assertEquals(4980.00, $payload['financials']['grand_total']);
        $this->assertEquals(4980.00, $payload['financials']['total_payable']);

        $html = View::make('pdf.proforma-invoice', ['doc' => $payload])->render();

        // Must NOT render shipping monetary line or TOTAL PAYABLE
        $this->assertStringNotContainsString('Air Shipping — Aramex:', $html);
        $this->assertStringNotContainsString('TOTAL PAYABLE:', $html);
        $this->assertStringNotContainsString('$5,330.00', $html);

        // Must render MERCHANDISE TOTAL and exclusion notices
        $this->assertStringContainsString('MERCHANDISE TOTAL:', $html);
        $this->assertStringContainsString('$4,980.00 USD', $html);
        $this->assertStringContainsString('Shipping arrangements to be confirmed separately.', $html);
        $this->assertStringContainsString('Shipping charges are NOT included in the merchandise total below.', $html);
        $this->assertStringContainsString('Aramex Air Express', $html);
    }

    /**
     * Test: Positive stored shipping charges (DHL Express) do not change the PI merchandise total ($4,980.00).
     */
    public function test_pi_with_positive_explicitly_priced_shipping_non_aramex(): void
    {
        $product = Product::factory()->create([
            'name' => 'Export Polo',
            'sku' => 'POL-EXP-001',
            'wholesale_price' => 5.00,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-SHP-DHL',
            'carrier' => 'DHL Express',
            'shipping_method' => 'DHL Express Worldwide',
            'shipping_cost' => 220.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'subtotal' => 4980.00,
            'total_amount' => 5200.00,
            'currency' => 'USD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 996,
            'unit_price' => 5.00,
            'line_total' => 4980.00,
        ]);

        $order->load(['items.product', 'user']);

        $payload = $this->piService->generateForOrder($order);

        $this->assertEquals(4980.00, $payload['subtotal']);
        $this->assertEquals(0.00, $payload['shipping']);
        $this->assertEquals(0.00, $payload['financials']['shipping_charge']);
        $this->assertEquals(4980.00, $payload['grandTotal']);
        $this->assertEquals(4980.00, $payload['financials']['grand_total']);
        $this->assertEquals(4980.00, $payload['financials']['total_payable']);

        $html = View::make('pdf.proforma-invoice', ['doc' => $payload])->render();

        $this->assertStringNotContainsString('Shipping — DHL Express:', $html);
        $this->assertStringNotContainsString('TOTAL PAYABLE:', $html);
        $this->assertStringNotContainsString('$5,200.00', $html);

        $this->assertStringContainsString('MERCHANDISE TOTAL:', $html);
        $this->assertStringContainsString('$4,980.00 USD', $html);
        $this->assertStringContainsString('Shipping arrangements to be confirmed separately.', $html);
        $this->assertStringContainsString('Shipping charges are NOT included in the merchandise total below.', $html);
        $this->assertStringContainsString('DHL Express Worldwide', $html);
    }

    /**
     * Test: Unpriced / excluded shipping with non-Aramex arrangement (Sea Freight FOB Chittagong).
     */
    public function test_pi_with_zero_or_unpriced_shipping_non_aramex(): void
    {
        $product = Product::factory()->create([
            'name' => 'Cargo Trousers',
            'sku' => 'TR-SEA-001',
            'wholesale_price' => 6.00,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-SHP-SEA',
            'carrier' => 'Ocean Freight / Sea Cargo',
            'shipping_method' => 'Sea Freight FOB Chittagong',
            'shipping_cost' => 0.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'subtotal' => 4980.00,
            'total_amount' => 4980.00,
            'currency' => 'USD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 830,
            'unit_price' => 6.00,
            'line_total' => 4980.00,
        ]);

        $order->load(['items.product', 'user']);

        $payload = $this->piService->generateForOrder($order);

        $this->assertEquals(4980.00, $payload['subtotal']);
        $this->assertEquals(0.00, $payload['shipping']);
        $this->assertEquals(4980.00, $payload['grandTotal']);

        $html = View::make('pdf.proforma-invoice', ['doc' => $payload])->render();
        $this->assertStringContainsString('Sea Freight FOB Chittagong', $html);
        $this->assertStringContainsString('MERCHANDISE TOTAL:', $html);
        $this->assertStringContainsString('$4,980.00 USD', $html);
        $this->assertStringContainsString('Shipping arrangements to be confirmed separately.', $html);
        $this->assertStringContainsString('Shipping charges are NOT included in the merchandise total below.', $html);
    }

    /**
     * Test: Discounts with appropriate rounding on PI totals.
     */
    public function test_pi_discounts_and_rounding(): void
    {
        $product = Product::factory()->create([
            'name' => 'Winter Jacket',
            'sku' => 'JAC-WIN-001',
            'wholesale_price' => 15.00,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'order_number' => 'ORD-DISC-ROUND',
            'coupon_code' => 'PROMO150',
            'discount_amount' => 150.25,
            'shipping_cost' => 0.00,
            'tax_amount' => 0.00,
            'subtotal' => 4980.00,
            'total_amount' => 4829.75,
            'currency' => 'USD',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 332,
            'unit_price' => 15.00,
            'line_total' => 4980.00,
        ]);

        $order->load(['items.product', 'user']);

        $payload = $this->piService->generateForOrder($order);

        $this->assertEquals(4980.00, $payload['subtotal']);
        $this->assertEquals(150.25, $payload['discount']);
        $this->assertEquals(4829.75, $payload['grandTotal']);
        $this->assertEquals(4829.75, $payload['financials']['total_payable']);

        $html = View::make('pdf.proforma-invoice', ['doc' => $payload])->render();
        $this->assertStringContainsString('Discount (PROMO150):', $html);
        $this->assertStringContainsString('-$150.25', $html);
        $this->assertStringContainsString('$4,829.75 USD', $html);
    }

    /**
     * Test B1 & B2: Offer Sheet storefront description parity, period spacing, and spec deduplication.
     */
    public function test_offer_sheet_description_parity_and_spec_deduplication(): void
    {
        $product = Product::factory()->create([
            'name' => 'Mens Sherpa Fleece Jacket',
            'sku' => 'SHERPA-001',
            'wholesale_price' => 7.00,
            'moq' => 50,
            'material' => 'Fabric / Composition: 65% Cotton, 35% Polyster',
            'description' => "Item: Mens Sherpa Fleece Jacket\nBrand: Old Navy\nQuantity: 50 pcs\nColors: Heather Grey, Black\nSizes: M to 3XL\nMaterials: Fabric / Composition: 65% Cotton, 35% Polyster",
        ]);

        $payload = $this->offerSheetService->generateForProduct($product);
        $html = View::make('pdf.offer-sheet', $payload)->render();

        // B1: Description must NOT be stripped or replaced by fallback
        $this->assertStringContainsString('Item: Mens Sherpa Fleece Jacket', $html);
        $this->assertStringContainsString('Brand: Old Navy', $html);

        // B2: Specification value must strip redundant prefix
        $this->assertStringContainsString('<td class="spec-label">Fabric / Composition</td>', $html);
        $this->assertStringContainsString('<td class="spec-val">65% Cotton, 35% Polyster</td>', $html);
        $this->assertStringNotContainsString('<td class="spec-val">Fabric / Composition: 65% Cotton', $html);
    }

    /**
     * Test B1: Spacing fix for "daily wear.Perfect" -> "daily wear. Perfect"
     */
    public function test_offer_sheet_resolves_period_space_in_description(): void
    {
        $product = Product::factory()->create([
            'name' => 'Mens Interlock Jacket',
            'sku' => 'INT-001',
            'wholesale_price' => 4.50,
            'moq' => 100,
            'description' => "Clean style for daily wear.Perfect for **clothing** **wholesalers**, importers.",
        ]);

        $payload = $this->offerSheetService->generateForProduct($product);
        $html = View::make('pdf.offer-sheet', $payload)->render();

        // Must insert space after period
        $this->assertStringContainsString('daily wear. Perfect for', $html);
        $this->assertStringNotContainsString('daily wear.Perfect', $html);

        // Must parse markdown bold
        $this->assertStringContainsString('<strong>clothing</strong>', $html);
        $this->assertStringContainsString('<strong>wholesalers</strong>', $html);
    }

    /**
     * Test B3: Offer Sheet eliminates redundant derived Full Stock tier when price & quantity match Standard (Product 210 case).
     */
    public function test_offer_sheet_eliminates_redundant_derived_full_stock_tier_product_210(): void
    {
        $product = Product::factory()->create([
            'name' => 'MENS SHERPA JACKETS',
            'sku' => 'OLD-JAC-MEN-8087-01',
            'wholesale_price' => 7.00,
            'moq' => 50,
            'full_stock_price' => 7.00,
            'stock' => 50, // Available stock equals MOQ, price identical
        ]);

        $tiers = OfferSheetService::buildPricingTiers($product);

        // Must emit ONLY Standard tier, Full Stock must NOT be duplicated
        $this->assertCount(1, $tiers);
        $this->assertEquals('Standard', $tiers[0]['tierName']);
        $this->assertEquals(7.00, $tiers[0]['unitPrice']);
        $this->assertEquals(350.00, $tiers[0]['totalPrice']);

        $payload = $this->offerSheetService->generateForProduct($product);
        $html = View::make('pdf.offer-sheet', $payload)->render();

        $this->assertStringContainsString('Standard', $html);
        $this->assertStringNotContainsString('Full Stock', $html);
    }

    /**
     * Test B3: Full configured pricing schedule builds all distinct tiers (Standard, Volume, Bulk, Full Stock)
     * and preserves genuine distinct tiers for Products 198 and 213.
     */
    public function test_offer_sheet_preserves_distinct_configured_pricing_tiers(): void
    {
        // Case A: Product 198 (100 MOQ @ $4.50, Full Stock 160 pcs @ $4.30)
        $prod198 = Product::factory()->create([
            'name' => 'Mens Interlock Jacket',
            'sku' => 'JAC-JAC-MEN-1363-01',
            'wholesale_price' => 4.50,
            'moq' => 100,
            'full_stock_price' => 4.30,
            'stock' => 160,
        ]);

        $tiers198 = OfferSheetService::buildPricingTiers($prod198);
        $this->assertCount(2, $tiers198);
        $this->assertEquals('Standard', $tiers198[0]['tierName']);
        $this->assertEquals(4.50, $tiers198[0]['unitPrice']);
        $this->assertEquals('Full Stock', $tiers198[1]['tierName']);
        $this->assertEquals(4.30, $tiers198[1]['unitPrice']);
        $this->assertEquals(688.00, $tiers198[1]['totalPrice']);

        // Case B: Product 213 (500 MOQ @ $4.20, Full Stock 27,000 pcs @ $4.00)
        $prod213 = Product::factory()->create([
            'name' => 'MEN\'S 5 POCKET DENIM LONG PANT',
            'sku' => 'HER-PAN-MEN-1125-01',
            'wholesale_price' => 4.20,
            'moq' => 500,
            'full_stock_price' => 4.00,
            'stock' => 27000,
        ]);

        $tiers213 = OfferSheetService::buildPricingTiers($prod213);
        $this->assertCount(2, $tiers213);
        $this->assertEquals('Standard', $tiers213[0]['tierName']);
        $this->assertEquals(4.20, $tiers213[0]['unitPrice']);
        $this->assertEquals('Full Stock', $tiers213[1]['tierName']);
        $this->assertEquals(4.00, $tiers213[1]['unitPrice']);
        $this->assertEquals(108000.00, $tiers213[1]['totalPrice']);

        // Case C: Multi-tier with custom volume and bulk
        $prodMulti = Product::factory()->create([
            'name' => 'Multi-Tiered Henley Shirt',
            'sku' => 'HENLEY-001',
            'wholesale_price' => 5.00,
            'moq' => 100,
            'bulk_pricing_enabled' => true,
            'bulk_price' => 4.50,
            'bulk_threshold' => 500,
            'full_stock_price' => 4.20,
            'stock' => 2000,
        ]);

        ProductPricingTier::create([
            'product_id' => $prodMulti->id,
            'min_quantity' => 250,
            'max_quantity' => 499,
            'unit_price' => 4.80,
        ]);

        $prodMulti->load('pricingTiers');

        $tiersMulti = OfferSheetService::buildPricingTiers($prodMulti);
        $this->assertCount(4, $tiersMulti);
        $this->assertEquals('Standard', $tiersMulti[0]['tierName']);
        $this->assertEquals('Volume Tier', $tiersMulti[1]['tierName']);
        $this->assertEquals('Bulk', $tiersMulti[2]['tierName']);
        $this->assertEquals('Full Stock', $tiersMulti[3]['tierName']);
    }

    /**
     * Test B4: Offer Sheet gross-weight communicates both total and per-carton gross weight accurately.
     */
    public function test_offer_sheet_gross_weight_presentation_communicates_total_and_per_carton(): void
    {
        $product = Product::factory()->create([
            'name' => 'MEN\'S 5 POCKET DENIM LONG PANT',
            'sku' => 'HER-PAN-MEN-1125-01',
            'moq' => 500,
            'wholesale_price' => 4.20,
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $product->id,
            'package_quantity' => 500,
            'carton_count' => 18,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'gross_weight' => 22.0,
            'is_active' => true,
        ]);

        $product->load('shippingPackageProfiles');

        $payload = $this->offerSheetService->generateForProduct($product);
        $html = View::make('pdf.offer-sheet', $payload)->render();

        $this->assertStringContainsString('GROSS WEIGHT (MOQ)', $html);
        $this->assertStringContainsString('396.0 KG total (22.0 KG/carton)', $html);

        // Single carton case
        $prodSingle = Product::factory()->create([
            'name' => 'Single Carton Polo',
            'sku' => 'POLO-SINGLE-01',
            'moq' => 50,
            'wholesale_price' => 5.00,
        ]);

        ProductShippingPackageProfile::create([
            'product_id' => $prodSingle->id,
            'package_quantity' => 50,
            'carton_count' => 1,
            'carton_length' => 60,
            'carton_width' => 40,
            'carton_height' => 30,
            'gross_weight' => 16.0,
            'is_active' => true,
        ]);

        $prodSingle->load('shippingPackageProfiles');
        $payloadSingle = $this->offerSheetService->generateForProduct($prodSingle);
        $htmlSingle = View::make('pdf.offer-sheet', $payloadSingle)->render();

        $this->assertStringContainsString('16.0 KG', $htmlSingle);
        $this->assertStringNotContainsString('KG total', $htmlSingle);
    }

    /**
     * Test B3: Exhaustive regression coverage for pricing-tier types:
     * - Different price at same quantity preserved.
     * - Overlapping quantity thresholds preserved.
     * - Redundant duplicate custom tiers deduplicated.
     */
    public function test_offer_sheet_pricing_tiers_exhaustive_permutations(): void
    {
        $product = Product::factory()->create([
            'name' => 'Permutation Jacket',
            'sku' => 'PERM-001',
            'wholesale_price' => 10.00,
            'moq' => 100,
        ]);

        // 1. Different price at same quantity (100 pcs @ 9.00 vs standard 10.00)
        ProductPricingTier::create([
            'product_id' => $product->id,
            'min_quantity' => 100,
            'max_quantity' => 249,
            'unit_price' => 9.00,
        ]);

        // 2. Overlapping threshold (200-400 @ 8.50)
        ProductPricingTier::create([
            'product_id' => $product->id,
            'min_quantity' => 200,
            'max_quantity' => 400,
            'unit_price' => 8.50,
        ]);

        // 3. Exact duplicate of tier 2 (should be deduplicated)
        ProductPricingTier::create([
            'product_id' => $product->id,
            'min_quantity' => 200,
            'max_quantity' => 400,
            'unit_price' => 8.50,
        ]);

        $product->load('pricingTiers');

        $tiers = OfferSheetService::buildPricingTiers($product);

        // Standard ($10.00) + Tier 1 ($9.00) + Tier 2 ($8.50) = 3 tiers (duplicate removed)
        $this->assertCount(3, $tiers);
        $this->assertEquals(10.00, $tiers[0]['unitPrice']);
        $this->assertEquals(9.00, $tiers[1]['unitPrice']);
        $this->assertEquals('200–400 pcs', $tiers[2]['quantityBasis']);
        $this->assertEquals(8.50, $tiers[2]['unitPrice']);
        $this->assertEquals(1700.00, $tiers[2]['totalPrice']);
    }
}
