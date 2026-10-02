<?php

namespace App\Services\Media;

use DOMDocument;
use DOMElement;
use DOMXPath;

/**
 * Service for safely parsing, validating, and sanitizing SVG files.
 * Protects against XSS, XXE, entity expansion, embedded scripts, and malicious attributes.
 */
class SvgSanitizer
{
    /**
     * Disallowed SVG element tags that can execute code or embed dangerous content.
     */
    protected static array $disallowedTags = [
        'script',
        'iframe',
        'frame',
        'frameset',
        'object',
        'embed',
        'applet',
        'form',
        'input',
        'button',
        'select',
        'textarea',
        'keygen',
        'link',
        'meta',
        'base',
        'audio',
        'video',
        'foreignobject',
        'import',
        'xml',
        'html',
        'body',
        'head',
    ];

    /**
     * Validate and sanitize raw SVG content.
     * Returns sanitized SVG XML string on success, or null if the content is invalid or unrecoverably unsafe.
     */
    public static function sanitize(string $svgContent): ?string
    {
        $trimmed = trim($svgContent);
        if ($trimmed === '') {
            return null;
        }

        // 1. Strip UTF-8 BOM if present
        if (str_starts_with($trimmed, "\xEF\xBB\xBF")) {
            $trimmed = substr($trimmed, 3);
            $trimmed = trim($trimmed);
        }

        // 2. Reject dangerous DOCTYPE / ENTITY declarations (XXE / Billion Laughs protection)
        if (preg_match('/<!ENTITY/i', $trimmed) || preg_match('/<!DOCTYPE[^>]*\[/i', $trimmed)) {
            return null;
        }

        // Remove XML declaration or simple DOCTYPE without internal subset
        $cleanedXml = preg_replace('/<\?xml[^>]*\?>/i', '', $trimmed);
        $cleanedXml = preg_replace('/<!DOCTYPE[^>]*>/i', '', $cleanedXml);
        $cleanedXml = trim($cleanedXml);

        if ($cleanedXml === '') {
            return null;
        }

        // 3. Load into DOMDocument safely without network access
        $dom = new DOMDocument();
        $dom->formatOutput = true;
        $dom->preserveWhiteSpace = false;

        $previousLibxmlState = libxml_use_internal_errors(true);

        $flags = LIBXML_NONET | LIBXML_NOBLANKS | LIBXML_NOWARNING | LIBXML_NOERROR;
        if (defined('LIBXML_NOENT')) {
            // Do not expand entities
        }

        $loaded = $dom->loadXML($cleanedXml, $flags);
        libxml_clear_errors();
        libxml_use_internal_errors($previousLibxmlState);

        if (!$loaded) {
            return null;
        }

        // 4. Verify root element is <svg>
        $root = $dom->documentElement;
        if (!$root || strtolower($root->localName ?? $root->tagName) !== 'svg') {
            return null;
        }

        // 5. Walk DOM and clean elements & attributes
        $xpath = new DOMXPath($dom);

        // Remove disallowed elements
        foreach (self::$disallowedTags as $disallowedTag) {
            $nodes = $xpath->query('//*[local-name() = "' . $disallowedTag . '"]');
            if ($nodes) {
                for ($i = $nodes->length - 1; $i >= 0; $i--) {
                    $node = $nodes->item($i);
                    $node->parentNode?->removeChild($node);
                }
            }
        }

        // Clean all remaining elements
        $allNodes = $xpath->query('//*');
        if ($allNodes) {
            foreach ($allNodes as $node) {
                if (!($node instanceof DOMElement)) {
                    continue;
                }

                $attrsToRemove = [];
                for ($i = 0; $i < $node->attributes->length; $i++) {
                    $attr = $node->attributes->item($i);
                    if (!$attr) {
                        continue;
                    }

                    $attrName = strtolower($attr->name);
                    $attrValue = $attr->value;

                    // Remove any event-handler attributes (e.g. onload, onerror, onclick)
                    if (str_starts_with($attrName, 'on') || str_starts_with($attrName, 'xmlns:on')) {
                        $attrsToRemove[] = $attr->name;
                        continue;
                    }

                    // Check for JavaScript URLs, VBScript, or data:text/html in attribute values
                    $decoded = rawurldecode($attrValue);
                    $decoded = html_entity_decode($decoded, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                    $strippedProtocol = preg_replace('/[\x00-\x20\s]+/', '', $decoded);

                    if (preg_match('/(javascript|vbscript|data:text\/html|data:text\/javascript|data:application\/javascript):/i', $strippedProtocol)) {
                        $attrsToRemove[] = $attr->name;
                        continue;
                    }

                    // Remove CSS expressions or dangerous behavior references
                    if (stripos($decoded, 'expression(') !== false || stripos($decoded, '-moz-binding') !== false) {
                        $attrsToRemove[] = $attr->name;
                        continue;
                    }
                }

                foreach ($attrsToRemove as $name) {
                    $node->removeAttribute($name);
                }

                // If element is <style>, sanitize style text content
                if (strtolower($node->localName ?? $node->tagName) === 'style') {
                    $css = $node->textContent;
                    if (preg_match('/(@import|expression\(|-moz-binding|javascript:)/i', $css)) {
                        // Strip dangerous CSS or remove style tag if severely compromised
                        $cleanCss = preg_replace('/@import[^;]*;/i', '', $css);
                        $cleanCss = preg_replace('/expression\([^)]*\)/i', '', $cleanCss);
                        $cleanCss = preg_replace('/javascript:[^;)]*/i', '', $cleanCss);
                        $node->textContent = $cleanCss;
                    }
                }
            }
        }

        // 6. Ensure standard SVG namespace exists
        if (!$root->hasAttribute('xmlns')) {
            $root->setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

        $sanitizedSvg = $dom->saveXML($root);
        return $sanitizedSvg ?: null;
    }
}
