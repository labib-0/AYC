<?php

namespace App\Services\Settings;

class WhatsAppNormalizationService
{
    public const CANONICAL_DISPLAY = '+880 1982-183886';
    public const CANONICAL_NUMBER = '8801982183886';
    public const CANONICAL_URL = 'https://wa.me/8801982183886';

    public const STALE_NUMBERS = [
        '8801826304930',
        '8801620853502',
        '8801711000000',
        '1826304930',
        '1620853502',
    ];

    /**
     * Deterministically derive machine/URL-safe WhatsApp number from a display string.
     *
     * Example:
     * "+880 1982-183886" -> "8801982183886"
     * "01982-183886"     -> "8801982183886"
     * "+1 (555) 234-5678" -> "15552345678"
     */
    public static function deriveMachineNumber(?string $displayNumber, string $defaultCountryCode = '880'): string
    {
        if ($displayNumber === null) {
            return '';
        }

        $raw = trim($displayNumber);
        if ($raw === '') {
            return '';
        }

        // Strip non-digit characters
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return '';
        }

        if (in_array($digits, self::STALE_NUMBERS, true)) {
            return self::CANONICAL_NUMBER;
        }

        // Case 1: Local Bangladesh mobile format starting with '0' (11 digits: 01XXXXXXXXX)
        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return $defaultCountryCode . substr($digits, 1);
        }

        // Case 2: 10 digits starting with 1 (Bangladesh mobile without leading 0)
        if (strlen($digits) === 10 && str_starts_with($digits, '1') && $defaultCountryCode === '880') {
            return $defaultCountryCode . $digits;
        }

        return $digits;
    }

    /**
     * Format a machine number into a wa.me URL with optional prefilled message.
     */
    public static function buildWhatsAppUrl(string $machineNumber, ?string $prefilledText = null): string
    {
        $clean = preg_replace('/\D+/', '', $machineNumber) ?? '';
        if ($clean === '' || in_array($clean, self::STALE_NUMBERS, true)) {
            $clean = self::CANONICAL_NUMBER;
        }

        if ($prefilledText === null || $prefilledText === '') {
            return "https://wa.me/{$clean}";
        }

        return "https://wa.me/{$clean}?text=" . rawurlencode($prefilledText);
    }
}
