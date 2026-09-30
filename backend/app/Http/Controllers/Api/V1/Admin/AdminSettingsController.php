<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalPage;
use App\Models\SystemSetting;
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
        $whatsappDisplay = SystemSetting::get('whatsapp_display', env('NEXT_PUBLIC_WHATSAPP_DISPLAY', '+880 1982-183886'));
        $whatsappNumber = SystemSetting::get('whatsapp_number');
        if (empty($whatsappNumber)) {
            $whatsappNumber = WhatsAppNormalizationService::deriveMachineNumber($whatsappDisplay);
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

        // Normalize WhatsApp Display and automatically derive machine/URL number
        $display = trim($validated['whatsapp_display']);
        $machineNumber = WhatsAppNormalizationService::deriveMachineNumber($display);

        SystemSetting::set('site_title', trim($validated['site_title']), 'string', 'branding');
        SystemSetting::set('whatsapp_display', $display, 'string', 'contact');
        SystemSetting::set('whatsapp_number', $machineNumber, 'string', 'contact');

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
     * Upload Site Logo.
     * STRICT REQUIREMENT: PNG only!
     * Server-side MIME, extension, and binary header validation.
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

        // Check 1: Strict extension check (case-insensitive)
        $extension = strtolower($file->getClientOriginalExtension());
        if ($extension !== 'png') {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid file format. The website logo must be a PNG image.',
                'errors' => [
                    'logo' => ['Only PNG images are allowed. JPG, JPEG, WebP, SVG, and GIF are strictly rejected.']
                ],
            ], 422);
        }

        // Check 2: Laravel standard validation rules
        $validator = Validator::make($request->all(), [
            'logo' => [
                'required',
                'file',
                'image',
                'mimes:png',
                'mimetypes:image/png',
                'max:5120', // 5MB max
            ],
        ], [
            'logo.mimes' => 'The logo must be a PNG file.',
            'logo.mimetypes' => 'The logo MIME type must be image/png.',
            'logo.max' => 'The logo image must not exceed 5MB.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check 3: Binary image header verification
        $realPath = $file->getRealPath();
        $imageInfo = @getimagesize($realPath);
        if (!$imageInfo || $imageInfo[2] !== IMAGETYPE_PNG) {
            return response()->json([
                'status' => 'error',
                'message' => 'The uploaded file does not contain valid PNG image data.',
                'errors' => ['logo' => ['The file content is not a valid PNG image.']],
            ], 422);
        }

        // Store to public branding storage disk
        $path = $file->store('branding', 'public');
        $logoUrl = asset('storage/' . $path);

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
