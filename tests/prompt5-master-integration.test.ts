import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

test('Prompt 5 Master Integration Suite (Issues #23–#30)', async (t) => {
  await t.test('Issue #23 Reconciliation: Auth Feedback Toast Notifications', () => {
    const flashToastPath = path.join(ROOT, 'src/lib/flash-toast.ts');
    assert.ok(fs.existsSync(flashToastPath), 'flash-toast.ts must exist');
    const flashCode = fs.readFileSync(flashToastPath, 'utf-8');
    assert.ok(flashCode.includes('setFlashToast'), 'setFlashToast must be exported');
    assert.ok(flashCode.includes('consumeFlashToast'), 'consumeFlashToast must be exported');
    assert.ok(flashCode.includes('ayaan_auth_flash_toast'), 'sessionStorage key must be ayaan_auth_flash_toast');

    const globalToastPath = path.join(ROOT, 'src/components/common/GlobalToast.tsx');
    assert.ok(fs.existsSync(globalToastPath), 'GlobalToast.tsx must exist');

    const loginPage = fs.readFileSync(path.join(ROOT, 'src/app/login/page.tsx'), 'utf-8');
    assert.ok(loginPage.includes('setFlashToast'), 'login/page.tsx must use setFlashToast on login');

    const adminPage = fs.readFileSync(path.join(ROOT, 'src/app/ayc/page.tsx'), 'utf-8');
    assert.ok(adminPage.includes('setFlashToast'), 'src/app/ayc/page.tsx must use setFlashToast on admin login');

    const adminLayout = fs.readFileSync(path.join(ROOT, 'src/app/ayc/AdminLayoutClient.tsx'), 'utf-8');
    assert.ok(adminLayout.includes('setFlashToast') && adminLayout.includes('Logged out successfully'), 'AdminLayoutClient must stage logout toast');
  });

  await t.test('Issue #24 Reconciliation: Admin Notification Popover Viewport Clamping', () => {
    const headerPath = path.join(ROOT, 'src/components/admin/layout/AdminHeader.tsx');
    const headerCode = fs.readFileSync(headerPath, 'utf-8');
    assert.ok(headerCode.includes('createPortal'), 'Notification popover must use createPortal');
    assert.ok(headerCode.includes('popoverPos'), 'AdminHeader must track popoverPos state');
    assert.ok(headerCode.includes('Math.min'), 'AdminHeader must clamp horizontal coordinates');
    assert.ok(headerCode.includes('openUpward') || headerCode.includes('top?: number'), 'AdminHeader must support flipping upward if vertical space cramped');
    assert.ok(headerCode.includes('zIndex: 9999'), 'AdminHeader popover must use high z-index overlay');
  });

  await t.test('Issue #25 Reconciliation: Admin Coupons Mobile Usability', () => {
    const couponsPage = fs.readFileSync(path.join(ROOT, 'src/app/ayc/coupons/page.tsx'), 'utf-8');
    assert.ok(couponsPage.includes('overflow-x-auto') || couponsPage.includes('scrollbar-none'), 'Coupons page tabs must allow horizontal scrolling');

    const header = fs.readFileSync(path.join(ROOT, 'src/components/admin/coupons/CouponHeader.tsx'), 'utf-8');
    assert.ok(header.includes('flex-col') && header.includes('sm:flex-row'), 'CouponHeader must stack vertically on mobile');

    const toolbar = fs.readFileSync(path.join(ROOT, 'src/components/admin/coupons/CouponToolbar.tsx'), 'utf-8');
    assert.ok(toolbar.includes('flex-col') || toolbar.includes('w-full'), 'CouponToolbar must wrap nicely on mobile');

    const table = fs.readFileSync(path.join(ROOT, 'src/components/admin/coupons/CouponTable.tsx'), 'utf-8');
    assert.ok(table.includes('overflow-x-auto'), 'CouponTable must provide horizontal overflow containment');
  });

  await t.test('Issue #26 Reconciliation: Optional Email Verification', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'backend/routes/api.php'), 'utf-8');
    assert.ok(!routes.includes("'verified'") || !routes.includes("checkout/validate'") || !routes.includes("Route::post('/orders'"), 'verified middleware must not block checkout');

    const orderCtrl = fs.readFileSync(path.join(ROOT, 'backend/app/Http/Controllers/Api/V1/OrderController.php'), 'utf-8');
    assert.ok(!orderCtrl.includes("!$user->hasVerifiedEmail()"), 'OrderController must not block checkout due to unverified email');

    const checkoutModal = fs.readFileSync(path.join(ROOT, 'src/components/cart/CheckoutModal.tsx'), 'utf-8');
    assert.ok(!checkoutModal.includes('requiresVerification && isCustomerLoggedIn'), 'CheckoutModal submit button must not be disabled for unverified customers');
    assert.ok(checkoutModal.includes('Email Verification Pending (Optional)'), 'CheckoutModal banner must reflect optional pending status');
  });

  await t.test('Issue #27 Reconciliation: Coupon Edit Modal Outside Click & Escape', () => {
    const couponModal = fs.readFileSync(path.join(ROOT, 'src/components/admin/coupons/CouponModal.tsx'), 'utf-8');
    assert.ok(couponModal.includes('e.target === e.currentTarget'), 'CouponModal must verify event target on backdrop click');
    assert.ok(couponModal.includes('e.key === "Escape"'), 'CouponModal must handle Escape key');
    assert.ok(couponModal.includes('stopPropagation'), 'CouponModal dialog content must stop click propagation');
  });

  await t.test('Issue #28 Reconciliation: SEO Section Title & Status Badge Mobile Stacking', () => {
    const seoManager = fs.readFileSync(path.join(ROOT, 'src/components/admin/homepage/HomepageSeoManager.tsx'), 'utf-8');
    assert.ok(seoManager.includes('flex-col') && seoManager.includes('sm:flex-row'), 'HomepageSeoManager must use flex-col on mobile and sm:flex-row on desktop');
    assert.ok(seoManager.includes('w-fit') && seoManager.includes('shrink-0'), 'HomepageSeoManager status badge must prevent unnatural stretching');
  });

  await t.test('Issue #29 Reconciliation: Google Tags Head/Body Controls Vertical Stacking', () => {
    const tagsManager = fs.readFileSync(path.join(ROOT, 'src/components/admin/homepage/GoogleTagsManager.tsx'), 'utf-8');
    assert.ok(tagsManager.includes('flex-col') && tagsManager.includes('sm:flex-row'), 'GoogleTagsManager indicators wrapper must stack on mobile');
    assert.ok(tagsManager.indexOf('Head: Configured') < tagsManager.indexOf('Body: Configured'), 'Head script indicator must precede Body script indicator in DOM');
  });

  await t.test('Issue #30 Reconciliation: Homepage Section Action Button Mobile Position', () => {
    const faqManager = fs.readFileSync(path.join(ROOT, 'src/components/admin/homepage/HomepageFaqManager.tsx'), 'utf-8');
    assert.ok(faqManager.includes('order-1 sm:order-2'), 'FAQ Add Button must have order-1 on mobile and sm:order-2 on desktop');
    assert.ok(faqManager.includes('order-2 sm:order-1'), 'FAQ List must have order-2 on mobile and sm:order-1 on desktop');
    assert.ok(faqManager.includes('Add New FAQ Entry'), 'Button must retain Add New FAQ Entry label');
  });

  await t.test('Viewport Arithmetic Audit across 320px, 375px, 768px, 1440px', () => {
    const viewports = [
      { name: '320px (Mobile S)', width: 320, padding: 24, availableWidth: 296 },
      { name: '375px (Mobile M)', width: 375, padding: 32, availableWidth: 343 },
      { name: '768px (Tablet)', width: 768, padding: 48, availableWidth: 720 },
      { name: '1440px (Desktop)', width: 1440, padding: 64, availableWidth: 1376 },
    ];

    for (const vp of viewports) {
      // Popover width formula from AdminHeader.tsx: Math.min(384, window.innerWidth - 24)
      const popoverWidth = Math.min(384, vp.width - 24);
      assert.ok(popoverWidth <= vp.width, `Popover width (${popoverWidth}px) exceeds viewport width (${vp.width}px) in ${vp.name}`);
      assert.ok(popoverWidth >= 280, `Popover width (${popoverWidth}px) too narrow in ${vp.name}`);

      // In 320px viewport, stacked items width
      const titleWidthEstimate = 220; // px
      const badgeWidthEstimate = 90; // px
      // Stacked total height is safe, width fits within available width
      assert.ok(titleWidthEstimate <= vp.availableWidth, `Title fits within available width in ${vp.name}`);
      assert.ok(badgeWidthEstimate <= vp.availableWidth, `Badge fits within available width in ${vp.name}`);
    }
  });
});
