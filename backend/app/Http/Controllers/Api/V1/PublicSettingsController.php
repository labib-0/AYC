<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LegalPage;
use App\Models\SystemSetting;
use App\Services\Settings\WhatsAppNormalizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PublicSettingsController extends Controller
{
    /**
     * Get public-safe customer storefront settings.
     * Contains only non-sensitive branding, contact, and legal metadata.
     */
    public function getPublicSettings(): JsonResponse
    {
        $settings = Cache::remember('site_settings_public', 3600, function () {
            $siteTitle = SystemSetting::get('site_title', config('app.name', 'AYAAN CLOTHING'));
            $siteLogo = SystemSetting::get('site_logo', null);

            $whatsappDisplay = SystemSetting::get('whatsapp_display', env('NEXT_PUBLIC_WHATSAPP_DISPLAY', WhatsAppNormalizationService::CANONICAL_DISPLAY));
            $whatsappNumber = SystemSetting::get('whatsapp_number');
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
            }

            $whatsappUrl = WhatsAppNormalizationService::buildWhatsAppUrl($whatsappNumber);

            $storedSocialLinks = SystemSetting::get('social_links', null);
            if (is_array($storedSocialLinks)) {
                $socialLinks = array_values(array_filter($storedSocialLinks, function ($item) {
                    return !empty($item['is_active']);
                }));
                usort($socialLinks, function ($a, $b) {
                    return ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0);
                });
            } else {
                // Default fallback links
                $socialLinks = [
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
                ];
            }

            $legalPages = LegalPage::where('is_active', true)
                ->select(['type', 'title', 'updated_at'])
                ->get()
                ->map(function ($page) {
                    $slug = $page->type === 'privacy_policy' ? '/privacy-policy' : '/terms-and-conditions';
                    return [
                        'type' => $page->type,
                        'title' => $page->title,
                        'url' => $slug,
                        'updated_at' => $page->updated_at?->toIso8601String(),
                    ];
                });

            return [
                'site_title' => $siteTitle,
                'site_logo' => $siteLogo,
                'whatsapp' => [
                    'display' => $whatsappDisplay,
                    'number' => $whatsappNumber,
                    'url' => $whatsappUrl,
                ],
                'social_links' => $socialLinks,
                'legal_pages' => $legalPages,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $settings,
        ]);
    }

    /**
     * Get public legal page content by type (e.g. privacy_policy, terms_conditions).
     */
    public function getLegalPage(string $type): JsonResponse
    {
        $normalizedType = str_replace('-', '_', strtolower(trim($type)));

        $cacheKey = "legal_page_{$normalizedType}";
        $page = Cache::remember($cacheKey, 3600, function () use ($normalizedType) {
            return LegalPage::where('type', $normalizedType)
                ->where('is_active', true)
                ->first();
        });

        if (!$page) {
            return response()->json([
                'status' => 'error',
                'message' => 'Legal page not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $page->id,
                'type' => $page->type,
                'title' => $page->title,
                'content' => $page->content,
                'updated_at' => $page->updated_at?->toIso8601String(),
            ],
        ]);
    }
}
