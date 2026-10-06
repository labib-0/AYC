<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalPage;
use App\Models\SystemSetting;
use App\Services\Audit\ActivityLogger;
use App\Services\Documents\DocumentHelper;
use App\Services\Media\SvgSanitizer;
use App\Services\Settings\WhatsAppNormalizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AdminSettingsController extends Controller
{
    /**
     * Retrieve all admin-managed storefront settings.
     */
    public function getSettings(): JsonResponse
    {
        $siteTitle = SystemSetting::get('site_title', config('app.name', 'AYAAN CLOTHING'));
        $siteLogo = SystemSetting::get('site_logo', null);
        $whatsappDisplay = SystemSetting::get('whatsapp_display', env('NEXT_PUBLIC_WHATSAPP_DISPLAY', WhatsAppNormalizationService::CANONICAL_DISPLAY));
        $whatsappNumber = SystemSetting::get('whatsapp_number', SystemSetting::get('whatsapp_business_number'));
        if (empty($whatsappNumber)) {
            $whatsappNumber = WhatsAppNormalizationService::deriveMachineNumber($whatsappDisplay);
        }

        // Self-heal known stale numbers to canonical
        $cleanDisplay = preg_replace('/\D+/', '', $whatsappDisplay ?? '') ?? '';
        $cleanNumber = preg_replace('/\D+/', '', $whatsappNumber ?? '') ?? '';
        if (in_array($cleanDisplay, WhatsAppNormalizationService::STALE_NUMBERS, true) || in_array($cleanNumber, WhatsAppNormalizationService::STALE_NUMBERS, true)) {
            $whatsappDisplay = WhatsAppNormalizationService::CANONICAL_DISPLAY;
            $whatsappNumber = WhatsAppNormalizationService::CANONICAL_NUMBER;
            SystemSetting::set('whatsapp_display', $whatsappDisplay, 'string', 'contact');
            SystemSetting::set('whatsapp_number', $whatsappNumber, 'string', 'contact');
            SystemSetting::set('whatsapp_business_number', $whatsappNumber, 'string', 'contact');
        }

        $whatsappUrl = WhatsAppNormalizationService::buildWhatsAppUrl($whatsappNumber);

        $socialLinks = SystemSetting::get('social_links', [
            [
                'id' => 'link_facebook',
                'provider' => 'facebook',
                'name' => 'Facebook',
                'url' => 'https://facebook.com',
                'icon' => 'facebook',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'id' => 'link_linkedin',
                'provider' => 'linkedin',
                'name' => 'LinkedIn',
                'url' => 'https://linkedin.com',
                'icon' => 'linkedin',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'id' => 'link_instagram',
                'provider' => 'instagram',
                'name' => 'Instagram',
                'url' => 'https://instagram.com',
                'icon' => 'instagram',
                'is_active' => true,
                'sort_order' => 3,
            ],
        ]);

        $footerDescription = SystemSetting::get('footer_description', 'Ready-made Garments Manufacturer & Exporter. Serving international retail chains and corporate apparel importers with export-grade ready-made garments.');

        return response()->json([
            'status' => 'success',
            'data' => [
                'site_title' => $siteTitle,
                'site_logo' => $siteLogo,
                'whatsapp_display' => $whatsappDisplay,
                'whatsapp_number' => $whatsappNumber,
                'whatsapp_url' => $whatsappUrl,
                'social_links' => $socialLinks,
                'footer_description' => $footerDescription,
            ],
        ]);
    }

    /**
     * Update admin-managed storefront settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'site_title' => ['required', 'string', 'max:255'],
            'whatsapp_display' => ['required', 'string', 'max:50'],
            'social_links' => ['nullable', 'array'],
            'social_links.*.id' => ['nullable', 'string'],
            'social_links.*.provider' => ['required', 'string', 'max:50'],
            'social_links.*.name' => ['required', 'string', 'max:100'],
            'social_links.*.url' => ['required', 'string', 'max:500'],
            'social_links.*.icon' => ['nullable', 'string', 'max:50'],
            'social_links.*.is_active' => ['required', 'boolean'],
            'social_links.*.sort_order' => ['nullable', 'integer'],
            'footer_description' => ['nullable', 'string', 'max:1000'],
        ]);

        $display = trim($validated['whatsapp_display']);

        // Strict Phone Validation (Section 5 & 6)
        if (!WhatsAppNormalizationService::isValidPhoneNumber($display)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The WhatsApp number must be a valid phone number (e.g. +880 1620-853502). Arbitrary text, URLs, and scripts are rejected.',
                'errors' => [
                    'whatsapp_display' => ['Please enter a valid international or local phone number (7 to 15 digits).'],
                ],
            ], 422);
        }

        // Normalize WhatsApp Display and automatically derive machine/URL number
        $machineNumber = WhatsAppNormalizationService::deriveMachineNumber($display);
        $oldDisplay = SystemSetting::get('whatsapp_display', WhatsAppNormalizationService::CANONICAL_DISPLAY);
        $oldNumber = SystemSetting::get('whatsapp_number', WhatsAppNormalizationService::CANONICAL_NUMBER);

        SystemSetting::set('site_title', trim($validated['site_title']), 'string', 'branding');
        SystemSetting::set('whatsapp_display', $display, 'string', 'contact');
        SystemSetting::set('whatsapp_number', $machineNumber, 'string', 'contact');
        SystemSetting::set('whatsapp_business_number', $machineNumber, 'string', 'contact');

        // Audit Logging (Section 18)
        if ($oldDisplay !== $display || $oldNumber !== $machineNumber) {
            ActivityLogger::log(
                'settings.whatsapp_updated',
                null,
                [
                    'old_display' => $oldDisplay,
                    'new_display' => $display,
                    'old_number' => $oldNumber,
                    'new_number' => $machineNumber,
                ]
            );
        }

        if (isset($validated['footer_description'])) {
            SystemSetting::set('footer_description', trim($validated['footer_description']), 'string', 'branding');
        }

        // Process social links
        if (isset($validated['social_links'])) {
            $processedLinks = [];
            foreach ($validated['social_links'] as $index => $link) {
                $provider = strtolower(trim($link['provider'] ?? 'website'));
                $processedLinks[] = [
                    'id' => !empty($link['id']) ? $link['id'] : 'link_' . Str::random(8),
                    'provider' => $provider,
                    'name' => trim($link['name']),
                    'url' => trim($link['url']),
                    'icon' => !empty($link['icon']) ? trim($link['icon']) : $provider,
                    'is_active' => (bool) $link['is_active'],
                    'sort_order' => isset($link['sort_order']) ? (int) $link['sort_order'] : ($index + 1),
                ];
            }
            // Sort by sort_order
            usort($processedLinks, fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);
            SystemSetting::set('social_links', $processedLinks, 'json', 'branding');
        }

        // Invalidate public settings cache
        Cache::forget('site_settings_public');

        return response()->json([
            'status' => 'success',
            'message' => 'Site settings updated successfully.',
            'data' => [
                'site_title' => SystemSetting::get('site_title'),
                'whatsapp_display' => $display,
                'whatsapp_number' => $machineNumber,
                'whatsapp_url' => WhatsAppNormalizationService::buildWhatsAppUrl($machineNumber),
            ],
        ]);
    }

    /**
     * Retrieve all centralized business, contact, export registration,
     * banking, and document defaults for the Admin Control Center.
     */
    public function getBusinessSettings(): JsonResponse
    {
        $exporter = DocumentHelper::getExporterProfile();
        $banking = DocumentHelper::getBankDetailsWithRouting(true);
        $bankProfiles = DocumentHelper::getBankProfiles(true);
        $defaults = DocumentHelper::getDocumentDefaults();

        return response()->json([
            'status' => 'success',
            'data' => [
                'company' => [
                    'name' => $exporter['name'],
                    'company_name' => $exporter['company_name'],
                    'legal_name' => $exporter['legal_name'],
                    'tagline' => $exporter['tagline'],
                    'brand_mark' => $exporter['brand_mark'],
                    'business_type' => $exporter['business_type'],
                    'website' => $exporter['website'],
                    'logo_url' => $exporter['logo_url'],
                    'established_year' => $exporter['est_year'],
                ],
                'contact' => [
                    'office_address' => $exporter['office_address'],
                    'line1' => $exporter['address_line1'],
                    'line2' => $exporter['address_line2'],
                    'area' => $exporter['area'],
                    'city' => $exporter['city'],
                    'postal_code' => $exporter['postal_code'],
                    'country' => $exporter['country'],
                    'country_code' => $exporter['country_code'],
                    'formatted_address' => $exporter['address'],
                    'phone' => $exporter['phone'],
                    'email' => $exporter['email'],
                    'whatsapp' => $exporter['whatsapp_display'],
                    'whatsapp_canonical' => $exporter['whatsapp_number'],
                    'whatsapp_number' => $exporter['whatsapp_number'],
                    'whatsapp_url' => $exporter['whatsapp_url'],
                    'website' => $exporter['web'],
                ],
                'legal' => [
                    'trade_license' => $exporter['trade_license'],
                    'reg_number' => $exporter['reg_number'],
                    'tin_number' => $exporter['tin_number'],
                    'bin_number' => $exporter['bin_number'],
                    'bin_vat' => $exporter['bin_vat'],
                    'vat_number' => $exporter['vat_number'],
                    'erc_number' => $exporter['erc_number'],
                    'irc_number' => $exporter['irc_number'],
                    'bgmea_reg' => $exporter['bgmea_reg'],
                    'incorporation_number' => $exporter['incorporation_number'],
                ],
                'banking' => $banking,
                'bank_profiles' => $bankProfiles,
                'supported_currencies' => DocumentHelper::SUPPORTED_CURRENCIES,
                'document_defaults' => $defaults,
            ],
        ]);
    }

    /**
     * Update centralized business, contact, export registration,
     * banking, and document defaults.
     */
    public function updateBusinessSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company' => ['nullable', 'array'],
            'company.name' => ['nullable', 'string', 'max:255'],
            'company.legal_name' => ['nullable', 'string', 'max:255'],
            'company.tagline' => ['nullable', 'string', 'max:255'],
            'company.brand_mark' => ['nullable', 'string', 'max:50'],
            'company.business_type' => ['nullable', 'string', 'max:255'],
            'company.website' => ['nullable', 'string', 'max:255'],
            'company.logo_url' => ['nullable', 'string', 'max:255'],
            'company.established_year' => ['nullable', 'integer', 'min:1900', 'max:2100'],

            'contact' => ['nullable', 'array'],
            'contact.office_address' => ['nullable', 'string', 'max:500'],
            'contact.line1' => ['nullable', 'string', 'max:255'],
            'contact.line2' => ['nullable', 'string', 'max:255'],
            'contact.area' => ['nullable', 'string', 'max:100'],
            'contact.city' => ['nullable', 'string', 'max:100'],
            'contact.postal_code' => ['nullable', 'string', 'max:50'],
            'contact.country' => ['nullable', 'string', 'max:100'],
            'contact.phone' => ['nullable', 'string', 'max:50'],
            'contact.email' => ['nullable', 'email', 'max:255'],
            'contact.whatsapp' => ['nullable', 'string', 'max:50'],
            'contact.website' => ['nullable', 'string', 'max:255'],

            'legal' => ['nullable', 'array'],
            'legal.trade_license' => ['nullable', 'string', 'max:100'],
            'legal.reg_number' => ['nullable', 'string', 'max:100'],
            'legal.tin_number' => ['nullable', 'string', 'max:100'],
            'legal.bin_number' => ['nullable', 'string', 'max:100'],
            'legal.bin_vat' => ['nullable', 'string', 'max:100'],
            'legal.vat_number' => ['nullable', 'string', 'max:100'],
            'legal.erc_number' => ['nullable', 'string', 'max:100'],
            'legal.irc_number' => ['nullable', 'string', 'max:100'],
            'legal.bgmea_reg' => ['nullable', 'string', 'max:100'],
            'legal.incorporation_number' => ['nullable', 'string', 'max:100'],

            'banking' => ['nullable', 'array'],
            'banking.is_configured' => ['nullable', 'boolean'],
            'banking.bank_name' => ['nullable', 'string', 'max:255'],
            'banking.account_title' => ['nullable', 'string', 'max:255'],
            'banking.account_name' => ['nullable', 'string', 'max:255'],
            'banking.beneficiary_name' => ['nullable', 'string', 'max:255'],
            'banking.account_number' => ['nullable', 'string', 'max:100'],
            'banking.account_no' => ['nullable', 'string', 'max:100'],
            'banking.swift_code' => ['nullable', 'string', 'max:50'],
            'banking.branch' => ['nullable', 'string', 'max:255'],
            'banking.branch_name' => ['nullable', 'string', 'max:255'],
            'banking.bank_address' => ['nullable', 'string', 'max:1000'],
            'banking.routing_number' => ['nullable', 'string', 'max:50'],
            'banking.currency' => ['nullable', 'string', 'max:10'],
            'banking.profiles' => ['nullable', 'array'],

            'bank_profiles' => ['nullable', 'array'],
            'bank_profiles.*.id' => ['nullable', 'string', 'max:100'],
            'bank_profiles.*.name' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.bank_name' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.account_title' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.account_name' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.beneficiary_name' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.account_number' => ['nullable', 'string', 'max:100'],
            'bank_profiles.*.account_no' => ['nullable', 'string', 'max:100'],
            'bank_profiles.*.swift_code' => ['nullable', 'string', 'max:50'],
            'bank_profiles.*.branch' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.branch_name' => ['nullable', 'string', 'max:255'],
            'bank_profiles.*.bank_address' => ['nullable', 'string', 'max:1000'],
            'bank_profiles.*.routing_number' => ['nullable', 'string', 'max:50'],
            'bank_profiles.*.currency' => ['nullable', 'string', 'max:10'],
            'bank_profiles.*.notes' => ['nullable', 'string', 'max:1000'],
            'bank_profiles.*.is_active' => ['nullable', 'boolean'],
            'bank_profiles.*.is_default' => ['nullable', 'boolean'],

            'document_defaults' => ['nullable', 'array'],
            'document_defaults.country_of_origin' => ['nullable', 'string', 'max:100'],
            'document_defaults.default_country_of_origin' => ['nullable', 'string', 'max:100'],
            'document_defaults.air_port_of_loading' => ['nullable', 'string', 'max:255'],
            'document_defaults.default_air_port_of_loading' => ['nullable', 'string', 'max:255'],
            'document_defaults.sea_port_of_loading' => ['nullable', 'string', 'max:255'],
            'document_defaults.default_sea_port_of_loading' => ['nullable', 'string', 'max:255'],
            'document_defaults.port_of_loading' => ['nullable', 'string', 'max:255'],
            'document_defaults.default_port_of_loading' => ['nullable', 'string', 'max:255'],
            'document_defaults.place_of_receipt' => ['nullable', 'string', 'max:255'],
            'document_defaults.default_place_of_receipt' => ['nullable', 'string', 'max:255'],
            'document_defaults.currency' => ['nullable', 'string', 'max:10'],
            'document_defaults.default_currency' => ['nullable', 'string', 'max:10'],
            'document_defaults.payment_terms' => ['nullable', 'string', 'max:500'],
            'document_defaults.default_payment_terms' => ['nullable', 'string', 'max:500'],
            'document_defaults.payment_terms_default' => ['nullable', 'string', 'max:500'],
            'document_defaults.shipping_terms' => ['nullable', 'string', 'max:255'],
            'document_defaults.default_shipping_terms' => ['nullable', 'string', 'max:255'],
            'document_defaults.incoterm' => ['nullable', 'string', 'max:50'],
            'document_defaults.default_incoterm' => ['nullable', 'string', 'max:50'],
            'document_defaults.incoterm_default' => ['nullable', 'string', 'max:50'],
            'document_defaults.declaration_text' => ['nullable', 'string', 'max:1000'],
            'document_defaults.default_declaration_text' => ['nullable', 'string', 'max:1000'],
            'document_defaults.ci_notes' => ['nullable', 'string', 'max:1000'],
            'document_defaults.pi_notes' => ['nullable', 'string', 'max:1000'],
            'document_defaults.offer_sheet_notes' => ['nullable', 'string', 'max:1000'],
            'document_defaults.quotation_notes' => ['nullable', 'string', 'max:1000'],
            'document_defaults.signatory_name' => ['nullable', 'string', 'max:255'],
            'document_defaults.authorized_signatory_name' => ['nullable', 'string', 'max:255'],
            'document_defaults.signatory_title' => ['nullable', 'string', 'max:255'],
            'document_defaults.authorized_signatory_title' => ['nullable', 'string', 'max:255'],
            'document_defaults.signatory_division' => ['nullable', 'string', 'max:255'],
        ]);

        // 1. Company Information
        $co = $validated['company'] ?? [];
        if (!empty($co['name'])) {
            SystemSetting::set('company_name', trim($co['name']), 'string', 'business');
        }
        if (isset($co['legal_name'])) {
            SystemSetting::set('company_legal_name', trim($co['legal_name']), 'string', 'business');
        }
        if (isset($co['tagline'])) {
            SystemSetting::set('company_tagline', trim($co['tagline']), 'string', 'business');
        }
        if (isset($co['brand_mark'])) {
            SystemSetting::set('company_brand_mark', trim($co['brand_mark']), 'string', 'business');
        }
        if (isset($co['business_type'])) {
            SystemSetting::set('company_business_type', trim($co['business_type']), 'string', 'business');
        }
        if (isset($co['website'])) {
            SystemSetting::set('company_website', trim($co['website']), 'string', 'business');
        }
        if (isset($co['logo_url'])) {
            SystemSetting::set('company_logo_url', trim($co['logo_url']), 'string', 'business');
        }
        if (isset($co['established_year'])) {
            SystemSetting::set('company_established_year', (int) $co['established_year'], 'integer', 'business');
        }

        // 2. Contact Information
        $ct = $validated['contact'] ?? [];
        if (isset($ct['office_address'])) {
            SystemSetting::set('office_address_formatted', trim($ct['office_address']), 'string', 'contact');
        }
        if (isset($ct['line1'])) SystemSetting::set('office_address_line1', trim($ct['line1']), 'string', 'contact');
        if (isset($ct['line2'])) SystemSetting::set('office_address_line2', trim($ct['line2']), 'string', 'contact');
        if (isset($ct['area'])) SystemSetting::set('office_area', trim($ct['area']), 'string', 'contact');
        if (isset($ct['city'])) SystemSetting::set('office_city', trim($ct['city']), 'string', 'contact');
        if (isset($ct['postal_code'])) SystemSetting::set('office_postal_code', trim($ct['postal_code']), 'string', 'contact');
        if (isset($ct['country'])) SystemSetting::set('office_country', trim($ct['country']), 'string', 'contact');
        if (isset($ct['phone'])) SystemSetting::set('business_phone', trim($ct['phone']), 'string', 'contact');
        if (isset($ct['email'])) SystemSetting::set('business_email', trim($ct['email']), 'string', 'contact');
        if (isset($ct['website'])) SystemSetting::set('business_website', trim($ct['website']), 'string', 'contact');

        // Formatted address composition if not directly set
        if (!isset($ct['office_address']) && (isset($ct['line1']) || isset($ct['city']))) {
            $line1 = $ct['line1'] ?? SystemSetting::get('office_address_line1');
            $line2 = $ct['line2'] ?? SystemSetting::get('office_address_line2');
            $area = $ct['area'] ?? SystemSetting::get('office_area');
            $city = $ct['city'] ?? SystemSetting::get('office_city');
            $postal = $ct['postal_code'] ?? SystemSetting::get('office_postal_code');
            $country = $ct['country'] ?? SystemSetting::get('office_country');
            $formattedAddress = implode(', ', array_filter([$line1, $line2, $area, trim("{$city}-{$postal}", '-'), $country]));
            SystemSetting::set('office_address_formatted', $formattedAddress, 'string', 'contact');
        }

        // WhatsApp (if present)
        if (isset($ct['whatsapp']) && trim($ct['whatsapp']) !== '') {
            $waDisplay = trim($ct['whatsapp']);
            if (!WhatsAppNormalizationService::isValidPhoneNumber($waDisplay)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The WhatsApp number must be a valid phone number (e.g. +880 1620-853502). Arbitrary text, URLs, and scripts are rejected.',
                    'errors' => [
                        'contact.whatsapp' => ['Please enter a valid international or local phone number (7 to 15 digits).'],
                    ],
                ], 422);
            }
            $machineNumber = WhatsAppNormalizationService::deriveMachineNumber($waDisplay);
            $oldDisplay = SystemSetting::get('whatsapp_display', WhatsAppNormalizationService::CANONICAL_DISPLAY);
            $oldNumber = SystemSetting::get('whatsapp_number', WhatsAppNormalizationService::CANONICAL_NUMBER);

            SystemSetting::set('whatsapp_display', $waDisplay, 'string', 'contact');
            SystemSetting::set('whatsapp_number', $machineNumber, 'string', 'contact');
            SystemSetting::set('whatsapp_business_number', $machineNumber, 'string', 'contact');

            if ($oldDisplay !== $waDisplay || $oldNumber !== $machineNumber) {
                ActivityLogger::log('settings.whatsapp_updated', null, [
                    'old_display' => $oldDisplay,
                    'new_display' => $waDisplay,
                    'old_number' => $oldNumber,
                    'new_number' => $machineNumber,
                ]);
            }
        }

        // 3. Legal / Export Registration
        $lg = $validated['legal'] ?? [];
        $regNumber = $lg['trade_license'] ?? ($lg['reg_number'] ?? null);
        if ($regNumber !== null) SystemSetting::set('reg_number', trim($regNumber), 'string', 'legal');
        if (isset($lg['tin_number'])) SystemSetting::set('tin_number', trim($lg['tin_number']), 'string', 'legal');
        $bin = $lg['bin_vat'] ?? ($lg['bin_number'] ?? null);
        if ($bin !== null) SystemSetting::set('bin_number', trim($bin), 'string', 'legal');
        if (isset($lg['vat_number'])) SystemSetting::set('vat_number', trim($lg['vat_number']), 'string', 'legal');
        if (isset($lg['erc_number'])) SystemSetting::set('erc_number', trim($lg['erc_number']), 'string', 'legal');
        if (isset($lg['irc_number'])) SystemSetting::set('irc_number', trim($lg['irc_number']), 'string', 'legal');
        if (isset($lg['bgmea_reg'])) SystemSetting::set('bgmea_reg', trim($lg['bgmea_reg']), 'string', 'legal');
        if (isset($lg['incorporation_number'])) SystemSetting::set('incorporation_number', trim($lg['incorporation_number']), 'string', 'legal');

        // 4. Beneficiary Bank Details & Multi-Currency Profiles
        $bk = $validated['banking'] ?? [];
        $rawProfiles = $validated['bank_profiles'] ?? ($bk['profiles'] ?? null);

        if ($rawProfiles !== null) {
            if (empty($rawProfiles)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'At least one beneficiary bank profile must be configured.',
                    'errors' => [
                        'bank_profiles' => ['At least one beneficiary bank profile is required.'],
                    ],
                ], 422);
            }

            $processedProfiles = [];
            $activeCurrencies = [];
            $hasDefaultActive = false;

            foreach ($rawProfiles as $index => $prof) {
                if (!is_array($prof)) continue;

                $bankName = trim($prof['bank_name'] ?? '');
                $accNum = trim($prof['account_number'] ?? ($prof['account_no'] ?? ''));
                $accTitle = trim($prof['account_title'] ?? ($prof['account_name'] ?? ($prof['beneficiary_name'] ?? '')));
                $rawCurrency = strtoupper(trim($prof['currency'] ?? 'USD'));

                if (empty($bankName) || empty($accNum)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Each bank profile must have a valid Bank Name and Account Number.',
                        'errors' => [
                            "bank_profiles.{$index}" => ['Bank Name and Account Number are required.'],
                        ],
                    ], 422);
                }

                if (!in_array($rawCurrency, DocumentHelper::SUPPORTED_CURRENCIES, true)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Currency '{$rawCurrency}' is not supported. Supported currencies are: " . implode(', ', DocumentHelper::SUPPORTED_CURRENCIES),
                        'errors' => [
                            "bank_profiles.{$index}.currency" => ['Unsupported currency code.'],
                        ],
                    ], 422);
                }

                $isActive = isset($prof['is_active']) ? (bool) $prof['is_active'] : true;
                $isDefault = isset($prof['is_default']) ? (bool) $prof['is_default'] : false;

                if ($isActive) {
                    if (in_array($rawCurrency, $activeCurrencies, true)) {
                        return response()->json([
                            'status' => 'error',
                            'message' => "Only one active bank profile is permitted for currency {$rawCurrency}. Please deactivate duplicates.",
                            'errors' => [
                                "bank_profiles.{$index}.currency" => ["Duplicate active profile for currency {$rawCurrency}."],
                            ],
                        ], 422);
                    }
                    $activeCurrencies[] = $rawCurrency;

                    if ($isDefault) {
                        $hasDefaultActive = true;
                    }
                }

                $id = !empty($prof['id']) ? trim($prof['id']) : ('prof_' . strtolower($rawCurrency) . '_' . Str::random(6));
                $name = !empty($prof['name']) ? trim($prof['name']) : "{$bankName} ({$rawCurrency} Account)";

                $processedProfiles[] = [
                    'id' => $id,
                    'name' => $name,
                    'bank_name' => $bankName,
                    'account_title' => $accTitle ?: 'M/S AYAAN  CLOTHING',
                    'account_name' => $accTitle ?: 'M/S AYAAN  CLOTHING',
                    'beneficiary_name' => $accTitle ?: 'M/S AYAAN  CLOTHING',
                    'account_number' => $accNum,
                    'account_no' => $accNum,
                    'swift_code' => trim($prof['swift_code'] ?? ''),
                    'branch' => trim($prof['branch'] ?? ($prof['branch_name'] ?? '')),
                    'branch_name' => trim($prof['branch'] ?? ($prof['branch_name'] ?? '')),
                    'bank_address' => trim($prof['bank_address'] ?? ''),
                    'routing_number' => isset($prof['routing_number']) ? trim($prof['routing_number']) : null,
                    'currency' => $rawCurrency,
                    'notes' => isset($prof['notes']) ? trim($prof['notes']) : null,
                    'is_active' => $isActive,
                    'is_default' => $isDefault,
                ];
            }

            // Ensure exactly one active profile is marked as default
            if (!$hasDefaultActive) {
                // If there are active profiles, designate the first active one as default
                $foundActive = false;
                foreach ($processedProfiles as &$p) {
                    if ($p['is_active']) {
                        $p['is_default'] = true;
                        $foundActive = true;
                        break;
                    }
                }
                unset($p);

                if (!$foundActive) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'At least one beneficiary bank profile must be active and designated as the default settlement account.',
                        'errors' => [
                            'bank_profiles' => ['At least one bank profile must be active.'],
                        ],
                    ], 422);
                }
            } else {
                // Ensure only ONE profile has is_default = true
                $defaultSeen = false;
                foreach ($processedProfiles as &$p) {
                    if ($p['is_default']) {
                        if ($defaultSeen) {
                            $p['is_default'] = false;
                        } else {
                            $defaultSeen = true;
                        }
                    }
                }
                unset($p);
            }

            // Find designated default profile and sync to single keys
            $defaultProfile = null;
            foreach ($processedProfiles as $p) {
                if ($p['is_default'] && $p['is_active']) {
                    $defaultProfile = $p;
                    break;
                }
            }
            if (!$defaultProfile && !empty($processedProfiles)) {
                $defaultProfile = $processedProfiles[0];
            }

            SystemSetting::set('bank_profiles', $processedProfiles, 'json', 'banking');

            if ($defaultProfile) {
                SystemSetting::set('bank_is_configured', true, 'boolean', 'banking');
                SystemSetting::set('bank_name', $defaultProfile['bank_name'], 'string', 'banking');
                SystemSetting::set('bank_account_title', $defaultProfile['account_title'], 'string', 'banking');
                SystemSetting::set('bank_account_number', $defaultProfile['account_number'], 'string', 'banking');
                SystemSetting::set('bank_swift_code', $defaultProfile['swift_code'], 'string', 'banking');
                SystemSetting::set('bank_branch', $defaultProfile['branch'], 'string', 'banking');
                SystemSetting::set('bank_address', $defaultProfile['bank_address'], 'string', 'banking');
                if (isset($defaultProfile['routing_number'])) {
                    SystemSetting::set('bank_routing_number', $defaultProfile['routing_number'], 'string', 'banking');
                }
                SystemSetting::set('bank_currency', $defaultProfile['currency'], 'string', 'banking');
            }
        } else {
            // Legacy single bank update
            if (isset($bk['is_configured'])) SystemSetting::set('bank_is_configured', (bool) $bk['is_configured'], 'boolean', 'banking');
            if (isset($bk['bank_name'])) SystemSetting::set('bank_name', trim($bk['bank_name']), 'string', 'banking');
            $accTitle = $bk['account_name'] ?? ($bk['account_title'] ?? null);
            if ($accTitle !== null) SystemSetting::set('bank_account_title', trim($accTitle), 'string', 'banking');
            if (isset($bk['beneficiary_name'])) SystemSetting::set('bank_beneficiary_name', trim($bk['beneficiary_name']), 'string', 'banking');
            $accNum = $bk['account_number'] ?? ($bk['account_no'] ?? null);
            if ($accNum !== null) SystemSetting::set('bank_account_number', trim($accNum), 'string', 'banking');
            if (isset($bk['swift_code'])) SystemSetting::set('bank_swift_code', trim($bk['swift_code']), 'string', 'banking');
            $branch = $bk['branch_name'] ?? ($bk['branch'] ?? null);
            if ($branch !== null) SystemSetting::set('bank_branch', trim($branch), 'string', 'banking');
            if (isset($bk['bank_address'])) SystemSetting::set('bank_address', trim($bk['bank_address']), 'string', 'banking');
            if (isset($bk['routing_number'])) SystemSetting::set('bank_routing_number', trim($bk['routing_number']), 'string', 'banking');
            if (isset($bk['currency'])) SystemSetting::set('bank_currency', trim($bk['currency']), 'string', 'banking');

            // Sync into default profile in bank_profiles if profiles exist
            $existingProfiles = SystemSetting::get('bank_profiles', null);
            if (is_array($existingProfiles) && !empty($existingProfiles)) {
                foreach ($existingProfiles as &$prof) {
                    if (!empty($prof['is_default'])) {
                        if (isset($bk['bank_name'])) $prof['bank_name'] = trim($bk['bank_name']);
                        if ($accTitle !== null) {
                            $prof['account_title'] = trim($accTitle);
                            $prof['account_name'] = trim($accTitle);
                        }
                        if ($accNum !== null) {
                            $prof['account_number'] = trim($accNum);
                            $prof['account_no'] = trim($accNum);
                        }
                        if (isset($bk['swift_code'])) $prof['swift_code'] = trim($bk['swift_code']);
                        if ($branch !== null) $prof['branch'] = trim($branch);
                        if (isset($bk['bank_address'])) $prof['bank_address'] = trim($bk['bank_address']);
                        if (isset($bk['routing_number'])) $prof['routing_number'] = trim($bk['routing_number']);
                        if (isset($bk['currency'])) $prof['currency'] = strtoupper(trim($bk['currency']));
                        break;
                    }
                }
                unset($prof);
                SystemSetting::set('bank_profiles', $existingProfiles, 'json', 'banking');
            }
        }

        // 5. Document Defaults
        $dd = $validated['document_defaults'] ?? [];
        $coo = $dd['default_country_of_origin'] ?? ($dd['country_of_origin'] ?? null);
        if ($coo !== null) SystemSetting::set('default_country_of_origin', trim($coo), 'string', 'document_defaults');
        if (isset($dd['air_port_of_loading'])) SystemSetting::set('default_air_port_of_loading', trim($dd['air_port_of_loading']), 'string', 'document_defaults');
        if (isset($dd['sea_port_of_loading'])) SystemSetting::set('default_sea_port_of_loading', trim($dd['sea_port_of_loading']), 'string', 'document_defaults');
        $pol = $dd['default_port_of_loading'] ?? ($dd['port_of_loading'] ?? null);
        if ($pol !== null) {
            SystemSetting::set('default_port_of_loading', trim($pol), 'string', 'document_defaults');
            SystemSetting::set('default_sea_port_of_loading', trim($pol), 'string', 'document_defaults');
        }
        if (isset($dd['place_of_receipt'])) SystemSetting::set('default_place_of_receipt', trim($dd['place_of_receipt']), 'string', 'document_defaults');
        if (isset($dd['currency'])) SystemSetting::set('default_currency', trim($dd['currency']), 'string', 'document_defaults');
        $payTerms = $dd['default_payment_terms'] ?? ($dd['payment_terms_default'] ?? ($dd['payment_terms'] ?? null));
        if ($payTerms !== null) SystemSetting::set('default_payment_terms', trim($payTerms), 'string', 'document_defaults');
        if (isset($dd['shipping_terms'])) SystemSetting::set('default_shipping_terms', trim($dd['shipping_terms']), 'string', 'document_defaults');
        $incoterm = $dd['default_incoterm'] ?? ($dd['incoterm_default'] ?? ($dd['incoterm'] ?? null));
        if ($incoterm !== null) SystemSetting::set('default_incoterm', trim($incoterm), 'string', 'document_defaults');
        $decText = $dd['default_declaration_text'] ?? ($dd['declaration_text'] ?? ($dd['ci_notes'] ?? null));
        if ($decText !== null) {
            SystemSetting::set('default_declaration_text', trim($decText), 'string', 'document_defaults');
            SystemSetting::set('default_ci_notes', trim($decText), 'string', 'document_defaults');
        }
        if (isset($dd['pi_notes'])) SystemSetting::set('default_pi_notes', trim($dd['pi_notes']), 'string', 'document_defaults');
        if (isset($dd['offer_sheet_notes'])) SystemSetting::set('default_offer_sheet_notes', trim($dd['offer_sheet_notes']), 'string', 'document_defaults');
        if (isset($dd['quotation_notes'])) SystemSetting::set('default_quotation_notes', trim($dd['quotation_notes']), 'string', 'document_defaults');
        $sigName = $dd['authorized_signatory_name'] ?? ($dd['signatory_name'] ?? null);
        if ($sigName !== null) SystemSetting::set('signatory_name', trim($sigName), 'string', 'document_defaults');
        $sigTitle = $dd['authorized_signatory_title'] ?? ($dd['signatory_title'] ?? null);
        if ($sigTitle !== null) SystemSetting::set('signatory_title', trim($sigTitle), 'string', 'document_defaults');
        if (isset($dd['signatory_division'])) SystemSetting::set('signatory_division', trim($dd['signatory_division']), 'string', 'document_defaults');

        ActivityLogger::log('settings.business_updated', null, [
            'admin_id' => auth()->id(),
            'updated_at' => now()->toIso8601String(),
        ]);

        Cache::forget('site_settings_public');

        return $this->getBusinessSettings();
    }

    /**
     * Upload Site Logo.
     * Supports both PNG and SVG formats.
     * Server-side MIME, extension, binary header (for PNG), and XML sanitization (for SVG).
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        if (!$request->hasFile('logo')) {
            return response()->json([
                'status' => 'error',
                'message' => 'No logo file was provided.',
                'errors' => ['logo' => ['The logo file is required.']],
            ], 422);
        }

        $file = $request->file('logo');

        // Check 1: Strict extension check (case-insensitive: only png or svg allowed)
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, ['png', 'svg'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid file format. The website logo must be a PNG or SVG image.',
                'errors' => [
                    'logo' => ['Only PNG and SVG images are permitted. JPG, JPEG, WebP, GIF, and other formats are strictly rejected.']
                ],
            ], 422);
        }

        // Check 2: Laravel standard validation rules (file presence, mimes, and max size)
        $validator = Validator::make($request->all(), [
            'logo' => [
                'required',
                'file',
                'mimes:png,svg',
                'max:5120', // 5MB max
            ],
        ], [
            'logo.mimes' => 'The logo must be a PNG or SVG file.',
            'logo.max' => 'The logo image must not exceed 5MB.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $realPath = $file->getRealPath();

        if ($extension === 'png') {
            // PNG Check: MIME type and binary image header verification
            $clientMime = strtolower($file->getClientMimeType() ?: '');
            $detectedMime = strtolower($file->getMimeType() ?: '');

            if ($clientMime !== 'image/png' && $detectedMime !== 'image/png') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The uploaded file does not have a valid PNG MIME type.',
                    'errors' => ['logo' => ['The file MIME type must be image/png.']],
                ], 422);
            }

            $imageInfo = @getimagesize($realPath);
            if (!$imageInfo || $imageInfo[2] !== IMAGETYPE_PNG) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The uploaded file does not contain valid PNG image data.',
                    'errors' => ['logo' => ['The file content is not a valid PNG image.']],
                ], 422);
            }

            // Store directly as PNG
            $path = $file->store('branding', 'public');
            $logoUrl = asset('storage/' . $path);
        } else {
            // SVG Check: MIME type validation
            $validSvgMimes = ['image/svg+xml', 'image/svg', 'text/xml', 'text/plain', 'image/x-svg'];
            $clientMime = strtolower($file->getClientMimeType() ?: '');
            $detectedMime = strtolower($file->getMimeType() ?: '');

            if (!in_array($clientMime, $validSvgMimes, true) && !in_array($detectedMime, $validSvgMimes, true)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The uploaded file does not have a valid SVG MIME type.',
                    'errors' => ['logo' => ['The file MIME type must be image/svg+xml.']],
                ], 422);
            }

            // SVG Content Validation & Security Sanitization (XSS, script, attribute cleaning)
            $rawSvg = @file_get_contents($realPath);
            if (!$rawSvg) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unable to read the uploaded SVG file.',
                    'errors' => ['logo' => ['The SVG file could not be read.']],
                ], 422);
            }

            $sanitizedSvg = SvgSanitizer::sanitize($rawSvg);
            if (!$sanitizedSvg) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The uploaded file does not contain valid or safe SVG image data.',
                    'errors' => ['logo' => ['The file content is malformed, not an SVG document, or contains unrecoverably unsafe content.']],
                ], 422);
            }

            // Store sanitized SVG safely as .svg
            $filename = Str::random(40) . '.svg';
            $path = 'branding/' . $filename;
            Storage::disk('public')->put($path, $sanitizedSvg);
            $logoUrl = asset('storage/' . $path);
        }

        SystemSetting::set('site_logo', $logoUrl, 'string', 'branding');

        // Invalidate public settings cache
        Cache::forget('site_settings_public');

        return response()->json([
            'status' => 'success',
            'message' => 'Website logo uploaded successfully.',
            'data' => [
                'logo_url' => $logoUrl,
                'site_title' => SystemSetting::get('site_title', config('app.name', 'AYAAN CLOTHING')),
            ],
        ]);
    }

    /**
     * Remove the current site logo (fallback to title text).
     */
    public function removeLogo(): JsonResponse
    {
        SystemSetting::set('site_logo', null, 'string', 'branding');
        Cache::forget('site_settings_public');

        return response()->json([
            'status' => 'success',
            'message' => 'Website logo removed. Storefront will display the website title.',
        ]);
    }

    /**
     * List all legal pages for Admin.
     */
    public function getLegalPages(): JsonResponse
    {
        $pages = LegalPage::all();

        return response()->json([
            'status' => 'success',
            'data' => $pages,
        ]);
    }

    /**
     * Get a specific legal page for Admin.
     */
    public function getLegalPage(string $type): JsonResponse
    {
        $normalizedType = str_replace('-', '_', strtolower(trim($type)));

        $page = LegalPage::where('type', $normalizedType)->first();

        if (!$page) {
            // Provide sensible initial template
            $title = $normalizedType === 'privacy_policy' ? 'Privacy Policy' : 'Terms & Conditions';
            return response()->json([
                'status' => 'success',
                'data' => [
                    'id' => null,
                    'type' => $normalizedType,
                    'title' => $title,
                    'content' => '',
                    'is_active' => true,
                    'updated_at' => null,
                ],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $page,
        ]);
    }

    /**
     * Update or create a legal page.
     */
    public function updateLegalPage(Request $request, string $type): JsonResponse
    {
        $normalizedType = str_replace('-', '_', strtolower(trim($type)));

        if (!in_array($normalizedType, LegalPage::supportedTypes(), true)) {
            return response()->json([
                'status' => 'error',
                'message' => "Unsupported legal page type: {$type}. Supported types: " . implode(', ', LegalPage::supportedTypes()),
            ], 422);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $page = LegalPage::updateOrCreate(
            ['type' => $normalizedType],
            [
                'title' => trim($validated['title']),
                'content' => $validated['content'],
                'is_active' => (bool) $validated['is_active'],
            ]
        );

        // Invalidate public caches
        Cache::forget('site_settings_public');
        Cache::forget("legal_page_{$normalizedType}");

        return response()->json([
            'status' => 'success',
            'message' => "{$page->title} updated successfully.",
            'data' => $page,
        ]);
    }
}
