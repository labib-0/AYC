<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Admin\StoreCmsPageRequest;
use App\Http\Requests\Admin\UpdateCmsPageRequest;
use App\Models\CmsPage;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminCmsPageController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * List all CMS pages with search, status filtering, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.view')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.view'.");
        }

        $query = CmsPage::with(['parent:id,title,slug', 'creator:id,name', 'updater:id,name']);

        // Filter by status (draft, published, archived)
        if ($request->filled('status')) {
            $status = strtolower($request->input('status'));
            if (in_array($status, [CmsPage::STATUS_DRAFT, CmsPage::STATUS_PUBLISHED, CmsPage::STATUS_ARCHIVED], true)) {
                $query->where('status', $status);
            }
        }

        // Filter by footer visibility
        if ($request->has('show_in_footer')) {
            $showInFooter = filter_var($request->input('show_in_footer'), FILTER_VALIDATE_BOOLEAN);
            $query->where('show_in_footer', $showInFooter);
        }

        // Search by title or slug
        if ($request->filled('search')) {
            $term = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                  ->orWhere('slug', 'like', $term);
            });
        }

        // Order
        $sortBy = $request->input('sort_by', 'updated_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['title', 'slug', 'status', 'footer_sort_order', 'published_at', 'created_at', 'updated_at'], true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('updated_at', 'desc');
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);

        if ($request->boolean('all')) {
            $pages = $query->get();
            return $this->success($pages, 'CMS pages retrieved successfully.');
        }

        $paginated = $query->paginate($perPage);

        return $this->success($paginated, 'CMS pages retrieved successfully.');
    }

    /**
     * Retrieve single page details for editing (includes draft sections & published sections).
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.view')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.view'.");
        }

        $page = CmsPage::with(['parent:id,title,slug', 'creator:id,name', 'updater:id,name'])->find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        return $this->success($page, 'CMS page retrieved successfully.');
    }

    /**
     * Create a new CMS page draft.
     */
    public function store(StoreCmsPageRequest $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.create')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.create'.");
        }

        $data = $request->validated();
        $sections = $data['sections'] ?? [];
        $draftSections = $data['draft_sections'] ?? $sections;

        $page = new CmsPage();
        $page->fill($data);
        $page->status = $data['status'] ?? CmsPage::STATUS_DRAFT;
        $page->sections = $sections;
        $page->draft_sections = $draftSections;
        $page->created_by = $user->id;
        $page->updated_by = $user->id;

        if ($page->status === CmsPage::STATUS_PUBLISHED) {
            if (!$this->authorization->can($user, 'page.publish')) {
                return $this->forbidden("Forbidden: insufficient permission 'page.publish' to publish immediately.");
            }
            $page->published_at = now();
        }

        $page->save();

        return $this->success($page, 'CMS page created successfully.', 201);
    }

    /**
     * Update an existing CMS page draft/settings.
     */
    public function update(UpdateCmsPageRequest $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.edit')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.edit'.");
        }

        $page = CmsPage::find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        $data = $request->validated();

        // Track slug change for 301 redirects
        if (isset($data['slug']) && $data['slug'] !== $page->slug) {
            $prevSlugs = $page->previous_slugs ?? [];
            if (!in_array($page->slug, $prevSlugs, true)) {
                $prevSlugs[] = $page->slug;
                $page->previous_slugs = array_values(array_unique($prevSlugs));
            }
        }

        // If draft_sections or sections are sent, update draft_sections
        if (array_key_exists('draft_sections', $data)) {
            $page->draft_sections = $data['draft_sections'];
            unset($data['draft_sections']);
        } elseif (array_key_exists('sections', $data) && $page->status !== CmsPage::STATUS_PUBLISHED) {
            $page->draft_sections = $data['sections'];
            $page->sections = $data['sections'];
            unset($data['sections']);
        } elseif (array_key_exists('sections', $data) && $page->status === CmsPage::STATUS_PUBLISHED) {
            // Keep published sections intact, store changes as working draft
            $page->draft_sections = $data['sections'];
            unset($data['sections']);
        }

        $page->fill($data);
        $page->updated_by = $user->id;
        $page->save();

        return $this->success($page, 'CMS page updated successfully.');
    }

    /**
     * Atomically publish working draft to the public storefront.
     */
    public function publish(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.publish')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.publish'.");
        }

        $page = CmsPage::find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        DB::transaction(function () use ($page, $user) {
            $page->publishDraft($user->id);
        });

        return $this->success($page, "CMS page '{$page->title}' published successfully.");
    }

    /**
     * Unpublish a page (revert status to draft).
     */
    public function unpublish(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.publish')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.publish'.");
        }

        $page = CmsPage::find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        $page->unpublish($user->id);

        return $this->success($page, "CMS page '{$page->title}' unpublished.");
    }

    /**
     * Archive a page.
     */
    public function archive(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.delete')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.delete'.");
        }

        $page = CmsPage::find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        $page->archive($user->id);

        return $this->success($page, "CMS page '{$page->title}' archived.");
    }

    /**
     * Soft-delete a page.
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.delete')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.delete'.");
        }

        $page = CmsPage::find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        $page->delete();

        return $this->success(null, "CMS page '{$page->title}' deleted successfully.");
    }

    /**
     * Restore a soft-deleted page.
     */
    public function restore(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.delete')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.delete'.");
        }

        $page = CmsPage::withTrashed()->find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        $page->restore();

        return $this->success($page, "CMS page '{$page->title}' restored successfully.");
    }

    /**
     * Update footer visibility and display settings.
     */
    public function updateFooter(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.footer.manage')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.footer.manage'.");
        }

        $page = CmsPage::find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        $request->validate([
            'show_in_footer'    => ['required', 'boolean'],
            'footer_label'      => ['nullable', 'string', 'max:100'],
            'footer_sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $page->show_in_footer = $request->boolean('show_in_footer');
        if ($request->has('footer_label')) {
            $page->footer_label = $request->input('footer_label');
        }
        if ($request->has('footer_sort_order')) {
            $page->footer_sort_order = (int) $request->input('footer_sort_order');
        }
        $page->updated_by = $user->id;
        $page->save();

        return $this->success($page, "Footer settings updated for '{$page->title}'.");
    }

    /**
     * Bulk reorder footer order.
     */
    public function reorderFooter(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.footer.manage')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.footer.manage'.");
        }

        $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'integer', 'exists:cms_pages,id'],
            'orders.*.footer_sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->input('orders') as $item) {
                CmsPage::where('id', $item['id'])->update([
                    'footer_sort_order' => (int) $item['footer_sort_order'],
                ]);
            }
        });

        $pages = CmsPage::footerVisible()->get(['id', 'title', 'slug', 'footer_label', 'footer_sort_order']);

        return $this->success($pages, 'Footer page order updated successfully.');
    }

    /**
     * Return working draft preview data for authorized administrators.
     */
    public function preview(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$this->authorization->can($user, 'page.view')) {
            return $this->forbidden("Forbidden: insufficient permission 'page.view'.");
        }

        $page = CmsPage::with(['parent:id,title,slug'])->find($id);
        if (!$page) {
            return $this->notFound("CMS page not found.");
        }

        // Preview uses draft_sections if present, else published sections
        $previewData = $page->toArray();
        $previewData['sections'] = !empty($page->draft_sections) ? $page->draft_sections : ($page->sections ?? []);
        $previewData['is_preview'] = true;

        return $this->success($previewData, 'Draft preview data retrieved.');
    }
}

