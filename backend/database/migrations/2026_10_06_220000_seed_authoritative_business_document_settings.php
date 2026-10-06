<?php

use App\Models\SystemSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Non-destructive additive seeding of authoritative business and document settings.
     */
    public function up(): void
    {
        $defaults = [
            // Company Master
            ['key' => 'company_name', 'value' => 'AYAAN CLOTHING', 'type' => 'string', 'group' => 'business'],
            ['key' => 'company_legal_name', 'value' => 'M/S AYAAN  CLOTHING', 'type' => 'string', 'group' => 'business'],
            ['key' => 'company_brand_mark', 'value' => 'AYC', 'type' => 'string', 'group' => 'business'],
            ['key' => 'company_business_type', 'value' => 'Ready-made Garments Manufacturer & Exporter', 'type' => 'string', 'group' => 'business'],
            ['key' => 'company_established_year', 'value' => '2010', 'type' => 'integer', 'group' => 'business'],

            // Contact Information
            ['key' => 'office_address_line1', 'value' => 'House #33 (2nd floor)', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_address_line2', 'value' => 'Road #12, Sector #11', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_area', 'value' => 'Uttara', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_city', 'value' => 'Dhaka', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_postal_code', 'value' => '1230', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_country', 'value' => 'Bangladesh', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_country_code', 'value' => 'BD', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'office_address_formatted', 'value' => 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'business_email', 'value' => 'export@ayaanclothing.com', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'business_website', 'value' => 'www.ayaanclothing.com', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'whatsapp_display', 'value' => '+880 1620-853502', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'whatsapp_number', 'value' => '8801620853502', 'type' => 'string', 'group' => 'contact'],
            ['key' => 'whatsapp_business_number', 'value' => '8801620853502', 'type' => 'string', 'group' => 'contact'],

            // Beneficiary Banking
            ['key' => 'bank_is_configured', 'value' => '1', 'type' => 'boolean', 'group' => 'banking'],
            ['key' => 'bank_name', 'value' => 'Pubali Bank Limited', 'type' => 'string', 'group' => 'banking'],
            ['key' => 'bank_account_title', 'value' => 'M/S AYAAN  CLOTHING', 'type' => 'string', 'group' => 'banking'],
            ['key' => 'bank_beneficiary_name', 'value' => 'M/S AYAAN  CLOTHING', 'type' => 'string', 'group' => 'banking'],
            ['key' => 'bank_account_number', 'value' => '1788-901-044316', 'type' => 'string', 'group' => 'banking'],
            ['key' => 'bank_swift_code', 'value' => 'PUBABDDH210', 'type' => 'string', 'group' => 'banking'],
            ['key' => 'bank_branch', 'value' => 'Nawabpur Road Branch', 'type' => 'string', 'group' => 'banking'],
            ['key' => 'bank_address', 'value' => "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh", 'type' => 'string', 'group' => 'banking'],

            // Document Defaults
            ['key' => 'default_country_of_origin', 'value' => 'Bangladesh', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_air_port_of_loading', 'value' => 'Hazrat Shahjalal International Airport (DAC), Dhaka', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_sea_port_of_loading', 'value' => 'Chattogram Sea Port (CGP), Bangladesh', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_place_of_receipt', 'value' => 'Uttara Corporate Office / Dhaka Hub, Bangladesh', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_currency', 'value' => 'USD', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_payment_terms', 'value' => 'Bank Wire Transfer (T/T Advance)', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_shipping_terms', 'value' => 'Express Air Freight (DAP / DDP)', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_incoterm', 'value' => 'DAP', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_ci_notes', 'value' => 'Official Commercial Invoice. All merchandise manufactured in Bangladesh.', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_pi_notes', 'value' => 'Commercial Proforma Invoice. Please remit payment against provided Beneficiary Bank Details.', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_offer_sheet_notes', 'value' => 'Commercial Offer only — Not an invoice. Shipping arranged separately.', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'default_quotation_notes', 'value' => 'Official export quotation issued by Ayaan Clothing Export Division. Valid for 30 days.', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'signatory_title', 'value' => 'Authorized Signatory & Official Stamp', 'type' => 'string', 'group' => 'document_defaults'],
            ['key' => 'signatory_division', 'value' => 'Ayaan Clothing Export Division', 'type' => 'string', 'group' => 'document_defaults'],
        ];

        foreach ($defaults as $item) {
            if (!SystemSetting::where('key', $item['key'])->exists()) {
                SystemSetting::create($item);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe additive migration — preserve data
    }
};
