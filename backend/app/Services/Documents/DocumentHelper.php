<?php

namespace App\Services\Documents;

use App\Models\Product;

class DocumentHelper
{
    /**
     * Get authoritative Exporter/Seller Profile from configuration
     */
    public static function getExporterProfile(): array
    {
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
            'whatsapp' => config('business.contact.whatsapp', '+880 1982-183886'),
            'whatsapp_display' => config('business.contact.whatsapp_display', '+880 1982-183886'),
            'whatsapp_number' => config('business.contact.whatsapp_number', '8801982183886'),
            'whatsapp_url' => config('business.contact.whatsapp_url', 'https://wa.me/8801982183886'),
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

        if ($product) {
            $images = $product->images()->orderBy('sort_order')->get();
            if ($images->isNotEmpty()) {
                $primary = $images->firstWhere('is_primary', true);
                if ($primary && !empty($primary->image_url)) {
                    $gallery[] = $primary->image_url;
                }
                foreach ($images as $img) {
                    if (!empty($img->image_url) && !in_array($img->image_url, $gallery)) {
                        $gallery[] = $img->image_url;
                    }
                }
            } elseif (!empty($product->images) && is_array($product->images)) {
                foreach ($product->images as $imgUrl) {
                    if (is_string($imgUrl) && !empty($imgUrl) && !in_array($imgUrl, $gallery)) {
                        $gallery[] = $imgUrl;
                    }
                }
            }

            if (!empty($product->primary_image_url) && !in_array($product->primary_image_url, $gallery)) {
                array_unshift($gallery, $product->primary_image_url);
            }
        }

        if ($fallbackPrimaryUrl && !in_array($fallbackPrimaryUrl, $gallery)) {
            array_unshift($gallery, $fallbackPrimaryUrl);
        }

        if (empty($gallery)) {
            $gallery[] = '/placeholder.jpg';
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
