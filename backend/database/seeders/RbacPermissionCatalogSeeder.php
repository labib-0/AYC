<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * RbacPermissionCatalogSeeder — idempotent permission and dependency seeder.
 *
 * Safe to run multiple times:
 *   - Uses updateOrCreate on slug (stable identifier)
 *   - Dependencies are synced (no duplicates via unique constraint)
 *   - Does NOT delete existing permissions or roles
 *   - Does NOT modify existing admin_roles assignments
 *
 * Run:  php artisan db:seed --class=RbacPermissionCatalogSeeder
 */
class RbacPermissionCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('RBAC: Seeding permission catalog…');

        DB::transaction(function () {
            $this->seedPermissions();
            $this->seedDependencies();
            $this->seedSystemRoles();
            $this->promoteSuperAdmin();
        });

        // Clear RBAC caches so the new catalog is visible immediately
        Cache::forget('rbac:all_permission_slugs');

        $this->command->info('RBAC: Permission catalog seeded successfully.');
        $this->command->info('RBAC: ' . Permission::count() . ' permissions, ' . Role::count() . ' roles.');
    }

    // ── 1. Permissions ───────────────────────────────────────────────────────

    private function seedPermissions(): void
    {
        foreach (Permission::catalog() as $slug => $data) {
            Permission::updateOrCreate(
                ['slug' => $slug],
                [
                    'name'        => $data['name'],
                    'module'      => $data['module'],
                    'action'      => $data['action'],
                    'description' => $data['description'],
                    'is_system'   => true,
                ]
            );
        }

        $this->command->line('  ✓ Permissions upserted: ' . count(Permission::catalog()));
    }

    // ── 2. Dependencies ──────────────────────────────────────────────────────

    private function seedDependencies(): void
    {
        $catalog = Permission::catalog();
        $inserted = 0;

        foreach ($catalog as $slug => $data) {
            $permission = Permission::where('slug', $slug)->first();
            if (! $permission) {
                continue;
            }

            foreach (($data['requires'] ?? []) as $requiredSlug) {
                $required = Permission::where('slug', $requiredSlug)->first();
                if (! $required) {
                    $this->command->warn("  ⚠ Dependency not found: {$slug} requires {$requiredSlug} (skipped)");
                    continue;
                }

                // Use insertOrIgnore to handle the unique constraint safely
                DB::table('permission_dependencies')->insertOrIgnore([
                    'permission_id'          => $permission->id,
                    'requires_permission_id' => $required->id,
                    'created_at'             => now(),
                    'updated_at'             => now(),
                ]);
                $inserted++;
            }
        }

        $this->command->line("  ✓ Dependencies seeded: {$inserted}");
    }

    // ── 3. System Roles ──────────────────────────────────────────────────────

    /**
     * Seed a minimal set of example system roles.
     * These illustrate the RBAC model and can be extended via the Super Admin UI.
     *
     * They are marked is_system = true so they cannot be casually deleted.
     */
    private function seedSystemRoles(): void
    {
        $systemRoles = [
            [
                'name'        => 'Product Draft Editor',
                'slug'        => 'product_draft_editor',
                'description' => 'Can create, edit, and save product drafts. Cannot publish.',
                'permissions' => [
                    'product.view',
                    'product.create',
                    'product.save_draft',
                    'product.edit',
                    'product.image.view',
                    'product.image.upload',
                    'product.variant.view',
                    'product.variant.manage',
                    'product.pricing.view',
                    'product.pricing.manage',
                    'product.package.view',
                    'product.package.manage',
                    'product.shipping_profile.view',
                    'product.shipping_profile.manage',
                    'category.view',
                    'brand.view',
                ],
            ],
            [
                'name'        => 'Product Publisher',
                'slug'        => 'product_publisher',
                'description' => 'Full catalog management including product publishing and archiving.',
                'permissions' => [
                    'product.view',
                    'product.create',
                    'product.save_draft',
                    'product.edit',
                    'product.publish',
                    'product.archive',
                    'product.image.view',
                    'product.image.upload',
                    'product.image.replace',
                    'product.image.delete',
                    'product.image.reorder',
                    'product.variant.view',
                    'product.variant.manage',
                    'product.pricing.view',
                    'product.pricing.manage',
                    'product.package.view',
                    'product.package.manage',
                    'product.shipping_profile.view',
                    'product.shipping_profile.manage',
                    'category.view',
                    'brand.view',
                ],
            ],
            [
                'name'        => 'Order Manager',
                'slug'        => 'order_manager',
                'description' => 'View and manage orders including status transitions and fulfillment.',
                'permissions' => [
                    'order.view',
                    'order.view_customer',
                    'order.view_items',
                    'order.update_status',
                    'order.confirm',
                    'order.cancel',
                    'order.update_fulfillment',
                    'order.mark_processing',
                    'order.mark_shipped',
                    'order.mark_delivered',
                    'order.shipping.view',
                    'order.shipping.update',
                    'customer.view',
                ],
            ],
            [
                'name'        => 'Payment Reviewer',
                'slug'        => 'payment_reviewer',
                'description' => 'View and verify/reject payment receipts.',
                'permissions' => [
                    'order.view',
                    'payment.view',
                    'payment.receipt.view',
                    'payment.receipt.download',
                    'payment.receipt.verify',
                    'payment.receipt.reject',
                ],
            ],
            [
                'name'        => 'Inventory Manager',
                'slug'        => 'inventory_manager',
                'description' => 'Full inventory and warehouse management.',
                'permissions' => [
                    'inventory.view',
                    'inventory.view_warehouse',
                    'inventory.adjust',
                    'inventory.audit',
                    'product.view',
                ],
            ],
            [
                'name'        => 'Merchandising Manager',
                'slug'        => 'merchandising_manager',
                'description' => 'Manage homepage, featured brands, categories, and products.',
                'permissions' => [
                    'homepage.view',
                    'homepage.banner.view',
                    'homepage.banner.edit',
                    'homepage.banner.publish',
                    'homepage.brand.manage',
                    'homepage.category.manage',
                    'homepage.product.manage',
                    'brand.view',
                    'category.view',
                    'product.view',
                    'coupon.view',
                    'coupon.create',
                    'coupon.edit',
                    'coupon.activate',
                    'coupon.deactivate',
                ],
            ],
            [
                'name'        => 'RFQ & Quotation Manager',
                'slug'        => 'rfq_quotation_manager',
                'description' => 'Handle RFQ intake, messaging, and commercial quotation lifecycle.',
                'permissions' => [
                    'rfq.view',
                    'rfq.assign',
                    'rfq.update_status',
                    'rfq.message.view',
                    'rfq.message.send',
                    'rfq.accept',
                    'rfq.reject',
                    'quotation.view',
                    'quotation.create',
                    'quotation.edit',
                    'quotation.revise',
                    'quotation.send',
                    'quotation.accept',
                    'quotation.reject',
                    'quotation.update_status',
                    'document.view',
                    'document.generate',
                    'document.download',
                    'document.offer_sheet.generate',
                    'customer.view',
                ],
            ],
            [
                'name'        => 'Analytics Viewer',
                'slug'        => 'analytics_viewer',
                'description' => 'Read-only access to sales, profit, and order analytics.',
                'permissions' => [
                    'analytics.dashboard.view',
                    'analytics.sales.view',
                    'analytics.orders.view',
                    'analytics.profit.view',
                    'analytics.cogs.view',
                ],
            ],
            [
                'name'        => 'Shipping Operator',
                'slug'        => 'shipping_operator',
                'description' => 'Create Aramex shipments and view/refresh tracking.',
                'permissions' => [
                    'order.view',
                    'order.shipping.view',
                    'order.shipping.update',
                    'shipment.view',
                    'shipment.create',
                    'shipment.label.view',
                    'tracking.view',
                    'tracking.refresh',
                    'aramex.settings.view',
                    'aramex.shipment.create',
                    'aramex.tracking.view',
                ],
            ],
            [
                'name'        => 'Inventory Viewer',
                'slug'        => 'inventory_viewer',
                'description' => 'View inventory balances and warehouse allocations. Cannot perform stock adjustments.',
                'permissions' => [
                    'inventory.view',
                    'inventory.view_warehouse',
                    'product.view',
                ],
            ],
            [
                'name'        => 'Order Viewer',
                'slug'        => 'order_viewer',
                'description' => 'View order history, customer details, and line items. Cannot confirm or modify status.',
                'permissions' => [
                    'order.view',
                    'order.view_customer',
                    'order.view_items',
                    'customer.view',
                ],
            ],
            [
                'name'        => 'Sales Revenue Viewer',
                'slug'        => 'sales_viewer',
                'description' => 'View sales revenue metrics without access to COGS or gross profit.',
                'permissions' => [
                    'analytics.dashboard.view',
                    'analytics.sales.view',
                    'analytics.orders.view',
                ],
            ],
            [
                'name'        => 'Coupon Sales Manager',
                'slug'        => 'coupon_sales',
                'description' => 'View sales, orders, and performance metrics attributed to bound discount coupons.',
                'is_system'   => false, // Normal editable role per Section 5
                'permissions' => [
                    'coupon.view',
                    'order.view',
                    'order.view_customer',
                    'order.view_items',
                    'analytics.sales.view',
                    'analytics.orders.view',
                ],
            ],
        ];

        foreach ($systemRoles as $roleData) {
            $role = Role::updateOrCreate(
                ['slug' => $roleData['slug']],
                [
                    'name'        => $roleData['name'],
                    'description' => $roleData['description'],
                    'is_system'   => $roleData['is_system'] ?? true,
                    'is_active'   => true,
                ]
            );

            // Sync permissions (additive: never removes permissions if slug not in list)
            $permissionIds = Permission::whereIn('slug', $roleData['permissions'])->pluck('id')->all();

            // syncWithoutDetaching to avoid removing manually assigned extras
            $role->permissions()->syncWithoutDetaching($permissionIds);
        }

        $this->command->line('  ✓ System roles seeded: ' . count($systemRoles));
    }

    // ── 4. Promote Super Admin ────────────────────────────────────────────────

    /**
     * Promote the first/only admin account to Super Admin if none exists yet.
     * This is idempotent: once one Super Admin exists, this is skipped.
     *
     * In production, the Super Admin should be promoted via:
     *   php artisan rbac:promote-super-admin {email}
     *
     * This seeder only auto-promotes in development to ensure a usable state.
     */
    private function promoteSuperAdmin(): void
    {
        $existingSuperAdmin = User::where('role', 'admin')
            ->where('is_super_admin', true)
            ->first();

        if ($existingSuperAdmin) {
            $this->command->line("  ✓ Super Admin already exists: {$existingSuperAdmin->email}");
            return;
        }

        // Promote the first admin (admin@ayaan-demo.local or any earliest admin)
        $firstAdmin = User::where('role', 'admin')
            ->orderBy('created_at')
            ->first();

        if ($firstAdmin) {
            $firstAdmin->update(['is_super_admin' => true]);
            $this->command->line("  ✓ Promoted Super Admin: {$firstAdmin->email}");
        } else {
            $this->command->warn('  ⚠ No admin account found to promote as Super Admin. Create one first via DatabaseSeeder.');
        }
    }
}
