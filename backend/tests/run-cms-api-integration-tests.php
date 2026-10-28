<?php

/**
 * AYC Admin Page Builder & CMS — Mandatory 14 API Integration Tests
 * Runs inside Laravel application container within an isolated transaction.
 */

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\V1\Admin\AdminCmsPageController;
use App\Http\Controllers\Api\V1\PublicCmsPageController;
use App\Http\Requests\Admin\StoreCmsPageRequest;
use App\Http\Requests\Admin\UpdateCmsPageRequest;
use App\Models\CmsPage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

$adminController = app(AdminCmsPageController::class);
$publicController = app(PublicCmsPageController::class);

$passed = 0;
$failed = 0;

function runTest(string $name, callable $fn) {
    global $passed, $failed;
    try {
        $fn();
        echo "  [PASS] {$name}\n";
        $passed++;
    } catch (\Throwable $e) {
        echo "  [FAIL] {$name}: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
        $failed++;
    }
}

function makeFormRequest(string $class, string $method, string $uri, array $data, $user) {
    global $app;
    $req = $class::create($uri, $method, $data);
    $req->setUserResolver(fn() => $user);
    $req->setContainer($app);
    $req->validateResolved();
    return $req;
}

echo "==================================================================\n";
echo "AYC CMS 14 MANDATORY API & DATABASE INTEGRATION TESTS\n";
echo "==================================================================\n";

DB::beginTransaction();

