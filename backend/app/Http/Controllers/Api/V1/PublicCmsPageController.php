<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\CmsPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicCmsPageController extends ApiController
{
    /**
     * Retrieve published, footer-enabled CMS page links.
     * Publicly accessible, strictly filtered to published pages.
     */
    public function footer(): JsonResponse
    {
        $pages = CmsPage::footerVisible()
            ->get(['id', 'title', 'slug', 'footer_label', 'footer_sort_order']);

        return $this->success($pages, 'Footer pages retrieved successfully.');
    }

    /**
     * Retrieve a published CMS page by its slug for public storefront rendering.
     */
    public function show(string $slug): JsonResponse
    {
        $cleanSlug = strtolower(trim($slug));

        // 1. Direct match on published slug (or scheduled draft ready for promotion)
        $scheduledDraft = CmsPage::where('status', CmsPage::STATUS_DRAFT)
            ->whereNotNull('scheduled_publish_at')
            ->where('scheduled_publish_at', '<=', now())
            ->where('slug', $cleanSlug)
            ->first();
        if ($scheduledDraft) {
            $scheduledDraft->publishDraft();
        }

        $page = CmsPage::published()
            ->with(['parent:id,title,slug,breadcrumb_label'])
            ->where('slug', $cleanSlug)
            ->first();

        if ($page) {
            $publicData = [
                'id'               => $page->id,
                'title'            => $page->title,
                'slug'             => $page->slug,
                'status'           => $page->status,
                'sections'         => $page->sections ?? [],
                'parent'           => $page->parent ? [
                    'id'               => $page->parent->id,
                    'title'            => $page->parent->title,
                    'slug'             => $page->parent->slug,
                    'breadcrumb_label' => $page->parent->breadcrumb_label,
                ] : null,
                'breadcrumb_label' => $page->breadcrumb_label,
                'meta_title'       => $page->meta_title,
                'meta_description' => $page->meta_description,
                'canonical_url'    => $page->canonical_url,
                'og_image_url'     => $page->og_image_url,
                'is_indexable'     => $page->is_indexable,
                'published_at'     => $page->published_at?->toIso8601String(),
                'updated_at'       => $page->updated_at?->toIso8601String(),
            ];

            return $this->success($publicData, 'Page retrieved successfully.');
        }

        // 2. Check for renamed slug / 301 redirect in previous_slugs
        $redirectPage = CmsPage::published()
            ->whereJsonContains('previous_slugs', $cleanSlug)
            ->first(['id', 'slug', 'title']);

        if ($redirectPage) {
            return response()->json([
                'success'        => true,
                'redirect'       => true,
                'canonical_slug' => $redirectPage->slug,
                'canonical_url'  => '/' . $redirectPage->slug,
                'status_code'    => 301,
            ], 200);
        }

        return $this->notFound("Page '/{$slug}' not found.");
    }

    /**
     * Lightweight list of published indexable pages for sitemap generation.
     */
    public function published(): JsonResponse
    {
        $pages = CmsPage::indexable()
            ->select(['id', 'title', 'slug', 'updated_at', 'published_at'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return $this->success($pages, 'Published indexable pages retrieved.');
    }
}

