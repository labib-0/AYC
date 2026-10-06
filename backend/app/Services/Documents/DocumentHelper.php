<?php

namespace App\Services\Documents;

use App\Models\Product;
use App\Models\SystemSetting;
use App\Services\Settings\WhatsAppNormalizationService;

class DocumentHelper
{
    /**
     * Get authoritative Exporter/Seller Profile from configuration
     */
    public static function getExporterProfile(): array
    {
        $waDisplay = SystemSetting::get('whatsapp_display', config('business.contact.whatsapp_display', '+880 1620-853502'));
        $waNumber = SystemSetting::get('whatsapp_number', config('business.contact.whatsapp_number', '8801620853502'));
        $waUrl = WhatsAppNormalizationService::buildWhatsAppUrl($waNumber);

        return [
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
            'whatsapp' => $waDisplay,
            'whatsapp_display' => $waDisplay,
            'whatsapp_number' => $waNumber,
            'whatsapp_url' => $waUrl,
            'web' => config('business.contact.website', 'www.ayaanclothing.com'),
            'reg_number' => config('business.legal.registration_number'),
            'tin_number' => config('business.legal.tin_number'),
            'bin_number' => config('business.legal.bin_number'),
            'bgmea_reg' => config('business.legal.bgmea_reg'),
            'est_year' => config('business.established_year', 2010),
        ];
    }

    /**
     * Get authoritative Beneficiary Bank Details with exact Pubali Bank credentials.
     * Single block, strictly NO routing number.
     */
    public static function getBankDetails(): array
    {
        return [
            'is_configured' => (bool) config('business.banking.is_configured', true),
            'bank_name' => 'Pubali Bank Limited',
            'account_title' => 'M/S AYAAN  CLOTHING',
            'beneficiary_name' => 'M/S AYAAN  CLOTHING',
            'account_no' => '1788-901-044316',
            'account_number' => '1788-901-044316',
            'swift_code' => 'PUBABDDH210',
            'branch' => 'Nawabpur Road Branch',
            'bank_address' => "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh",
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
     * Official conversion of amount to written words in USD
     */
    public static function numberToWords(float $amount): string
    {
        $dollars = (int) floor($amount);
        $cents = (int) round(($amount - $dollars) * 100);

        $words = self::convertIntegerToWords($dollars);
        $result = "US Dollars " . trim($words);

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
