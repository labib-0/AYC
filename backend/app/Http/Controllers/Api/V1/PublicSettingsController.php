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

            $storedSocialLinks = SystemSetting::get('social_links', null);
            if (is_array($storedSocialLinks)) {
                $socialLinks = array_values(array_filter($storedSocialLinks, function ($item) {
                    if (empty($item['is_active'])) {
                        return false;
                    }
                    $url = trim($item['url'] ?? '');
                    if ($url === '') {
                        return false;
                    }
                    $provider = strtolower(trim($item['provider'] ?? ''));
                    if (in_array($provider, ['linkedin', 'tiktok', 'instagram', 'facebook', 'youtube', 'x', 'twitter'])) {
                        $parsed = parse_url($url);
                        $path = trim($parsed['path'] ?? '', '/');
                        $query = $parsed['query'] ?? '';
                        if ($path === '' && $query === '') {
                            return false;
                        }
                    }
                    return true;
                }));
                usort($socialLinks, function ($a, $b) {
                    return ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0);
                });
            } else {
                // Default fallback: verified official Facebook profile
                $socialLinks = [
                    [
                        'id' => 'link_facebook',
                        'provider' => 'facebook',
                        'name' => 'Facebook',
                        'url' => 'https://www.facebook.com/profile.php?id=61579913706663',
                        'icon' => 'facebook',
                        'is_active' => true,
                        'sort_order' => 1,
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
                })
                ->values()
                ->all();

            $rawFaqs = SystemSetting::get('homepage_faqs', []);
            $activeFaqs = [];
            if (is_array($rawFaqs)) {
                foreach ($rawFaqs as $faq) {
                    if (!empty($faq['is_active'])) {
                        $activeFaqs[] = [
                            'id' => $faq['id'] ?? null,
                            'question' => $faq['question'] ?? '',
                            'answer' => $faq['answer'] ?? '',
                            'sort_order' => $faq['sort_order'] ?? 0,
                            'is_active' => true,
                        ];
                    }
                }
                usort($activeFaqs, fn($a, $b) => ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0));
            }

            return [
                'site_title' => $siteTitle,
                'company_name' => SystemSetting::get('company_name', $siteTitle),
                'footer_description' => SystemSetting::get('footer_description', 'Ready-made Garments Manufacturer & Exporter. Serving international retail chains and corporate apparel importers with export-grade ready-made garments.'),
                'public_email' => SystemSetting::get('business_email', 'export@ayaanclothing.com'),
                'public_phone' => SystemSetting::get('business_phone', '+880 1620-853502'),
                'public_address' => SystemSetting::get('office_address_formatted', 'House #33, Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh'),
                'site_logo' => $siteLogo,
                'faqs' => $activeFaqs,
                'whatsapp' => [
                    'display' => $whatsappDisplay,
                    'number' => $whatsappNumber,
                    'url' => $whatsappUrl,
                ],
                'whatsapp_display' => $whatsappDisplay,
                'whatsapp_canonical' => $whatsappNumber,
                'whatsapp_url' => $whatsappUrl,
                'social_links' => $socialLinks,
                'legal_pages' => $legalPages,
                'google_search_console_verification' => SystemSetting::getGoogleSearchConsoleVerification(),
                'google_tag_head_code' => SystemSetting::getGoogleTagHeadCode(),
                'google_tag_body_code' => SystemSetting::getGoogleTagBodyCode(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $settings,
        ]);
    }

    /**
     * Get public FAQs for storefront.
     */
    public function getFaqs(): JsonResponse
    {
        $rawFaqs = SystemSetting::get('homepage_faqs', []);
        $activeFaqs = [];
        if (is_array($rawFaqs)) {
            foreach ($rawFaqs as $faq) {
                if (!empty($faq['is_active'])) {
                    $activeFaqs[] = [
                        'id' => $faq['id'] ?? null,
                        'question' => $faq['question'] ?? '',
                        'answer' => $faq['answer'] ?? '',
                        'sort_order' => $faq['sort_order'] ?? 0,
                        'is_active' => true,
                    ];
                }
            }
            usort($activeFaqs, fn($a, $b) => ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0));
        }

        return response()->json([
            'status' => 'success',
            'data' => $activeFaqs,
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
