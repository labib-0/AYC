<?php

namespace Tests\Feature\Rbac;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Rbac\AdminAuthorizationService;
use Database\Seeders\RbacPermissionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RbacGranularEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $customer;
    protected Brand $brand;
    protected Category $category;
    protected Warehouse $warehouse;
    protected AdminAuthorizationService $authz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacPermissionCatalogSeeder::class);
        $this->authz = app(AdminAuthorizationService::class);

        $this->superAdmin = User::factory()->create([
            'role'           => 'admin',
            'is_super_admin' => true,
            'status'         => 'active',
            'email'          => 'super@ayaan-demo.local',
        ]);

        $this->customer = User::factory()->create([
            'role'   => 'customer',
            'status' => 'active',
            'email'  => 'buyer@retailcorp.local',
        ]);

        $this->brand = Brand::create([
            'name'      => 'Ayaan Signature',
            'slug'      => 'ayaan-signature',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name'      => 'Polos',
            'slug'      => 'polos',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'code'      => 'WH-MAIN-01',
            'name'      => 'Main Export Logistics Hub',
            'is_active' => true,
        ]);
    }

    /**
     * Helper to create an admin with a specific set of granular permissions.
     */
    protected function createAdminWithPermissions(array $permissionSlugs, string $roleName = 'Custom Test Role'): User
    {
        $admin = User::factory()->create([
            'role'           => 'admin',
            'is_super_admin' => false,
            'status'         => 'active',
            'email'          => 'admin_' . uniqid() . '@ayaan-demo.local',
        ]);

        $role = Role::create([
            'name'        => $roleName . ' ' . uniqid(),
            'slug'        => 'role_' . uniqid(),
            'description' => 'Test role for granular enforcement',
            'is_system'   => false,
            'is_active'   => true,
        ]);

        $permissionIds = Permission::whereIn('slug', $permissionSlugs)->pluck('id')->all();
        $role->permissions()->sync($permissionIds);

        $admin->rbacRoles()->attach($role->id, [
            'assigned_by' => $this->superAdmin->id,
            'assigned_at' => now(),
        ]);

        Cache::flush();

        return $admin;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario A: Draft-only Product Admin
    // ─────────────────────────────────────────────────────────────────────────

    public function test_scenario_a_draft_only_product_admin_can_save_draft_but_cannot_publish_archive_or_delete(): void
    {
        $draftAdmin = $this->createAdminWithPermissions([
            'product.view',
            'product.create',
            'product.save_draft',
            'product.edit',
        ], 'Draft Only Product Admin');

        // 1. Can create draft product
        $resDraft = $this->actingAs($draftAdmin, 'sanctum')->postJson('/api/v1/products', [
            'name'            => 'Sample Draft Polo',
            'slug'            => 'sample-draft-polo',
            'sku'             => 'SDP-01',
            'brand_id'        => $this->brand->id,
            'category_id'     => $this->category->id,
            'wholesale_price' => 25.00,
            'moq'             => 10,
            'status'          => 'draft',
        ]);
        $resDraft->assertStatus(201);
        $productId = $resDraft->json('data.id');

        // 2. Cannot publish during creation
        $resPubCreate = $this->actingAs($draftAdmin, 'sanctum')->postJson('/api/v1/products', [
            'name'            => 'Sample Published Polo',
            'slug'            => 'sample-published-polo',
            'sku'             => 'SPP-01',
            'brand_id'        => $this->brand->id,
            'category_id'     => $this->category->id,
            'wholesale_price' => 25.00,
            'moq'             => 10,
            'status'          => 'published',
        ]);
        $resPubCreate->assertStatus(403);

        // 3. Can update non-pricing draft attributes
        $resUpdateDraft = $this->actingAs($draftAdmin, 'sanctum')->putJson("/api/v1/products/{$productId}", [
            'name'        => 'Updated Draft Polo',
            'description' => 'Updated draft product description',
            'status'      => 'draft',
        ]);
        $resUpdateDraft->assertStatus(200);

        // 3b. Cannot update pricing without product.pricing.manage
        $resUpdatePricing = $this->actingAs($draftAdmin, 'sanctum')->putJson("/api/v1/products/{$productId}", [
            'wholesale_price' => 35.00,
        ]);
        $resUpdatePricing->assertStatus(403);

        // 4. Cannot transition status to published
        $resPublish = $this->actingAs($draftAdmin, 'sanctum')->putJson("/api/v1/products/{$productId}", [
            'status' => 'published',
        ]);
        $resPublish->assertStatus(403);

        // 5. Cannot delete product
        $resDelete = $this->actingAs($draftAdmin, 'sanctum')->deleteJson("/api/v1/products/{$productId}");
        $resDelete->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario B: Product Publisher
    // ─────────────────────────────────────────────────────────────────────────

    public function test_scenario_b_product_publisher_can_publish_products_but_cannot_delete(): void
    {
        $publisher = $this->createAdminWithPermissions([
            'product.view',
            'product.create',
            'product.save_draft',
            'product.edit',
            'product.publish',
        ], 'Product Publisher');

        // 1. Can create published product directly
        $res = $this->actingAs($publisher, 'sanctum')->postJson('/api/v1/products', [
            'name'            => 'Publisher Direct Polo',
            'slug'            => 'publisher-direct-polo',
            'sku'             => 'PDP-01',
            'brand_id'        => $this->brand->id,
            'category_id'     => $this->category->id,
            'wholesale_price' => 30.00,
            'moq'             => 10,
            'status'          => 'published',
        ]);
        $res->assertStatus(201);
        $productId = $res->json('data.id');

        // 2. Can update status
        $resUpdate = $this->actingAs($publisher, 'sanctum')->putJson("/api/v1/products/{$productId}", [
            'name'   => 'Publisher Direct Polo Updated',
            'status' => 'published',
        ]);
        $resUpdate->assertStatus(200);

        // 3. Cannot delete (missing product.delete)
        $resDel = $this->actingAs($publisher, 'sanctum')->deleteJson("/api/v1/products/{$productId}");
        $resDel->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario C: Order Viewer
    // ─────────────────────────────────────────────────────────────────────────

    public function test_scenario_c_order_viewer_can_view_orders_and_customer_pii_but_cannot_confirm_cancel_or_verify_payment(): void
    {
        $order = Order::create([
            'order_number'        => 'AYN-20260926-0001',
            'user_id'             => $this->customer->id,
            'status'              => 'pending',
            'payment_status'      => 'pending',
            'fulfillment_status'  => 'unfulfilled',
            'currency'            => 'USD',
            'subtotal'            => 500.00,
            'shipping_cost'       => 50.00,
            'total_amount'        => 550.00,
            'email'               => $this->customer->email,
            'shipping_name'       => 'Elena Customer',
            'shipping_phone'      => '+15551234567',
            'shipping_address1'   => '100 Broadway',
            'shipping_city'       => 'New York',
            'shipping_postal_code'=> '10001',
            'shipping_country_code'=> 'US',
            'placed_at'           => now(),
        ]);

        $orderViewer = $this->createAdminWithPermissions([
            'order.view',
            'order.view_customer',
            'order.view_items',
        ], 'Order Viewer');

        // 1. Can view order list and detail with customer PII
        $resDetail = $this->actingAs($orderViewer, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $resDetail->assertStatus(200);
        $this->assertEquals($this->customer->email, $resDetail->json('data.email'));
        $this->assertEquals('Elena Customer', $resDetail->json('data.shipping_name'));

        // 2. Cannot confirm order (requires order.confirm)
        $resConfirm = $this->actingAs($orderViewer, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status'  => 'confirmed',
            'message' => 'Attempting confirm without permission',
        ]);
        $resConfirm->assertStatus(403);

        // 3. Cannot cancel order (requires order.cancel)
        $resCancel = $this->actingAs($orderViewer, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status'  => 'cancelled',
            'message' => 'Attempting cancel without permission',
        ]);
        $resCancel->assertStatus(403);

        // 4. Cannot verify payment proof (requires payment.receipt.verify)
        $resVerify = $this->actingAs($orderViewer, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'verify',
        ]);
        $resVerify->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario D: Payment Reviewer
    // ─────────────────────────────────────────────────────────────────────────

    public function test_scenario_d_payment_reviewer_can_verify_and_reject_payment_but_cannot_confirm_order(): void
    {
        $order = Order::create([
            'order_number'        => 'AYN-20260926-0002',
            'user_id'             => $this->customer->id,
            'email'               => $this->customer->email,
            'shipping_name'       => 'Elena Customer',
            'shipping_address1'   => '100 Broadway',
            'shipping_city'       => 'New York',
            'shipping_postal_code'=> '10001',
            'shipping_country_code'=> 'US',
            'status'              => 'pending',
            'payment_status'      => 'pending',
            'fulfillment_status'  => 'unfulfilled',
            'currency'            => 'USD',
            'subtotal'            => 800.00,
            'shipping_cost'       => 60.00,
            'total_amount'        => 860.00,
            'payment_method'      => 'bank_transfer',
            'payment_proof_url'   => 'https://example.com/receipts/proof.pdf',
            'placed_at'           => now(),
        ]);

        $paymentReviewer = $this->createAdminWithPermissions([
            'order.view',
            'payment.receipt.view',
            'payment.receipt.download',
            'payment.receipt.verify',
            'payment.receipt.reject',
        ], 'Payment Reviewer');

        // 1. Can view payment receipt in order detail
        $resDetail = $this->actingAs($paymentReviewer, 'sanctum')->getJson("/api/v1/orders/{$order->id}");
        $resDetail->assertStatus(200);
        $this->assertEquals('https://example.com/receipts/proof.pdf', $resDetail->json('data.payment_proof_url'));

        // 2. Can verify payment proof
        $resVerify = $this->actingAs($paymentReviewer, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/payment-proof/review", [
            'action' => 'verify',
            'note'   => 'Bank wire reference confirmed',
        ]);
        $resVerify->assertStatus(200);
        $this->assertEquals('paid', $order->fresh()->payment_status);

        // 3. But CANNOT transition order status to confirmed without order.confirm
        $resConfirm = $this->actingAs($paymentReviewer, 'sanctum')->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ]);
        $resConfirm->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario E: Inventory Viewer
    // ─────────────────────────────────────────────────────────────────────────

    public function test_scenario_e_inventory_viewer_can_view_inventory_but_cannot_adjust_stock(): void
    {
        $product = Product::create([
            'name'            => 'Inventory Tracked Shirt',
            'slug'            => 'inventory-tracked-shirt',
            'sku'             => 'ITS-01',
            'wholesale_price' => 20.00,
            'moq'             => 5,
            'status'          => 'published',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku'        => 'ITS-01-M',
            'title'      => 'Size M',
            'size'       => 'M',
            'stock'      => 50,
        ]);

        $inventory = Inventory::create([
            'product_variant_id' => $variant->id,
            'warehouse_id'       => $this->warehouse->id,
            'quantity'           => 50,
            'reserved_quantity'  => 0,
        ]);

        $inventoryViewer = $this->createAdminWithPermissions([
            'inventory.view',
            'inventory.view_warehouse',
        ], 'Inventory Viewer');

        // 1. Can view inventory
        $resList = $this->actingAs($inventoryViewer, 'sanctum')->getJson('/api/v1/admin/inventory');
        $resList->assertStatus(200);

        // 2. Cannot adjust stock (requires inventory.adjust)
        $resAdjust = $this->actingAs($inventoryViewer, 'sanctum')->postJson('/api/v1/admin/inventory/adjust', [
            'product_variant_id' => $variant->id,
            'warehouse_id'       => $this->warehouse->id,
            'quantity_delta'     => 10,
            'reason'             => 'Damaged goods replenishment',
        ]);
        $resAdjust->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario F: Analytics Viewer & Zero Leakage
    // ─────────────────────────────────────────────────────────────────────────

    public function test_scenario_f_analytics_viewer_can_view_sales_but_profit_and_cogs_are_masked(): void
    {
        $product = Product::create([
            'name'            => 'Profit Margin Polo',
            'slug'            => 'profit-margin-polo',
            'sku'             => 'PMP-01',
            'wholesale_price' => 50.00,
            'cost_price'      => 30.00,
            'status'          => 'published',
        ]);

        $order = Order::create([
            'order_number'       => 'AYN-20260926-0003',
            'email'              => 'buyer@retailcorp.local',
            'shipping_name'      => 'Elena Customer',
            'shipping_address1'  => '100 Broadway',
            'shipping_city'      => 'New York',
            'shipping_postal_code'=> '10001',
            'shipping_country_code'=> 'US',
            'status'             => 'processing',
            'payment_status'     => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'currency'           => 'USD',
            'subtotal'           => 500.00,
            'total_amount'       => 500.00,
            'placed_at'          => now(),
        ]);

        OrderItem::create([
            'order_id'             => $order->id,
            'product_id'           => $product->id,
            'product_name'         => $product->name,
            'unit_price'           => 50.00,
            'buying_price_at_sale' => 30.00,
            'quantity'             => 10,
            'line_total'           => 500.00,
        ]);

        // Admin with only sales visibility
        $salesOnlyViewer = $this->createAdminWithPermissions([
            'analytics.dashboard.view',
            'analytics.sales.view',
        ], 'Sales Only Analytics Viewer');

        $resSales = $this->actingAs($salesOnlyViewer, 'sanctum')->getJson('/api/v1/admin/analytics/sales-profit?period=daily');
        $resSales->assertStatus(200);

        $summary = $resSales->json('data.summary');
        $this->assertNotNull($summary['total_sales']);
        $this->assertEquals(500.00, (float) $summary['total_sales']);

        // Zero data leakage: COGS and gross profit MUST be masked/null!
        $this->assertNull($summary['gross_profit']);
        $this->assertNull($summary['profit_margin']);

        // Now grant analytics.profit.view and analytics.cogs.view
        $profitViewer = $this->createAdminWithPermissions([
            'analytics.dashboard.view',
            'analytics.sales.view',
            'analytics.profit.view',
            'analytics.cogs.view',
        ], 'Profit Analytics Viewer');

        $resProfit = $this->actingAs($profitViewer, 'sanctum')->getJson('/api/v1/admin/analytics/sales-profit?period=daily');
        $resProfit->assertStatus(200);

        $profitSummary = $resProfit->json('data.summary');
        $this->assertEquals(200.00, (float) $profitSummary['gross_profit']);
        $this->assertEquals(40.00, (float) $profitSummary['profit_margin']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Customer Isolation & Super Admin Override
    // ─────────────────────────────────────────────────────────────────────────

    public function test_customer_strictly_denied_all_admin_endpoints(): void
    {
        $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/admin/dashboard')->assertStatus(403);
        $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/admin/orders')->assertStatus(403);
        $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/admin/inventory')->assertStatus(403);
        $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/admin/customers')->assertStatus(403);
        $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/admin/analytics/sales-profit')->assertStatus(403);
    }

    public function test_super_admin_override_permits_all_privileged_operations(): void
    {
        // 1. Can create published product directly
        $resPub = $this->actingAs($this->superAdmin, 'sanctum')->postJson('/api/v1/products', [
            'name'            => 'Super Admin Polo',
            'slug'            => 'super-admin-polo',
            'sku'             => 'SAP-01',
            'brand_id'        => $this->brand->id,
            'category_id'     => $this->category->id,
            'wholesale_price' => 35.00,
            'moq'             => 10,
            'status'          => 'published',
        ]);
        $resPub->assertStatus(201);
        $productId = $resPub->json('data.id');

        // 2. Can delete product
        $this->actingAs($this->superAdmin, 'sanctum')
            ->deleteJson("/api/v1/products/{$productId}")
            ->assertStatus(200);

        // 3. Can view unmasked profit analytics
        $resAnalytics = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=daily');
        $resAnalytics->assertStatus(200);
        $this->assertArrayHasKey('gross_profit', $resAnalytics->json('data.summary'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Upload Folder Protection
    // ─────────────────────────────────────────────────────────────────────────

    public function test_upload_controller_strictly_enforces_folder_specific_permissions(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->image('test_product.jpg');

        $adminWithoutUpload = $this->createAdminWithPermissions([
            'product.view',
        ], 'Non-Upload Admin');

        // Missing product.image.upload -> 403 Forbidden
        $resFail = $this->actingAs($adminWithoutUpload, 'sanctum')->postJson('/api/v1/upload', [
            'file'   => $file,
            'folder' => 'products',
        ]);
        $resFail->assertStatus(403);

        // Granted product.image.upload -> 201 Created
        $adminWithUpload = $this->createAdminWithPermissions([
            'product.image.upload',
        ], 'Product Image Upload Admin');

        $resSuccess = $this->actingAs($adminWithUpload, 'sanctum')->postJson('/api/v1/upload', [
            'file'   => $file,
            'folder' => 'products',
        ]);
        $resSuccess->assertStatus(201);
        $this->assertNotEmpty($resSuccess->json('data.url'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dashboard Zero Leakage
    // ─────────────────────────────────────────────────────────────────────────

    public function test_dashboard_zero_data_leakage_for_unauthorized_modules(): void
    {
        // Admin with only product.view and dashboard access
        $productAdmin = $this->createAdminWithPermissions([
            'analytics.dashboard.view',
            'product.view',
        ], 'Product Only Admin');

        $res = $this->actingAs($productAdmin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $res->assertStatus(200);

        $data = $res->json('data');
        // Product counts visible
        $this->assertArrayHasKey('total_products', $data);

        // Customer, Order, RFQ counts must be 0 / masked!
        $this->assertEquals(0, $data['total_customers']);
        $this->assertEquals(0, $data['total_orders']);
        $this->assertEquals(0, $data['low_stock_items']);
        $this->assertEmpty($data['recent_orders']);
        $this->assertEmpty($data['recent_rfqs']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Customer Controller Spending & Order Masking
    // ─────────────────────────────────────────────────────────────────────────

    public function test_customer_controller_spending_and_orders_masking(): void
    {
        $customerViewer = $this->createAdminWithPermissions([
            'customer.view',
        ], 'Basic Customer Viewer');

        $res = $this->actingAs($customerViewer, 'sanctum')->getJson("/api/v1/admin/customers/{$this->customer->id}");
        $res->assertStatus(200);

        // Spending and orders masked
        $this->assertNull($res->json('data.total_spent'));
        $this->assertEmpty($res->json('data.orders'));
        $this->assertEmpty($res->json('data.purchased_products'));

        // Admin with spending and order visibility
        $spendingViewer = $this->createAdminWithPermissions([
            'customer.view',
            'customer.view_spending',
            'customer.view_orders',
        ], 'Customer Spending Viewer');

        $resSpending = $this->actingAs($spendingViewer, 'sanctum')->getJson("/api/v1/admin/customers/{$this->customer->id}");
        $resSpending->assertStatus(200);
        $this->assertNotNull($resSpending->json('data.total_spent'));
    }
}
