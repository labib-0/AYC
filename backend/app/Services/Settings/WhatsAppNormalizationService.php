<?php

namespace App\Services\Settings;

class WhatsAppNormalizationService
{
    public const CANONICAL_DISPLAY = '+880 1620-853502';
    public const CANONICAL_NUMBER = '8801620853502';
    public const CANONICAL_URL = 'https://wa.me/8801620853502';

    public const STALE_NUMBERS = [
        '8801826304930',
        '8801711000000',
        '1826304930',
    ];

    /**
     * Validate whether a phone number input is valid for WhatsApp.
     * Rejects:
     * - schemes (http:, https:, javascript:, data:, etc.)
     * - non-phone characters (letters, html tags, script tags)
     * - numbers with fewer than 7 digits or more than 15 digits (ITU E.164 standard)
     */
    public static function isValidPhoneNumber(?string $number): bool
    {
        if ($number === null) {
            return false;
        }

        $trimmed = trim($number);
        if ($trimmed === '') {
            return false;
        }

        // Reject if it contains dangerous characters or URL schemes
        if (preg_match('/(javascript:|https?:|mailto:|data:|ftp:|<|>|\{|\}|\[|\]|\;)/i', $trimmed)) {
            return false;
        }

        // Reject letters
        if (preg_match('/[a-zA-Z]/', $trimmed)) {
            return false;
        }

        // Must only consist of valid phone formatting characters: +, digits, spaces, hyphens, dots, parentheses
        if (!preg_match('/^\+?[0-9\s\-\.\(\)]+$/', $trimmed)) {
            return false;
        }

        // Count digits: must be between 7 and 15 digits (ITU E.164 standard)
        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        $digitCount = strlen($digits);
        if ($digitCount < 7 || $digitCount > 15) {
            return false;
        }

        return true;
    }

    /**
     * Deterministically derive machine/URL-safe WhatsApp number from a display string.
     *
     * Example:
     * "+880 1620-853502" -> "8801620853502"
     * "01620-853502"     -> "8801620853502"
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
     * Format a machine number or display number into a wa.me URL with optional prefilled message.
     */
    public static function buildWhatsAppUrl(?string $machineNumber = null, ?string $prefilledText = null): string
    {
        $target = $machineNumber !== null && trim($machineNumber) !== '' ? $machineNumber : self::CANONICAL_NUMBER;
        $clean = self::deriveMachineNumber($target);
        if ($clean === '' || in_array($clean, self::STALE_NUMBERS, true)) {
            $clean = self::CANONICAL_NUMBER;
        }

        if ($prefilledText === null || trim($prefilledText) === '') {
            return "https://wa.me/{$clean}";
        }

        return "https://wa.me/{$clean}?text=" . rawurlencode($prefilledText);
    }

    /**
     * Get active canonical (digits-only) WhatsApp number.
     */
    public function getCanonicalWhatsApp(?string $display = null): string
    {
        if ($display !== null) {
            return self::deriveMachineNumber($display);
        }
        $stored = \App\Models\SystemSetting::get('whatsapp_number');
        if (!empty($stored) && !in_array($stored, self::STALE_NUMBERS, true)) {
            return $stored;
        }
        $display = \App\Models\SystemSetting::get('whatsapp_display', self::CANONICAL_DISPLAY);
        return self::deriveMachineNumber($display);
    }

    /**
     * Get active formatted display WhatsApp number.
     */
    public function getFormattedWhatsApp(?string $display = null): string
    {
        if ($display !== null) {
            return $display;
        }
        return \App\Models\SystemSetting::get('whatsapp_display', self::CANONICAL_DISPLAY);
    }

    /**
     * Get active wa.me URL with optional prefilled message.
     */
    public function getWhatsAppUrl(?string $displayOrMachine = null, ?string $prefilledText = null): string
    {
        $canonical = $this->getCanonicalWhatsApp($displayOrMachine);
        return self::buildWhatsAppUrl($canonical, $prefilledText);
    }
}
