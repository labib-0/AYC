<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Permission — atomic authorization unit.
 *
 * Slug is the stable contract key (e.g. "product.publish").
 * Never rename a slug that is already referenced in middleware or gates.
 */
class Permission extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'module',
        'action',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions')
            ->withTimestamps();
    }

    /**
     * Permissions that THIS permission requires (direct dependencies).
     * e.g. product.publish requires [product.view, product.save_draft]
     */
    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'permission_dependencies',
            'permission_id',
            'requires_permission_id'
        )->withTimestamps();
    }

    /**
     * Permissions that declare THIS permission as a dependency (inverse).
     * e.g. product.view is required by [product.publish, product.edit, product.delete]
     */
    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'permission_dependencies',
            'requires_permission_id',
            'permission_id'
        )->withTimestamps();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Add a prerequisite dependency to this permission safely, checking for cycles.
     */
    public function addDependency(Permission|int $requires): bool
    {
        $requiresId = $requires instanceof Permission ? $requires->id : $requires;
        return app(\App\Services\Rbac\AdminAuthorizationService::class)->addDependency($this->id, $requiresId);
    }

    /**
     * Remove a prerequisite dependency from this permission safely.
     */
    public function removeDependency(Permission|int $requires): bool
    {
        $requiresId = $requires instanceof Permission ? $requires->id : $requires;
        return app(\App\Services\Rbac\AdminAuthorizationService::class)->removeDependency($this->id, $requiresId);
    }

    public static function findBySlug(string $slug): ?static
    {
        return static::where('slug', $slug)->first();
    }

    public static function slugsForModule(string $module): array
    {
        return static::where('module', $module)->pluck('slug')->all();
    }

    /**
     * Full permission catalog used by the seeder.
     * Format: [slug => [name, module, action, description, requires => [...slugs]]]
     */
    public static function catalog(): array
    {
        return [
            // ── Catalog: Products ─────────────────────────────────────────
            'product.view'          => ['name' => 'View Products',           'module' => 'Catalog', 'action' => 'view',             'description' => 'View product list and details in admin', 'requires' => []],
            'product.create'        => ['name' => 'Create Product',          'module' => 'Catalog', 'action' => 'create',           'description' => 'Create new product records',            'requires' => ['product.view']],
            'product.save_draft'    => ['name' => 'Save Product Draft',      'module' => 'Catalog', 'action' => 'save_draft',       'description' => 'Save product in draft state',           'requires' => ['product.view', 'product.create']],
            'product.edit'          => ['name' => 'Edit Product',            'module' => 'Catalog', 'action' => 'edit',             'description' => 'Edit existing product details',         'requires' => ['product.view']],
            'product.publish'       => ['name' => 'Publish Product',         'module' => 'Catalog', 'action' => 'publish',          'description' => 'Publish a product to the storefront',   'requires' => ['product.view', 'product.save_draft']],
            'product.archive'       => ['name' => 'Archive Product',         'module' => 'Catalog', 'action' => 'archive',          'description' => 'Archive (hide) a published product',    'requires' => ['product.view']],
            'product.delete'        => ['name' => 'Delete Product',          'module' => 'Catalog', 'action' => 'delete',           'description' => 'Permanently delete a product',          'requires' => ['product.view']],

            // ── Catalog: Product Images ────────────────────────────────────
            'product.image.view'    => ['name' => 'View Product Images',     'module' => 'Catalog', 'action' => 'image.view',       'description' => 'View product image gallery',            'requires' => ['product.view']],
            'product.image.upload'  => ['name' => 'Upload Product Image',    'module' => 'Catalog', 'action' => 'image.upload',     'description' => 'Upload new product images',             'requires' => ['product.view', 'product.image.view']],
            'product.image.replace' => ['name' => 'Replace Product Image',   'module' => 'Catalog', 'action' => 'image.replace',    'description' => 'Replace existing product image',        'requires' => ['product.view', 'product.image.view']],
            'product.image.delete'  => ['name' => 'Delete Product Image',    'module' => 'Catalog', 'action' => 'image.delete',     'description' => 'Remove a product image',                'requires' => ['product.view', 'product.image.view']],
            'product.image.reorder' => ['name' => 'Reorder Product Images',  'module' => 'Catalog', 'action' => 'image.reorder',    'description' => 'Reorder product image gallery',         'requires' => ['product.view', 'product.image.view']],

            // ── Catalog: Product Variants ──────────────────────────────────
            'product.variant.view'   => ['name' => 'View Product Variants',  'module' => 'Catalog', 'action' => 'variant.view',     'description' => 'View product size/color variants',      'requires' => ['product.view']],
            'product.variant.manage' => ['name' => 'Manage Product Variants','module' => 'Catalog', 'action' => 'variant.manage',   'description' => 'Add, edit, delete product variants',    'requires' => ['product.view', 'product.variant.view']],

            // ── Catalog: Product Pricing ───────────────────────────────────
            'product.pricing.view'   => ['name' => 'View Product Pricing',   'module' => 'Catalog', 'action' => 'pricing.view',     'description' => 'View wholesale/tier/buying prices',     'requires' => ['product.view']],
            'product.pricing.manage' => ['name' => 'Manage Product Pricing', 'module' => 'Catalog', 'action' => 'pricing.manage',   'description' => 'Edit wholesale, tier and buying prices','requires' => ['product.view', 'product.pricing.view']],

            // ── Catalog: Product Packages ──────────────────────────────────
            'product.package.view'   => ['name' => 'View Product Packages',  'module' => 'Catalog', 'action' => 'package.view',     'description' => 'View package/assortment configuration', 'requires' => ['product.view']],
            'product.package.manage' => ['name' => 'Manage Product Packages','module' => 'Catalog', 'action' => 'package.manage',   'description' => 'Edit package assortment allocations',   'requires' => ['product.view', 'product.package.view']],

            // ── Catalog: Shipping Profile ──────────────────────────────────
            'product.shipping_profile.view'   => ['name' => 'View Shipping Profiles',   'module' => 'Catalog', 'action' => 'shipping_profile.view',   'description' => 'View product shipping package profiles', 'requires' => ['product.view']],
            'product.shipping_profile.manage' => ['name' => 'Manage Shipping Profiles', 'module' => 'Catalog', 'action' => 'shipping_profile.manage', 'description' => 'Edit product shipping package profiles', 'requires' => ['product.view', 'product.shipping_profile.view']],

            // ── Catalog: Categories ────────────────────────────────────────
            'category.view'            => ['name' => 'View Categories',      'module' => 'Catalog', 'action' => 'view',             'description' => 'View category list and details',        'requires' => []],
            'category.create'          => ['name' => 'Create Category',      'module' => 'Catalog', 'action' => 'create',           'description' => 'Create new categories',                 'requires' => ['category.view']],
            'category.edit'            => ['name' => 'Edit Category',        'module' => 'Catalog', 'action' => 'edit',             'description' => 'Edit category name, image, metadata',  'requires' => ['category.view']],
            'category.delete'          => ['name' => 'Delete Category',      'module' => 'Catalog', 'action' => 'delete',           'description' => 'Delete categories',                     'requires' => ['category.view']],
            'category.activate'        => ['name' => 'Activate Category',    'module' => 'Catalog', 'action' => 'activate',         'description' => 'Activate a category on storefront',     'requires' => ['category.view']],
            'category.deactivate'      => ['name' => 'Deactivate Category',  'module' => 'Catalog', 'action' => 'deactivate',       'description' => 'Deactivate a category from storefront', 'requires' => ['category.view']],
            'category.feature'         => ['name' => 'Feature Category',     'module' => 'Catalog', 'action' => 'feature',          'description' => 'Mark a category as featured/hot sale',  'requires' => ['category.view']],
            'category.reorder'         => ['name' => 'Reorder Categories',   'module' => 'Catalog', 'action' => 'reorder',          'description' => 'Change display order of categories',    'requires' => ['category.view']],

            // ── Catalog: Brands ────────────────────────────────────────────
            'brand.view'               => ['name' => 'View Brands',          'module' => 'Catalog', 'action' => 'view',             'description' => 'View brand list and details',           'requires' => []],
            'brand.create'             => ['name' => 'Create Brand',         'module' => 'Catalog', 'action' => 'create',           'description' => 'Create new brands',                     'requires' => ['brand.view']],
            'brand.edit'               => ['name' => 'Edit Brand',           'module' => 'Catalog', 'action' => 'edit',             'description' => 'Edit brand name, logo, metadata',      'requires' => ['brand.view']],
            'brand.delete'             => ['name' => 'Delete Brand',         'module' => 'Catalog', 'action' => 'delete',           'description' => 'Delete brands',                         'requires' => ['brand.view']],
            'brand.activate'           => ['name' => 'Activate Brand',       'module' => 'Catalog', 'action' => 'activate',         'description' => 'Activate brand on storefront',          'requires' => ['brand.view']],
            'brand.deactivate'         => ['name' => 'Deactivate Brand',     'module' => 'Catalog', 'action' => 'deactivate',       'description' => 'Deactivate brand from storefront',      'requires' => ['brand.view']],
            'brand.feature'            => ['name' => 'Feature Brand',        'module' => 'Catalog', 'action' => 'feature',          'description' => 'Mark a brand as featured on homepage',  'requires' => ['brand.view']],
            'brand.reorder'            => ['name' => 'Reorder Brands',       'module' => 'Catalog', 'action' => 'reorder',          'description' => 'Change display order of brands',        'requires' => ['brand.view']],

            // ── Homepage / Merchandising ───────────────────────────────────
            'homepage.view'              => ['name' => 'View Homepage Config',    'module' => 'Merchandising', 'action' => 'view',           'description' => 'View homepage configuration',                   'requires' => []],
            'homepage.banner.view'       => ['name' => 'View Banner',            'module' => 'Merchandising', 'action' => 'banner.view',    'description' => 'View homepage promotional banner',              'requires' => ['homepage.view']],
            'homepage.banner.edit'       => ['name' => 'Edit Banner',            'module' => 'Merchandising', 'action' => 'banner.edit',    'description' => 'Edit homepage banner content and styling',      'requires' => ['homepage.view', 'homepage.banner.view']],
            'homepage.banner.publish'    => ['name' => 'Publish Banner',         'module' => 'Merchandising', 'action' => 'banner.publish', 'description' => 'Publish/activate homepage banner changes',      'requires' => ['homepage.view', 'homepage.banner.view', 'homepage.banner.edit']],
            'homepage.brand.manage'      => ['name' => 'Manage Featured Brands', 'module' => 'Merchandising', 'action' => 'brand.manage',   'description' => 'Set and reorder featured brands on homepage',   'requires' => ['homepage.view', 'brand.view']],
            'homepage.category.manage'   => ['name' => 'Manage Hot Sale Categories','module' => 'Merchandising','action' => 'category.manage','description' => 'Set and reorder hot sale categories',        'requires' => ['homepage.view', 'category.view']],
            'homepage.product.manage'    => ['name' => 'Manage Featured Products','module' => 'Merchandising', 'action' => 'product.manage', 'description' => 'Set and reorder featured products on homepage','requires' => ['homepage.view', 'product.view']],

            // ── Orders ─────────────────────────────────────────────────────
            'order.view'              => ['name' => 'View Orders',           'module' => 'Orders', 'action' => 'view',               'description' => 'View order list and order details',     'requires' => []],
            'order.view_customer'     => ['name' => 'View Order Customer',   'module' => 'Orders', 'action' => 'view_customer',      'description' => 'View customer PII on orders',           'requires' => ['order.view']],
            'order.view_items'        => ['name' => 'View Order Items',      'module' => 'Orders', 'action' => 'view_items',         'description' => 'View individual line items of orders',  'requires' => ['order.view']],
            'order.update_status'     => ['name' => 'Update Order Status',   'module' => 'Orders', 'action' => 'update_status',      'description' => 'Change general order status',           'requires' => ['order.view']],
            'order.confirm'           => ['name' => 'Confirm Order',         'module' => 'Orders', 'action' => 'confirm',            'description' => 'Confirm a pending order',               'requires' => ['order.view', 'order.update_status']],
            'order.cancel'            => ['name' => 'Cancel Order',          'module' => 'Orders', 'action' => 'cancel',             'description' => 'Cancel an order',                       'requires' => ['order.view', 'order.update_status']],
            'order.update_fulfillment'=> ['name' => 'Update Fulfillment',    'module' => 'Orders', 'action' => 'update_fulfillment', 'description' => 'Update fulfillment/shipping status',    'requires' => ['order.view']],
            'order.mark_processing'   => ['name' => 'Mark Order Processing', 'module' => 'Orders', 'action' => 'mark_processing',    'description' => 'Set order to processing state',         'requires' => ['order.view', 'order.update_status']],
            'order.mark_shipped'      => ['name' => 'Mark Order Shipped',    'module' => 'Orders', 'action' => 'mark_shipped',       'description' => 'Mark order as shipped',                 'requires' => ['order.view', 'order.update_fulfillment']],
            'order.mark_delivered'    => ['name' => 'Mark Order Delivered',  'module' => 'Orders', 'action' => 'mark_delivered',     'description' => 'Mark order as delivered',               'requires' => ['order.view', 'order.update_fulfillment']],

            // ── Point of Sale (POS) ─────────────────────────────────────────
            'pos.view'                => ['name' => 'View POS',               'module' => 'POS', 'action' => 'view',                 'description' => 'Access Point of Sale interface and view POS data', 'requires' => []],
            'pos.create'              => ['name' => 'Create POS Sale',        'module' => 'POS', 'action' => 'create',               'description' => 'Create and confirm Point of Sale orders',           'requires' => ['pos.view']],

            // ── Payment ────────────────────────────────────────────────────
            'payment.view'                => ['name' => 'View Payments',           'module' => 'Payment', 'action' => 'view',               'description' => 'View payment records',                  'requires' => []],
            'payment.receipt.view'        => ['name' => 'View Payment Receipt',    'module' => 'Payment', 'action' => 'receipt.view',       'description' => 'View uploaded payment proof/receipt',   'requires' => ['payment.view']],
            'payment.receipt.download'    => ['name' => 'Download Payment Receipt','module' => 'Payment', 'action' => 'receipt.download',   'description' => 'Download payment receipt file',         'requires' => ['payment.view', 'payment.receipt.view']],
            'payment.receipt.verify'      => ['name' => 'Verify Payment Receipt',  'module' => 'Payment', 'action' => 'receipt.verify',     'description' => 'Mark payment receipt as verified',      'requires' => ['payment.view', 'payment.receipt.view']],
            'payment.receipt.reject'      => ['name' => 'Reject Payment Receipt',  'module' => 'Payment', 'action' => 'receipt.reject',     'description' => 'Reject a payment receipt',              'requires' => ['payment.view', 'payment.receipt.view']],
            'payment.mark_confirmed'      => ['name' => 'Mark Payment Confirmed',  'module' => 'Payment', 'action' => 'mark_confirmed',     'description' => 'Manually confirm a payment',            'requires' => ['payment.view']],

            // ── Inventory & Warehouses ─────────────────────────────────────
            'inventory.view'          => ['name' => 'View Inventory',        'module' => 'Inventory', 'action' => 'view',            'description' => 'View inventory levels and summary',     'requires' => []],
            'inventory.view_warehouse'=> ['name' => 'View Warehouse Details','module' => 'Inventory', 'action' => 'view_warehouse',  'description' => 'View warehouse-level inventory details','requires' => ['inventory.view']],
            'inventory.adjust'        => ['name' => 'Adjust Inventory',      'module' => 'Inventory', 'action' => 'adjust',          'description' => 'Add or remove stock with audit trail', 'requires' => ['inventory.view']],
            'inventory.audit'         => ['name' => 'Audit Inventory',       'module' => 'Inventory', 'action' => 'audit',           'description' => 'View inventory adjustment history',    'requires' => ['inventory.view']],
            'inventory.transfer'      => ['name' => 'Transfer Inventory',    'module' => 'Inventory', 'action' => 'transfer',        'description' => 'Transfer stock between warehouses',    'requires' => ['inventory.view', 'inventory.view_warehouse']],

            // ── Shipping & Fulfillment ─────────────────────────────────────
            'order.shipping.view'     => ['name' => 'View Order Shipping',   'module' => 'Shipping', 'action' => 'view',            'description' => 'View shipping details for orders',      'requires' => ['order.view']],
            'order.shipping.update'   => ['name' => 'Update Order Shipping', 'module' => 'Shipping', 'action' => 'update',          'description' => 'Update shipping quote on orders',       'requires' => ['order.view', 'order.shipping.view']],
            'shipment.view'           => ['name' => 'View Shipments',        'module' => 'Shipping', 'action' => 'view',            'description' => 'View shipment records',                 'requires' => []],
            'shipment.create'         => ['name' => 'Create Shipment',       'module' => 'Shipping', 'action' => 'create',          'description' => 'Create a new shipment',                 'requires' => ['order.view', 'order.shipping.view', 'shipment.view']],
            'shipment.label.view'     => ['name' => 'View Shipping Label',   'module' => 'Shipping', 'action' => 'label.view',      'description' => 'View/download shipping labels',         'requires' => ['shipment.view']],
            'tracking.view'           => ['name' => 'View Tracking',         'module' => 'Shipping', 'action' => 'view',            'description' => 'View shipment tracking status',         'requires' => ['shipment.view']],
            'tracking.refresh'        => ['name' => 'Refresh Tracking',      'module' => 'Shipping', 'action' => 'refresh',         'description' => 'Trigger a live tracking refresh',       'requires' => ['shipment.view', 'tracking.view']],

            // ── Aramex Integration ─────────────────────────────────────────
            'aramex.settings.view'    => ['name' => 'View Aramex Settings',  'module' => 'Integrations', 'action' => 'settings.view',   'description' => 'View Aramex API credentials and config', 'requires' => []],
            'aramex.settings.edit'    => ['name' => 'Edit Aramex Settings',  'module' => 'Integrations', 'action' => 'settings.edit',   'description' => 'Edit Aramex API credentials and config', 'requires' => ['aramex.settings.view']],
            'aramex.connection.test'  => ['name' => 'Test Aramex Connection', 'module' => 'Integrations', 'action' => 'connection.test', 'description' => 'Send test ping to Aramex API',          'requires' => ['aramex.settings.view']],
            'aramex.shipment.create'  => ['name' => 'Create Aramex Shipment','module' => 'Integrations', 'action' => 'shipment.create', 'description' => 'Create shipment via Aramex API',         'requires' => ['shipment.create', 'aramex.settings.view']],
            'aramex.tracking.view'    => ['name' => 'View Aramex Tracking',  'module' => 'Integrations', 'action' => 'tracking.view',   'description' => 'Retrieve tracking from Aramex API',      'requires' => ['tracking.view', 'aramex.settings.view']],

            // ── RFQ ────────────────────────────────────────────────────────
            'rfq.view'                => ['name' => 'View RFQs',             'module' => 'RFQ', 'action' => 'view',               'description' => 'View RFQ list and details',             'requires' => []],
            'rfq.assign'              => ['name' => 'Assign RFQ',            'module' => 'RFQ', 'action' => 'assign',             'description' => 'Assign RFQ to admin staff',              'requires' => ['rfq.view']],
            'rfq.update_status'       => ['name' => 'Update RFQ Status',     'module' => 'RFQ', 'action' => 'update_status',      'description' => 'Change RFQ workflow state',              'requires' => ['rfq.view']],
            'rfq.message.view'        => ['name' => 'View RFQ Messages',     'module' => 'RFQ', 'action' => 'message.view',       'description' => 'Read internal RFQ messages',            'requires' => ['rfq.view']],
            'rfq.message.send'        => ['name' => 'Send RFQ Message',      'module' => 'RFQ', 'action' => 'message.send',       'description' => 'Send message in RFQ thread',            'requires' => ['rfq.view', 'rfq.message.view']],
            'rfq.accept'              => ['name' => 'Accept RFQ',            'module' => 'RFQ', 'action' => 'accept',             'description' => 'Accept an RFQ and proceed to quotation','requires' => ['rfq.view', 'rfq.update_status']],
            'rfq.reject'              => ['name' => 'Reject RFQ',            'module' => 'RFQ', 'action' => 'reject',             'description' => 'Reject an RFQ',                         'requires' => ['rfq.view', 'rfq.update_status']],

            // ── Quotations ─────────────────────────────────────────────────
            'quotation.view'          => ['name' => 'View Quotations',       'module' => 'Quotations', 'action' => 'view',          'description' => 'View commercial quotation list and details',   'requires' => []],
            'quotation.create'        => ['name' => 'Create Quotation',      'module' => 'Quotations', 'action' => 'create',        'description' => 'Create formal commercial quotation',           'requires' => ['quotation.view', 'rfq.view']],
            'quotation.edit'          => ['name' => 'Edit Quotation',        'module' => 'Quotations', 'action' => 'edit',          'description' => 'Edit quotation line items and pricing',        'requires' => ['quotation.view']],
            'quotation.revise'        => ['name' => 'Revise Quotation',      'module' => 'Quotations', 'action' => 'revise',        'description' => 'Issue revised version of a quotation',         'requires' => ['quotation.view', 'quotation.edit']],
            'quotation.send'          => ['name' => 'Send Quotation',        'module' => 'Quotations', 'action' => 'send',          'description' => 'Send quotation to customer',                   'requires' => ['quotation.view', 'quotation.create']],
            'quotation.accept'        => ['name' => 'Accept Quotation',      'module' => 'Quotations', 'action' => 'accept',        'description' => 'Mark quotation as accepted',                   'requires' => ['quotation.view', 'quotation.update_status']],
            'quotation.reject'        => ['name' => 'Reject Quotation',      'module' => 'Quotations', 'action' => 'reject',        'description' => 'Mark quotation as rejected',                   'requires' => ['quotation.view', 'quotation.update_status']],
            'quotation.update_status' => ['name' => 'Update Quotation Status','module' => 'Quotations', 'action' => 'update_status','description' => 'Change quotation workflow status',             'requires' => ['quotation.view']],
            'quotation.convert_to_order' => ['name' => 'Convert to Order',   'module' => 'Quotations', 'action' => 'convert_to_order','description' => 'Convert accepted quotation to order',       'requires' => ['quotation.view', 'order.view']],

            // ── Commercial Documents ───────────────────────────────────────
            'document.view'                         => ['name' => 'View Documents',                  'module' => 'Documents', 'action' => 'view',              'description' => 'View generated commercial documents',        'requires' => []],
            'document.generate'                     => ['name' => 'Generate Document',               'module' => 'Documents', 'action' => 'generate',           'description' => 'Generate commercial documents',             'requires' => ['document.view']],
            'document.download'                     => ['name' => 'Download Document',               'module' => 'Documents', 'action' => 'download',           'description' => 'Download generated documents',              'requires' => ['document.view']],
            'document.proforma.generate'            => ['name' => 'Generate Proforma Invoice',       'module' => 'Documents', 'action' => 'proforma.generate',  'description' => 'Generate proforma invoice document',        'requires' => ['document.view', 'document.generate', 'order.view']],
            'document.commercial_invoice.generate'  => ['name' => 'Generate Commercial Invoice',     'module' => 'Documents', 'action' => 'ci.generate',        'description' => 'Generate commercial invoice document',      'requires' => ['document.view', 'document.generate', 'order.view']],
            'document.delivery_challan.generate'    => ['name' => 'Generate Delivery Challan',       'module' => 'Documents', 'action' => 'challan.generate',   'description' => 'Generate delivery challan document',        'requires' => ['document.view', 'document.generate', 'order.view']],
            'document.offer_sheet.generate'         => ['name' => 'Generate Offer Sheet',            'module' => 'Documents', 'action' => 'offer.generate',     'description' => 'Generate offer sheet document',            'requires' => ['document.view', 'document.generate', 'quotation.view']],

            // ── Customer Management ────────────────────────────────────────
            'customer.view'           => ['name' => 'View Customers',        'module' => 'Customers', 'action' => 'view',           'description' => 'View customer account list and profiles','requires' => []],
            'customer.view_orders'    => ['name' => 'View Customer Orders',  'module' => 'Customers', 'action' => 'view_orders',    'description' => "View a customer's order history",       'requires' => ['customer.view', 'order.view']],
            'customer.view_spending'  => ['name' => 'View Customer Spending','module' => 'Customers', 'action' => 'view_spending',  'description' => "View customer spending analytics",      'requires' => ['customer.view']],
            'customer.edit'           => ['name' => 'Edit Customer',         'module' => 'Customers', 'action' => 'edit',           'description' => 'Edit customer profile details',         'requires' => ['customer.view']],
            'customer.delete'         => ['name' => 'Delete Customer',       'module' => 'Customers', 'action' => 'delete',         'description' => 'Delete customer accounts',              'requires' => ['customer.view']],

            // ── Coupons ────────────────────────────────────────────────────
            'coupon.view'             => ['name' => 'View Coupons',          'module' => 'Marketing', 'action' => 'view',           'description' => 'View coupon list and details',          'requires' => []],
            'coupon.create'           => ['name' => 'Create Coupon',         'module' => 'Marketing', 'action' => 'create',         'description' => 'Create new discount coupons',           'requires' => ['coupon.view']],
            'coupon.edit'             => ['name' => 'Edit Coupon',           'module' => 'Marketing', 'action' => 'edit',           'description' => 'Edit existing coupon configuration',   'requires' => ['coupon.view']],
            'coupon.delete'           => ['name' => 'Delete Coupon',         'module' => 'Marketing', 'action' => 'delete',         'description' => 'Delete coupons',                        'requires' => ['coupon.view']],
            'coupon.activate'         => ['name' => 'Activate Coupon',       'module' => 'Marketing', 'action' => 'activate',       'description' => 'Activate a coupon code',                'requires' => ['coupon.view']],
            'coupon.deactivate'       => ['name' => 'Deactivate Coupon',     'module' => 'Marketing', 'action' => 'deactivate',     'description' => 'Deactivate a coupon code',              'requires' => ['coupon.view']],

            // ── Analytics ──────────────────────────────────────────────────
            'analytics.dashboard.view'=> ['name' => 'View Dashboard Analytics','module' => 'Analytics', 'action' => 'dashboard.view', 'description' => 'View dashboard summary metrics',    'requires' => []],
            'analytics.sales.view'    => ['name' => 'View Sales Analytics',  'module' => 'Analytics', 'action' => 'sales.view',     'description' => 'View sales revenue data',               'requires' => []],
            'analytics.orders.view'   => ['name' => 'View Order Analytics',  'module' => 'Analytics', 'action' => 'orders.view',    'description' => 'View order volume analytics',           'requires' => []],
            'analytics.profit.view'   => ['name' => 'View Profit Analytics', 'module' => 'Analytics', 'action' => 'profit.view',    'description' => 'View profit and margin analytics',      'requires' => []],
            'analytics.cogs.view'     => ['name' => 'View COGS Analytics',   'module' => 'Analytics', 'action' => 'cogs.view',      'description' => 'View cost-of-goods analytics',          'requires' => ['analytics.profit.view']],

            // ── Audit Logs ─────────────────────────────────────────────────
            'audit.view'              => ['name' => 'View Audit Logs',       'module' => 'Audit', 'action' => 'view',               'description' => 'View system activity audit trail',      'requires' => []],
            'audit.view_sensitive'    => ['name' => 'View Sensitive Audit',  'module' => 'Audit', 'action' => 'view_sensitive',     'description' => 'View sensitive audit entries (IP, PII)','requires' => ['audit.view']],

            // ── Settings & Integrations ────────────────────────────────────
            'settings.view'           => ['name' => 'View Settings',         'module' => 'Settings', 'action' => 'view',            'description' => 'View application settings',             'requires' => []],
            'settings.edit'           => ['name' => 'Edit Settings',         'module' => 'Settings', 'action' => 'edit',            'description' => 'Edit application settings',             'requires' => ['settings.view']],
            'integration.view'        => ['name' => 'View Integrations',     'module' => 'Settings', 'action' => 'integration.view','description' => 'View configured external integrations', 'requires' => ['settings.view']],
            'integration.manage'      => ['name' => 'Manage Integrations',   'module' => 'Settings', 'action' => 'integration.manage','description' => 'Edit external integration configuration','requires' => ['settings.view', 'integration.view']],
            'integration.test'        => ['name' => 'Test Integrations',     'module' => 'Settings', 'action' => 'integration.test','description' => 'Test external integration connectivity','requires' => ['settings.view', 'integration.view']],

            // ── Admin Management ───────────────────────────────────────────
            'admin.view'              => ['name' => 'View Administrators',   'module' => 'AdminManagement', 'action' => 'view',             'description' => 'View list of admin accounts',         'requires' => []],
            'admin.create'            => ['name' => 'Create Administrator',  'module' => 'AdminManagement', 'action' => 'create',           'description' => 'Create new admin accounts',           'requires' => ['admin.view']],
            'admin.edit'              => ['name' => 'Edit Administrator',    'module' => 'AdminManagement', 'action' => 'edit',             'description' => 'Edit admin account details',          'requires' => ['admin.view']],
            'admin.activate'          => ['name' => 'Activate Administrator','module' => 'AdminManagement', 'action' => 'activate',         'description' => 'Activate suspended admin account',    'requires' => ['admin.view']],
            'admin.deactivate'        => ['name' => 'Deactivate Administrator','module' => 'AdminManagement','action' => 'deactivate',      'description' => 'Deactivate admin account',            'requires' => ['admin.view']],
            'admin.delete'            => ['name' => 'Delete Administrator',  'module' => 'AdminManagement', 'action' => 'delete',           'description' => 'Permanently delete admin account',    'requires' => ['admin.view']],
            'admin.reset_password'    => ['name' => 'Reset Admin Password',  'module' => 'AdminManagement', 'action' => 'reset_password',   'description' => 'Reset administrator password',        'requires' => ['admin.view']],
            'admin.assign_role'       => ['name' => 'Assign Admin Role',     'module' => 'AdminManagement', 'action' => 'assign_role',      'description' => 'Assign RBAC roles to administrators', 'requires' => ['admin.view', 'role.view']],
            'admin.remove_role'       => ['name' => 'Remove Admin Role',     'module' => 'AdminManagement', 'action' => 'remove_role',      'description' => 'Remove RBAC roles from administrators','requires' => ['admin.view', 'role.view']],

            // ── RBAC Role Management ───────────────────────────────────────
            'role.view'               => ['name' => 'View Roles',            'module' => 'RBAC', 'action' => 'view',               'description' => 'View RBAC role list and assignments',   'requires' => []],
            'role.create'             => ['name' => 'Create Role',           'module' => 'RBAC', 'action' => 'create',             'description' => 'Create new RBAC roles',                 'requires' => ['role.view']],
            'role.edit'               => ['name' => 'Edit Role',             'module' => 'RBAC', 'action' => 'edit',               'description' => 'Edit RBAC role name and description',   'requires' => ['role.view']],
            'role.delete'             => ['name' => 'Delete Role',           'module' => 'RBAC', 'action' => 'delete',             'description' => 'Delete non-system RBAC roles',          'requires' => ['role.view']],
            'role.assign'             => ['name' => 'Assign Role',           'module' => 'RBAC', 'action' => 'assign',             'description' => 'Assign roles to administrators',        'requires' => ['role.view', 'admin.view']],
            'role.unassign'           => ['name' => 'Unassign Role',         'module' => 'RBAC', 'action' => 'unassign',           'description' => 'Remove roles from administrators',      'requires' => ['role.view', 'admin.view']],

            // ── RBAC Permission Management ─────────────────────────────────
            'permission.view'         => ['name' => 'View Permissions',      'module' => 'RBAC', 'action' => 'permission.view',    'description' => 'View permission catalog',               'requires' => ['role.view']],
            'permission.manage'       => ['name' => 'Manage Permissions',    'module' => 'RBAC', 'action' => 'permission.manage',  'description' => 'Assign/remove permissions from roles. Super Admin only by default.', 'requires' => ['permission.view', 'role.view', 'role.edit']],
        ];
    }
}