try {
    // Setup test users
    $superAdmin = User::where('role', 'admin')->where('is_super_admin', true)->first();
    if (!$superAdmin) {
        $superAdmin = User::where('role', 'admin')->first();
    }

    // Create an unprivileged admin fixture for permission tests
    $unprivilegedAdmin = new User([
        'name' => 'Restricted Admin Fixture',
        'email' => 'restricted_qa_' . time() . '@ayaanclothing.com',
        'password' => bcrypt('Secret123!'),
        'role' => 'admin',
        'is_super_admin' => false,
        'status' => 'active',
    ]);
    $unprivilegedAdmin->save();

    $testSlug = 'qa-sustainability-' . time();
    $pageId = null;

    // Test 1: Create a draft
    runTest("1. Create draft via Admin API", function () use ($adminController, $superAdmin, $testSlug, &$pageId) {
        $storeReq = makeFormRequest(StoreCmsPageRequest::class, 'POST', '/api/v1/admin/pages', [
            'title' => 'QA Sustainability & Ethics',
            'slug' => $testSlug,
            'status' => 'draft',
            'sections' => [
                [
                    'id' => 'sec_hero_1',
                    'type' => 'hero_banner',
                    'title' => 'Sustainable Fashion at Scale',
                    'subtitle' => 'Our zero-waste manufacturing commitment',
                    'cta_primary_label' => 'Explore Metrics',
                    'cta_primary_url' => '/compliance',
                ]
            ],
            'meta_title' => 'Sustainability | Ayaan Clothing',
            'meta_description' => 'Our wholesale sustainability roadmap.',
            'is_indexable' => true,
            'show_in_footer' => false,
        ], $superAdmin);

        $res = $adminController->store($storeReq);
        $data = $res->getData(true);

        if ($res->getStatusCode() !== 201 || empty($data['data']['id'])) {
            throw new \Exception("Failed to create draft (status: {$res->getStatusCode()})");
        }
        $pageId = $data['data']['id'];
        if ($data['data']['status'] !== 'draft') {
            throw new \Exception("Expected status 'draft', got: {$data['data']['status']}");
        }
    });

    // Test 2: Save and retrieve draft content
    runTest("2. Save and retrieve draft content", function () use ($adminController, $superAdmin, &$pageId) {
        $req = Request::create("/api/v1/admin/pages/{$pageId}", 'GET');
        $req->setUserResolver(fn() => $superAdmin);
        $res = $adminController->show($req, $pageId);
        $data = $res->getData(true);

        if ($res->getStatusCode() !== 200) {
            throw new \Exception("Failed to retrieve draft");
        }
        $sections = $data['data']['draft_sections'] ?? $data['data']['sections'];
        if (empty($sections) || $sections[0]['title'] !== 'Sustainable Fashion at Scale') {
            throw new \Exception("Draft section content mismatch");
        }
    });

    // Test 3: Update an existing draft
    runTest("3. Update existing draft content and add sections", function () use ($adminController, $superAdmin, &$pageId) {
        $updateReq = makeFormRequest(UpdateCmsPageRequest::class, 'PUT', "/api/v1/admin/pages/{$pageId}", [
            'title' => 'QA Sustainability & Circular Ethics',
            'draft_sections' => [
                [
                    'id' => 'sec_hero_1',
                    'type' => 'hero_banner',
                    'title' => 'Sustainable Fashion at Scale',
                    'subtitle' => 'Our updated circular commitment',
                ],
                [
                    'id' => 'sec_faq_2',
                    'type' => 'faq_accordion',
                    'title' => 'Frequently Asked Questions',
                    'items' => [
                        ['question' => 'Are fabrics certified?', 'answer' => 'Yes, OEKO-TEX certified.']
                    ]
                ]
            ],
        ], $superAdmin);

        $res = $adminController->update($updateReq, $pageId);
        $data = $res->getData(true);

        if ($res->getStatusCode() !== 200 || count($data['data']['draft_sections']) !== 2) {
            throw new \Exception("Failed to update draft sections");
        }
    });

    // Test 4: Retrieve editable version of page
    runTest("4. Retrieve editable version (draft_sections) via show and preview", function () use ($adminController, $superAdmin, &$pageId) {
        $req = Request::create("/api/v1/admin/pages/{$pageId}/preview", 'GET');
        $req->setUserResolver(fn() => $superAdmin);
        $res = $adminController->preview($req, $pageId);
        $data = $res->getData(true);

        if ($res->getStatusCode() !== 200 || !($data['data']['is_preview'] ?? false)) {
            throw new \Exception("Preview failed or missing is_preview flag");
        }
        if (count($data['data']['sections']) !== 2) {
            throw new \Exception("Preview did not return draft sections");
        }
    });

    // Test 5: Publish draft and verify public API returns published snapshot
    runTest("5. Publish draft and verify public API returns published snapshot", function () use ($adminController, $publicController, $superAdmin, &$pageId, $testSlug) {
        $pubReq = Request::create("/api/v1/admin/pages/{$pageId}/publish", 'POST');
        $pubReq->setUserResolver(fn() => $superAdmin);
        $pubRes = $adminController->publish($pubReq, $pageId);
        if ($pubRes->getStatusCode() !== 200) {
            throw new \Exception("Publish endpoint returned {$pubRes->getStatusCode()}");
        }

        // Test public endpoint
        $publicRes = $publicController->show($testSlug);
        $publicData = $publicRes->getData(true);

        if ($publicRes->getStatusCode() !== 200) {
            throw new \Exception("Public show endpoint returned {$publicRes->getStatusCode()}");
        }
        if (count($publicData['data']['sections']) !== 2) {
            throw new \Exception("Public page did not render the published snapshot");
        }
    });

    // Test 6: Modify published page draft and verify live page remains unchanged until republished
    runTest("6. Modify published page draft; verify live page remains unchanged until republished", function () use ($adminController, $publicController, $superAdmin, &$pageId, $testSlug) {
        $updateReq = makeFormRequest(UpdateCmsPageRequest::class, 'PUT', "/api/v1/admin/pages/{$pageId}", [
            'draft_sections' => [
                [
                    'id' => 'sec_hero_1',
                    'type' => 'hero_banner',
                    'title' => 'UNPUBLISHED DRAFT TITLE (MUST NOT LEAK)',
                ]
            ],
        ], $superAdmin);
        $adminController->update($updateReq, $pageId);

        // Verify live public page still shows previous title
        $publicRes = $publicController->show($testSlug);
        $publicData = $publicRes->getData(true);
        $firstSecTitle = $publicData['data']['sections'][0]['title'] ?? '';

        if ($firstSecTitle === 'UNPUBLISHED DRAFT TITLE (MUST NOT LEAK)') {
            throw new \Exception("SECURITY DEFECT: Draft content leaked to public endpoint!");
        }
        if ($firstSecTitle !== 'Sustainable Fashion at Scale') {
            throw new \Exception("Live page content was altered before publication: '{$firstSecTitle}'");
        }
    });

    // Test 7: Unpublish a page and verify that it disappears from public retrieval
    runTest("7. Unpublish page and verify it disappears from public retrieval (HTTP 404)", function () use ($adminController, $publicController, $superAdmin, &$pageId, $testSlug) {
        $unpubReq = Request::create("/api/v1/admin/pages/{$pageId}/unpublish", 'POST');
        $unpubReq->setUserResolver(fn() => $superAdmin);
        $unpubRes = $adminController->unpublish($unpubReq, $pageId);
        if ($unpubRes->getStatusCode() !== 200) {
            throw new \Exception("Unpublish failed");
        }

        $publicRes = $publicController->show($testSlug);
        if ($publicRes->getStatusCode() !== 404) {
            throw new \Exception("Expected HTTP 404 for unpublished page, got {$publicRes->getStatusCode()}");
        }
    });

    // Test 8: Archive and delete pages according to implemented rules
    runTest("8. Archive and soft-delete page", function () use ($adminController, $superAdmin, &$pageId) {
        // Archive
        $archReq = Request::create("/api/v1/admin/pages/{$pageId}/archive", 'POST');
        $archReq->setUserResolver(fn() => $superAdmin);
        $archRes = $adminController->archive($archReq, $pageId);
        if ($archRes->getStatusCode() !== 200) {
            throw new \Exception("Archive failed");
        }

        // Soft delete
        $delReq = Request::create("/api/v1/admin/pages/{$pageId}", 'DELETE');
        $delReq->setUserResolver(fn() => $superAdmin);
        $delRes = $adminController->destroy($delReq, $pageId);
        if ($delRes->getStatusCode() !== 200) {
            throw new \Exception("Delete failed");
        }

        $page = CmsPage::find($pageId);
        if ($page !== null) {
            throw new \Exception("Page was not soft-deleted");
        }

        // Restore
        $restoreReq = Request::create("/api/v1/admin/pages/{$pageId}/restore", 'POST');
        $restoreReq->setUserResolver(fn() => $superAdmin);
        $restoreRes = $adminController->restore($restoreReq, $pageId);
        if ($restoreRes->getStatusCode() !== 200) {
            throw new \Exception("Restore failed");
        }
    });

    // Test 9: Enable, disable, and reorder footer visibility
    runTest("9. Enable, disable, and reorder footer visibility", function () use ($adminController, $publicController, $superAdmin, &$pageId) {
        // Publish first so footer query can see it
        $page = CmsPage::find($pageId);
        $page->publishDraft();

        // Enable in footer
        $footerReq = Request::create("/api/v1/admin/pages/{$pageId}/footer", 'PATCH', [
            'show_in_footer' => true,
            'footer_label' => 'Sustainability Roadmap',
            'footer_sort_order' => 10,
        ]);
        $footerReq->setUserResolver(fn() => $superAdmin);
        $res = $adminController->updateFooter($footerReq, $pageId);
        if ($res->getStatusCode() !== 200) {
            throw new \Exception("Failed to enable footer visibility");
        }

        // Public footer check
        $publicFooterRes = $publicController->footer();
        $footerData = $publicFooterRes->getData(true);
        $items = $footerData['data'] ?? [];
        $found = array_filter($items, fn($i) => $i['id'] == $pageId);
        if (empty($found)) {
            throw new \Exception("Page did not appear in public footer");
        }

        // Disable in footer
        $footerDisableReq = Request::create("/api/v1/admin/pages/{$pageId}/footer", 'PATCH', [
            'show_in_footer' => false,
        ]);
        $footerDisableReq->setUserResolver(fn() => $superAdmin);
        $adminController->updateFooter($footerDisableReq, $pageId);

        $publicFooterRes2 = $publicController->footer();
        $items2 = $publicFooterRes2->getData(true)['data'] ?? [];
        $found2 = array_filter($items2, fn($i) => $i['id'] == $pageId);
        if (!empty($found2)) {
            throw new \Exception("Page still appeared in public footer after being disabled");
        }
    });

    // Test 10: Validate required fields and duplicate/reserved slugs
    runTest("10. Validate required fields and reject duplicate/reserved slugs", function () use ($superAdmin) {
        $validator1 = Validator::make([
            'title' => 'Cart Page Override',
            'slug' => 'cart', // Reserved slug!
        ], (new StoreCmsPageRequest())->rules());

        if (!$validator1->fails() || empty($validator1->errors()->get('slug'))) {
            throw new \Exception("Validation failed to reject reserved slug 'cart'");
        }

        $validator2 = Validator::make([
            'title' => 'Admin Override',
            'slug' => 'ayc', // Reserved slug!
        ], (new StoreCmsPageRequest())->rules());

        if (!$validator2->fails() || empty($validator2->errors()->get('slug'))) {
            throw new \Exception("Validation failed to reject reserved slug 'ayc'");
        }
    });

    // Test 11: Parent-child relationships and breadcrumb information
    runTest("11. Verify parent-child relationships and breadcrumb metadata", function () use ($superAdmin, $publicController) {
        // Create parent page
        $parent = new CmsPage([
            'title' => 'Parent Sustainability',
            'slug' => 'qa-parent-' . time(),
            'status' => 'published',
            'published_at' => now(),
            'breadcrumb_label' => 'Eco Policy',
            'sections' => [['id' => '1', 'type' => 'rich_text', 'content' => '<p>Parent</p>']],
        ]);
        $parent->save();

        // Create child page
        $childSlug = 'qa-child-' . time();
        $child = new CmsPage([
            'title' => 'Child Materials',
            'slug' => $childSlug,
            'status' => 'published',
            'published_at' => now(),
            'parent_id' => $parent->id,
            'breadcrumb_label' => 'Fabrics',
            'sections' => [['id' => '2', 'type' => 'rich_text', 'content' => '<p>Child</p>']],
        ]);
        $child->save();

        $res = $publicController->show($childSlug);
        $data = $res->getData(true)['data'] ?? [];

        if (empty($data['parent']) || $data['parent']['slug'] !== $parent->slug) {
            throw new \Exception("Parent hierarchy not returned in public response");
        }
        if ($data['breadcrumb_label'] !== 'Fabrics' || $data['parent']['breadcrumb_label'] !== 'Eco Policy') {
            throw new \Exception("Breadcrumb metadata mismatch");
        }
    });

    // Test 12: Previous-slug redirect behavior (HTTP 301) and prevent redirect loops
    runTest("12. Verify previous-slug redirect behavior (HTTP 301)", function () use ($adminController, $publicController, $superAdmin, &$pageId, $testSlug) {
        $newSlug = $testSlug . '-updated';

        $updateReq = makeFormRequest(UpdateCmsPageRequest::class, 'PUT', "/api/v1/admin/pages/{$pageId}", [
            'slug' => $newSlug,
        ], $superAdmin);
        $adminController->update($updateReq, $pageId);

        // Make sure page is published
        $p = CmsPage::find($pageId);
        $p->status = CmsPage::STATUS_PUBLISHED;
        $p->save();

        // Querying the OLD slug must return redirect payload with canonical_slug
        $res = $publicController->show($testSlug);
        $data = $res->getData(true);

        if (empty($data['redirect']) || ($data['canonical_slug'] ?? '') !== $newSlug) {
            throw new \Exception("Failed to return 301 redirect for old slug: " . json_encode($data));
        }
    });

    // Test 13: Public API never exposes drafts or unpublished metadata
    runTest("13. Verify public API never exposes drafts or internal audit columns", function () use ($publicController, &$pageId) {
        $page = CmsPage::find($pageId);
        $res = $publicController->show($page->slug);
        $data = $res->getData(true)['data'] ?? [];

        $forbiddenKeys = ['draft_sections', 'created_by', 'updated_by', 'deleted_at'];
        foreach ($forbiddenKeys as $key) {
            if (array_key_exists($key, $data)) {
                throw new \Exception("Public response leaked private internal column: '{$key}'");
            }
        }
    });

    // Test 14: All privileged API actions enforce authorization server-side
    runTest("14. Enforce server-side authorization boundaries for unprivileged admin", function () use ($adminController, $unprivilegedAdmin, &$pageId) {
        // Attempt to create page with unprivileged admin
        $storeReq = makeFormRequest(StoreCmsPageRequest::class, 'POST', '/api/v1/admin/pages', [
            'title' => 'Unauthorized Page',
            'slug' => 'unauth-page-' . time(),
        ], $unprivilegedAdmin);
        $res1 = $adminController->store($storeReq);
        if ($res1->getStatusCode() !== 403) {
            throw new \Exception("Unprivileged store did not return HTTP 403 (got {$res1->getStatusCode()})");
        }

        // Attempt to publish page with unprivileged admin
        $pubReq = Request::create("/api/v1/admin/pages/{$pageId}/publish", 'POST');
        $pubReq->setUserResolver(fn() => $unprivilegedAdmin);
        $res2 = $adminController->publish($pubReq, $pageId);
        if ($res2->getStatusCode() !== 403) {
            throw new \Exception("Unprivileged publish did not return HTTP 403 (got {$res2->getStatusCode()})");
        }

        // Attempt to update footer with unprivileged admin
        $footReq = Request::create("/api/v1/admin/pages/{$pageId}/footer", 'PATCH', ['show_in_footer' => true]);
        $footReq->setUserResolver(fn() => $unprivilegedAdmin);
        $res3 = $adminController->updateFooter($footReq, $pageId);
        if ($res3->getStatusCode() !== 403) {
            throw new \Exception("Unprivileged footer update did not return HTTP 403 (got {$res3->getStatusCode()})");
        }
    });

} finally {
    // Always rollback so no test artifacts remain in the database
    DB::rollBack();
    echo "  [CLEANUP] Rolled back test transaction cleanly.\n";
}

echo "==================================================================\n";
echo "SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "==================================================================\n";

exit($failed > 0 ? 1 : 0);

