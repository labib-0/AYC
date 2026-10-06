<?php

namespace App\Services\Documents;

use App\Models\Product;
use App\Models\SystemSetting;
use App\Services\Settings\WhatsAppNormalizationService;

class DocumentHelper
{
    /**
     * Get authoritative Exporter/Seller Profile from configuration or centralized system settings.
     */
    public static function getExporterProfile(): array
    {
        $waDisplay = SystemSetting::get('whatsapp_display', config('business.contact.whatsapp_display', '+880 1620-853502'));
        $waNumber = SystemSetting::get('whatsapp_number', config('business.contact.whatsapp_number', '8801620853502'));
        $waUrl = WhatsAppNormalizationService::buildWhatsAppUrl($waNumber);

        $line1 = SystemSetting::get('office_address_line1', config('business.address.line1', 'House #33 (2nd floor)'));
        $line2 = SystemSetting::get('office_address_line2', config('business.address.line2', 'Road #12, Sector #11'));
        $area = SystemSetting::get('office_area', config('business.address.area', 'Uttara'));
        $city = SystemSetting::get('office_city', config('business.address.city', 'Dhaka'));
        $postalCode = SystemSetting::get('office_postal_code', config('business.address.postal_code', '1230'));
        $country = SystemSetting::get('office_country', config('business.address.country', 'Bangladesh'));
        
        $formattedAddress = SystemSetting::get('office_address_formatted', null);
        if (!$formattedAddress) {
            $parts = array_filter([$line1, $line2, $area, trim("{$city}-{$postalCode}", '-'), $country]);
            $formattedAddress = !empty($parts) ? implode(', ', $parts) : config('business.address.formatted', 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh');
        }

        $companyName = SystemSetting::get('company_name', SystemSetting::get('company.name', config('business.name', 'Ayaan Clothing Ltd.')));
        $legalName = SystemSetting::get('company_legal_name', SystemSetting::get('company.legal_name', config('business.banking.account_title', 'Ayaan Clothing Ltd.')));
        $tagline = SystemSetting::get('company_tagline', SystemSetting::get('company.tagline', config('business.business_type', 'Premium Knitwear & Ready-Made Garments Manufacturer & Exporter')));
        $website = SystemSetting::get('company_website', SystemSetting::get('company.website', SystemSetting::get('business_website', config('business.contact.website', 'https://ayaanclothing.com'))));
        $logoUrl = SystemSetting::get('company_logo_url', SystemSetting::get('company.logo_url', '/images/logo.png'));

        return [
            'name' => $companyName,
            'company_name' => $companyName,
            'legal_name' => $legalName,
            'brand' => $companyName,
            'brand_mark' => SystemSetting::get('company_brand_mark', config('business.brand_mark', 'AYC')),
            'business_type' => $tagline,
            'tagline' => $tagline,
            'address' => $formattedAddress,
            'office_address' => $formattedAddress,
            'address_line1' => $line1,
            'address_line2' => $line2,
            'area' => $area,
            'city' => $city,
            'postal_code' => $postalCode,
            'country' => $country,
            'country_code' => SystemSetting::get('office_country_code', config('business.address.country_code', 'BD')),
            'phone' => SystemSetting::get('business_phone', config('business.contact.phone', '+880 1620-853502')),
            'email' => SystemSetting::get('business_email', config('business.contact.email', 'export@ayaanclothing.com')),
            'whatsapp' => $waDisplay,
            'whatsapp_display' => $waDisplay,
            'whatsapp_number' => $waNumber,
            'whatsapp_canonical' => $waNumber,
            'whatsapp_url' => $waUrl,
            'web' => $website,
            'website' => $website,
            'logo_url' => $logoUrl,
            'reg_number' => SystemSetting::get('reg_number', 'TRAD/DNCC/012458/2022'),
            'trade_license' => SystemSetting::get('reg_number', 'TRAD/DNCC/012458/2022'),
            'tin_number' => SystemSetting::get('tin_number', '124589632514'),
            'bin_number' => SystemSetting::get('bin_number', '002345891-0101'),
            'bin_vat' => SystemSetting::get('bin_number', '002345891-0101'),
            'vat_number' => SystemSetting::get('vat_number', '002345891-0101'),
            'erc_number' => SystemSetting::get('erc_number', '26-024589'),
            'irc_number' => SystemSetting::get('irc_number', '26-015894'),
            'bgmea_reg' => SystemSetting::get('bgmea_reg', 'BGMEA-REG-8954'),
            'incorporation_number' => SystemSetting::get('incorporation_number', 'C-158945/2021'),
            'est_year' => (int) SystemSetting::get('company_established_year', config('business.established_year', 2010)),
        ];
    }

    public const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT'];
    public const DEFAULT_CURRENCY = 'USD';

    /**
     * Get baseline default bank profile from system settings or configuration.
     */
    public static function getDefaultBankProfile(bool $includeRouting = true): array
    {
        $accNo = SystemSetting::get('bank_account_number', SystemSetting::get('banking.account_number', config('business.banking.account_number', '1788-901-044316')));
        $title = SystemSetting::get('bank_account_title', SystemSetting::get('banking.account_name', config('business.banking.account_title', 'M/S AYAAN  CLOTHING')));
        $beneficiary = SystemSetting::get('bank_beneficiary_name', SystemSetting::get('banking.beneficiary_name', config('business.banking.beneficiary_name', $title)));
        $bankName = SystemSetting::get('bank_name', SystemSetting::get('banking.bank_name', config('business.banking.bank_name', 'Pubali Bank Limited')));
        $branch = SystemSetting::get('bank_branch', SystemSetting::get('banking.branch_name', config('business.banking.branch', 'Nawabpur Road Branch')));
        $swift = SystemSetting::get('bank_swift_code', SystemSetting::get('banking.swift_code', config('business.banking.swift_code', 'PUBABDDH210')));
        $bankAddress = SystemSetting::get('bank_address', config('business.banking.bank_address', "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh"));
        $currency = strtoupper(SystemSetting::get('bank_currency', SystemSetting::get('banking.currency', 'USD')));

        $profile = [
            'id' => 'profile_default',
            'name' => 'Pubali Bank Limited (' . $currency . ' Account)',
            'bank_name' => $bankName,
            'account_title' => $title,
            'account_name' => $title,
            'beneficiary_name' => $beneficiary,
            'account_number' => $accNo,
            'account_no' => $accNo,
            'swift_code' => $swift,
            'branch' => $branch,
            'branch_name' => $branch,
            'bank_address' => $bankAddress,
            'currency' => $currency,
            'notes' => 'Primary beneficiary wire instructions for foreign trade settlement.',
            'is_active' => true,
            'is_default' => true,
        ];

        if ($includeRouting) {
            $profile['routing_number'] = SystemSetting::get('bank_routing_number', SystemSetting::get('banking.routing_number', config('business.banking.routing_number', '175271894')));
        }

        return $profile;
    }

    /**
     * Get all structured beneficiary bank profiles.
     * Falls back to synthesizing from single legacy bank settings if no profiles array is saved.
     */
    public static function getBankProfiles(bool $includeRouting = true): array
    {
        $stored = SystemSetting::get('bank_profiles', null);

        if (is_array($stored) && !empty($stored)) {
            $profiles = [];
            foreach ($stored as $idx => $p) {
                if (!is_array($p)) continue;
                $curr = strtoupper($p['currency'] ?? 'USD');
                $item = [
                    'id' => (string) ($p['id'] ?? ('bank_prof_' . ($idx + 1))),
                    'name' => (string) ($p['name'] ?? ($p['bank_name'] ?? "Bank Profile {$curr}")),
                    'bank_name' => (string) ($p['bank_name'] ?? 'Pubali Bank Limited'),
                    'account_title' => (string) ($p['account_title'] ?? ($p['account_name'] ?? 'M/S AYAAN  CLOTHING')),
                    'account_name' => (string) ($p['account_title'] ?? ($p['account_name'] ?? 'M/S AYAAN  CLOTHING')),
                    'beneficiary_name' => (string) ($p['beneficiary_name'] ?? ($p['account_title'] ?? ($p['account_name'] ?? 'M/S AYAAN  CLOTHING'))),
                    'account_number' => (string) ($p['account_number'] ?? ($p['account_no'] ?? '')),
                    'account_no' => (string) ($p['account_number'] ?? ($p['account_no'] ?? '')),
                    'swift_code' => (string) ($p['swift_code'] ?? ''),
                    'branch' => (string) ($p['branch'] ?? ($p['branch_name'] ?? '')),
                    'branch_name' => (string) ($p['branch'] ?? ($p['branch_name'] ?? '')),
                    'bank_address' => (string) ($p['bank_address'] ?? ''),
                    'currency' => $curr,
                    'notes' => isset($p['notes']) ? (string) $p['notes'] : null,
                    'is_active' => isset($p['is_active']) ? (bool) $p['is_active'] : true,
                    'is_default' => isset($p['is_default']) ? (bool) $p['is_default'] : ($idx === 0),
                ];
                if ($includeRouting) {
                    $item['routing_number'] = isset($p['routing_number']) ? (string) $p['routing_number'] : null;
                }
                $profiles[] = $item;
            }

            if (!empty($profiles)) {
                return $profiles;
            }
        }

        return [static::getDefaultBankProfile($includeRouting)];
    }

    /**
     * Resolve authoritative Beneficiary Bank Details matching the document/order currency.
     * Fallback hierarchy:
     * 1. Exact active profile matching the requested currency.
     * 2. Active profile designated as default (is_default = true).
     * 3. First active bank profile.
     * 4. System default bank profile.
     */
    public static function getBankDetailsForCurrency(?string $currency = null, bool $includeRouting = false): array
    {
        $target = $currency ? strtoupper(trim($currency)) : null;
        $profiles = static::getBankProfiles(true);

        $activeProfiles = array_values(array_filter($profiles, function ($p) {
            return !empty($p['is_active']);
        }));

        $selected = null;

        // 1. Exact active currency match
        if ($target) {
            foreach ($activeProfiles as $prof) {
                if (strtoupper($prof['currency'] ?? '') === $target) {
                    $selected = $prof;
                    break;
                }
            }
        }

        // 2. Fallback to active designated default
        if (!$selected) {
            foreach ($activeProfiles as $prof) {
                if (!empty($prof['is_default'])) {
                    $selected = $prof;
                    break;
                }
            }
        }

        // 3. Fallback to first active profile
        if (!$selected && !empty($activeProfiles)) {
            $selected = $activeProfiles[0];
        }

        // 4. Ultimate fallback to baseline default
        if (!$selected) {
            $selected = static::getDefaultBankProfile(true);
        }

        $details = [
            'is_configured' => (bool) SystemSetting::get('bank_is_configured', config('business.banking.is_configured', true)),
            'profile_id' => $selected['id'] ?? 'default',
            'profile_name' => $selected['name'] ?? 'Primary Beneficiary Bank',
            'bank_name' => $selected['bank_name'] ?? 'Pubali Bank Limited',
            'account_title' => $selected['account_title'] ?? 'M/S AYAAN  CLOTHING',
            'account_name' => $selected['account_title'] ?? 'M/S AYAAN  CLOTHING',
            'beneficiary_name' => $selected['beneficiary_name'] ?? ($selected['account_title'] ?? 'M/S AYAAN  CLOTHING'),
            'account_no' => $selected['account_number'] ?? '',
            'account_number' => $selected['account_number'] ?? '',
            'swift_code' => $selected['swift_code'] ?? '',
            'branch' => $selected['branch'] ?? '',
            'branch_name' => $selected['branch'] ?? '',
            'bank_address' => $selected['bank_address'] ?? '',
            'currency' => strtoupper($selected['currency'] ?? 'USD'),
            'notes' => $selected['notes'] ?? null,
            'is_default' => (bool) ($selected['is_default'] ?? false),
            'is_active' => (bool) ($selected['is_active'] ?? true),
        ];

        if ($includeRouting) {
            $details['routing_number'] = $selected['routing_number'] ?? SystemSetting::get('bank_routing_number', config('business.banking.routing_number', '175271894'));
        }

        return $details;
    }

    /**
     * Get authoritative Beneficiary Bank Details with backward-compatible signature.
     * Accepts optional currency string.
     */
    public static function getBankDetails(?string $currency = null): array
    {
        return static::getBankDetailsForCurrency($currency, false);
    }

    /**
     * Get Beneficiary Bank Details with optional routing number and currency support.
     */
    public static function getBankDetailsWithRouting(bool $includeRouting = true, ?string $currency = null): array
    {
        return static::getBankDetailsForCurrency($currency, $includeRouting);
    }

    /**
     * Get document & logistics defaults configured by Admin.
     */
    public static function getDocumentDefaults(): array
    {
        $incoterm = SystemSetting::get('default_incoterm', SystemSetting::get('document_defaults.incoterm_default', 'FOB Chattogram'));
        $paymentTerms = SystemSetting::get('default_payment_terms', SystemSetting::get('document_defaults.payment_terms_default', '100% Irrevocable Confirmed Letter of Credit (L/C) at sight or 30% TT advance, balance upon copy BL'));
        $pol = SystemSetting::get('default_port_of_loading', SystemSetting::get('document_defaults.port_of_loading', SystemSetting::get('default_sea_port_of_loading', 'Chattogram Sea Port / Hazrat Shahjalal Int. Airport, Dhaka')));
        $declaration = SystemSetting::get('default_declaration_text', SystemSetting::get('document_defaults.declaration_text', SystemSetting::get('default_ci_notes', 'We certify that the goods mentioned in this invoice are of Bangladesh origin and the particulars provided are true and correct.')));

        return [
            'country_of_origin' => SystemSetting::get('default_country_of_origin', config('business.logistics.country_of_origin', 'Bangladesh')),
            'default_country_of_origin' => SystemSetting::get('default_country_of_origin', config('business.logistics.country_of_origin', 'Bangladesh')),
            'air_port_of_loading' => SystemSetting::get('default_air_port_of_loading', config('business.logistics.air_port_of_loading', 'Hazrat Shahjalal International Airport (DAC), Dhaka')),
            'default_air_port_of_loading' => SystemSetting::get('default_air_port_of_loading', config('business.logistics.air_port_of_loading', 'Hazrat Shahjalal International Airport (DAC), Dhaka')),
            'sea_port_of_loading' => SystemSetting::get('default_sea_port_of_loading', config('business.logistics.sea_port_of_loading', 'Chattogram Sea Port (CGP), Bangladesh')),
            'default_sea_port_of_loading' => SystemSetting::get('default_sea_port_of_loading', config('business.logistics.sea_port_of_loading', 'Chattogram Sea Port (CGP), Bangladesh')),
            'port_of_loading' => $pol,
            'default_port_of_loading' => $pol,
            'place_of_receipt' => SystemSetting::get('default_place_of_receipt', config('business.logistics.place_of_receipt', 'Uttara Corporate Office / Dhaka Hub, Bangladesh')),
            'default_place_of_receipt' => SystemSetting::get('default_place_of_receipt', config('business.logistics.place_of_receipt', 'Uttara Corporate Office / Dhaka Hub, Bangladesh')),
            'currency' => SystemSetting::get('default_currency', 'USD'),
            'default_currency' => SystemSetting::get('default_currency', 'USD'),
            'payment_terms' => $paymentTerms,
            'default_payment_terms' => $paymentTerms,
            'payment_terms_default' => $paymentTerms,
            'shipping_terms' => SystemSetting::get('default_shipping_terms', 'Express Air Freight (DAP / DDP)'),
            'default_shipping_terms' => SystemSetting::get('default_shipping_terms', 'Express Air Freight (DAP / DDP)'),
            'incoterm' => $incoterm,
            'default_incoterm' => $incoterm,
            'incoterm_default' => $incoterm,
            'declaration_text' => $declaration,
            'default_declaration_text' => $declaration,
            'ci_notes' => SystemSetting::get('default_ci_notes', $declaration),
            'pi_notes' => SystemSetting::get('default_pi_notes', 'Commercial Proforma Invoice. Please remit payment against provided Beneficiary Bank Details.'),
            'offer_sheet_notes' => SystemSetting::get('default_offer_sheet_notes', 'Commercial Offer only — Not an invoice. Shipping arranged separately.'),
            'quotation_notes' => SystemSetting::get('default_quotation_notes', 'Official export quotation issued by Ayaan Clothing Export Division. Valid for 30 days.'),
            'signatory_name' => SystemSetting::get('signatory_name', 'Authorized Representative'),
            'authorized_signatory_name' => SystemSetting::get('signatory_name', 'Authorized Representative'),
            'signatory_title' => SystemSetting::get('signatory_title', 'Managing Director / Commercial Head'),
            'authorized_signatory_title' => SystemSetting::get('signatory_title', 'Managing Director / Commercial Head'),
            'signatory_division' => SystemSetting::get('signatory_division', 'Ayaan Clothing Export Division'),
        ];
    }

    /**
     * Resolves all available product images in original order without omission:
     * - primary image first
     * - all gallery images as thumbnails underneath
     * - preserves aspect ratio
     */
    public static function getProductGallery(?Product $product, ?string $fallbackPrimaryUrl = null): array
    {
        $gallery = [];
        $seenKeys = [];

        $getKey = function (?string $url): string {
            if (!$url) return '';
            $trimmed = trim($url);
            if ($trimmed === '' || $trimmed === '/placeholder.jpg' || stripos($trimmed, 'placeholder') !== false) {
                return '';
            }
            $clean = explode('?', explode('#', $trimmed)[0])[0];
            $clean = preg_replace('#^https?://[^/]+#i', '', $clean);
            $clean = preg_replace('#^/ayc#i', '', $clean);
            $clean = preg_replace('#^/?storage/#i', '', $clean);
            return strtolower(ltrim($clean, '/'));
        };

        if ($product) {
            $images = $product->images()->orderBy('sort_order')->get();
            if ($images->isNotEmpty()) {
                // 1. Authoritative primary image first
                $primary = $images->firstWhere('is_primary', true);
                if ($primary && !empty($primary->image_url)) {
                    $key = $getKey($primary->image_url);
                    if ($key && !in_array($key, $seenKeys)) {
                        $gallery[] = $primary->image_url;
                        $seenKeys[] = $key;
                    }
                }
                // 2. Remaining gallery images in existing gallery order
                foreach ($images as $img) {
                    if (!empty($img->image_url)) {
                        $key = $getKey($img->image_url);
                        if ($key && !in_array($key, $seenKeys)) {
                            $gallery[] = $img->image_url;
                            $seenKeys[] = $key;
                        }
                    }
                }
            } elseif (!empty($product->images) && is_array($product->images)) {
                foreach ($product->images as $imgUrl) {
                    if (is_string($imgUrl) && !empty($imgUrl)) {
                        $key = $getKey($imgUrl);
                        if ($key && !in_array($key, $seenKeys)) {
                            $gallery[] = $imgUrl;
                            $seenKeys[] = $key;
                        }
                    }
                }
            }

            if (!empty($product->primary_image_url)) {
                $key = $getKey($product->primary_image_url);
                if ($key && !in_array($key, $seenKeys)) {
                    array_unshift($gallery, $product->primary_image_url);
                    $seenKeys[] = $key;
                }
            }
        }

        if ($fallbackPrimaryUrl) {
            $key = $getKey($fallbackPrimaryUrl);
            if ($key && !in_array($key, $seenKeys)) {
                if (empty($gallery)) {
                    $gallery[] = $fallbackPrimaryUrl;
                    $seenKeys[] = $key;
                }
            }
        }

        return $gallery;
    }

    /**
     * Official conversion of amount to written words with multi-currency support
     */
    public static function numberToWords(float $amount, ?string $currency = 'USD'): string
    {
        $dollars = (int) floor($amount);
        $cents = (int) round(($amount - $dollars) * 100);

        $curr = strtoupper($currency ?: 'USD');
        $currencyTitle = match ($curr) {
            'EUR' => 'Euros',
            'GBP' => 'Pounds Sterling',
            'BDT' => 'Bangladeshi Taka',
            default => 'US Dollars',
        };

        $words = self::convertIntegerToWords($dollars);
        $result = $currencyTitle . " " . trim($words);

        if ($cents > 0) {
            $result .= sprintf(" and %02d/100", $cents);
        } else {
            $result .= " and 00/100";
        }

        return $result . " Only";
    }

    private static function convertIntegerToWords(int $number): string
    {
        if ($number < 0) {
            return "Negative " . self::convertIntegerToWords(abs($number));
        }

        if ($number === 0) {
            return "Zero";
        }

        $units = [
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"
        ];

        $tens = [
            "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
        ];

        if ($number < 20) {
            return $units[$number];
        }

        if ($number < 100) {
            return $tens[(int) ($number / 10)] . (($number % 10 !== 0) ? "-" . $units[$number % 10] : "");
        }

        if ($number < 1000) {
            return $units[(int) ($number / 100)] . " Hundred" . (($number % 100 !== 0) ? " " . self::convertIntegerToWords($number % 100) : "");
        }

        if ($number < 1000000) {
            return self::convertIntegerToWords((int) ($number / 1000)) . " Thousand" . (($number % 1000 !== 0) ? " " . self::convertIntegerToWords($number % 1000) : "");
        }

        if ($number < 1000000000) {
            return self::convertIntegerToWords((int) ($number / 1000000)) . " Million" . (($number % 1000000 !== 0) ? " " . self::convertIntegerToWords($number % 1000000) : "");
        }

        return self::convertIntegerToWords((int) ($number / 1000000000)) . " Billion" . (($number % 1000000000 !== 0) ? " " . self::convertIntegerToWords($number % 1000000000) : "");
    }
}
