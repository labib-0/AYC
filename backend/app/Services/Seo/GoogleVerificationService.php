<?php

namespace App\Services\Seo;

class GoogleVerificationService
{
    /**
     * Regex pattern to match a valid Google verification token string.
     * Google Search Console tokens are URL-safe base64 or alphanumeric strings (typically 20-100 characters).
     */
    private const TOKEN_REGEX = '/^[A-Za-z0-9_\-+=]{8,128}$/';

    /**
     * Regex to match <meta name="google-site-verification" content="..." />
     */
    private const META_TAG_NAME_FIRST = '/<meta\s+[^>]*name=["\']google-site-verification["\'][^>]*content=["\']([^"\']+)["\'][^>]*\/?>/i';

    /**
     * Regex to match <meta content="..." name="google-site-verification" />
     */
    private const META_TAG_CONTENT_FIRST = '/<meta\s+[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']google-site-verification["\'][^>]*\/?>/i';

    /**
     * Parse and validate input from the administrator.
     * Accepts either a raw token or an exact Google verification meta tag.
     * Rejects arbitrary HTML, scripts, iframes, or invalid token characters.
     *
     * @param string|null $input
     * @return array{valid: bool, token: string|null, error: string|null}
     */
    public static function parseAndValidate(?string $input): array
    {
        if ($input === null) {
            return ['valid' => true, 'token' => null, 'error' => null];
        }

        $trimmed = trim($input);
        if ($trimmed === '') {
            return ['valid' => true, 'token' => null, 'error' => null];
        }

        // Detect dangerous content
        $lower = strtolower($trimmed);
        if (
            str_contains($lower, '<script') ||
            str_contains($lower, '</script') ||
            str_contains($lower, '<iframe') ||
            str_contains($lower, '<img') ||
            str_contains($lower, '<svg') ||
            str_contains($lower, '<link') ||
            str_contains($lower, 'javascript:') ||
            str_contains($lower, 'onload=') ||
            str_contains($lower, 'onerror=')
        ) {
            return [
                'valid' => false,
                'token' => null,
                'error' => 'Arbitrary HTML, scripts, and event handlers are strictly prohibited for security.',
            ];
        }

        // Check if the administrator pasted the exact Google verification meta tag
        if (str_starts_with($trimmed, '<meta') || str_contains($trimmed, '<meta')) {
            $extracted = null;
            if (preg_match(self::META_TAG_NAME_FIRST, $trimmed, $matches)) {
                $extracted = trim($matches[1]);
            } elseif (preg_match(self::META_TAG_CONTENT_FIRST, $trimmed, $matches)) {
                $extracted = trim($matches[1]);
            }

            if ($extracted === null) {
                return [
                    'valid' => false,
                    'token' => null,
                    'error' => 'The pasted meta tag is not a recognized Google site verification tag. Expected format: <meta name="google-site-verification" content="TOKEN" />',
                ];
            }

            // Ensure the extracted token itself is valid
            if (!preg_match(self::TOKEN_REGEX, $extracted)) {
                return [
                    'valid' => false,
                    'token' => null,
                    'error' => 'The verification token extracted from the meta tag contains invalid characters or is not the correct length.',
                ];
            }

            return ['valid' => true, 'token' => $extracted, 'error' => null];
        }

        // If not a meta tag, input must be a raw token without HTML tags or quotes
        if (str_contains($trimmed, '<') || str_contains($trimmed, '>') || str_contains($trimmed, '"') || str_contains($trimmed, "'")) {
            return [
                'valid' => false,
                'token' => null,
                'error' => 'Invalid token format. Do not include raw HTML or quotes. Paste either the exact <meta> tag or only the verification token.',
            ];
        }

        if (!preg_match(self::TOKEN_REGEX, $trimmed)) {
            return [
                'valid' => false,
                'token' => null,
                'error' => 'Verification token must be 8-128 characters containing letters, numbers, hyphens, underscores, or plus/equals signs.',
            ];
        }

        return ['valid' => true, 'token' => $trimmed, 'error' => null];
    }
}
