/**
 * Centralized RBAC Permission Constants and Helpers for Ayaan Clothing Admin Portal.
 * Maps 1:1 with Laravel RbacPermissionCatalogSeeder (139 permissions).
 */

export const ADMIN_PERMISSIONS = {
  // Products
  PRODUCT_VIEW: "product.view",
  PRODUCT_CREATE: "product.create",
  PRODUCT_SAVE_DRAFT: "product.save_draft",
  PRODUCT_EDIT: "product.edit",
  PRODUCT_PUBLISH: "product.publish",
  PRODUCT_ARCHIVE: "product.archive",
  PRODUCT_DELETE: "product.delete",
  PRODUCT_IMAGE_VIEW: "product.image.view",
  PRODUCT_IMAGE_UPLOAD: "product.image.upload",
  PRODUCT_IMAGE_DELETE: "product.image.delete",
  PRODUCT_IMAGE_REORDER: "product.image.reorder",
  PRODUCT_VARIANT_VIEW: "product.variant.view",
  PRODUCT_VARIANT_MANAGE: "product.variant.manage",
  PRODUCT_PRICING_VIEW: "product.pricing.view",
  PRODUCT_PRICING_MANAGE: "product.pricing.manage",
  PRODUCT_SHIPPING_PROFILE_MANAGE: "product.shipping_profile.manage",

  // Categories
  CATEGORY_VIEW: "category.view",
  CATEGORY_CREATE: "category.create",
  CATEGORY_EDIT: "category.edit",
  CATEGORY_DELETE: "category.delete",
  CATEGORY_REORDER: "category.reorder",

  // Brands
  BRAND_VIEW: "brand.view",
  BRAND_CREATE: "brand.create",
  BRAND_EDIT: "brand.edit",
  BRAND_DELETE: "brand.delete",
  BRAND_FEATURE: "brand.feature",

  // Orders
  ORDER_VIEW: "order.view",
  ORDER_VIEW_CUSTOMER: "order.view_customer",
  ORDER_VIEW_ITEMS: "order.view_items",
  ORDER_UPDATE_STATUS: "order.update_status",
  ORDER_CONFIRM: "order.confirm",
  ORDER_CANCEL: "order.cancel",
  ORDER_UPDATE_FULFILLMENT: "order.update_fulfillment",
  ORDER_SHIPPING_UPDATE: "order.shipping.update",

  // Point of Sale (POS)
  POS_VIEW: "pos.view",
  POS_CREATE: "pos.create",

  // Payments
  PAYMENT_VIEW: "payment.view",
  PAYMENT_RECEIPT_VIEW: "payment.receipt.view",
  PAYMENT_RECEIPT_DOWNLOAD: "payment.receipt.download",
  PAYMENT_RECEIPT_VERIFY: "payment.receipt.verify",
  PAYMENT_RECEIPT_REJECT: "payment.receipt.reject",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_VIEW_WAREHOUSE: "inventory.view_warehouse",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_AUDIT: "inventory.audit",
  INVENTORY_TRANSFER: "inventory.transfer",

  // RFQ & Quotations
  RFQ_VIEW: "rfq.view",
  RFQ_ASSIGN: "rfq.assign",
  RFQ_UPDATE_STATUS: "rfq.update_status",
  RFQ_MESSAGE_SEND: "rfq.message.send",
  QUOTATION_VIEW: "quotation.view",
  QUOTATION_CREATE: "quotation.create",
  QUOTATION_EDIT: "quotation.edit",
  QUOTATION_SEND: "quotation.send",

  // Customers
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_VIEW_ORDERS: "customer.view_orders",
  CUSTOMER_VIEW_SPENDING: "customer.view_spending",
  CUSTOMER_EDIT: "customer.edit",
  CUSTOMER_DELETE: "customer.delete",

  // Coupons
  COUPON_VIEW: "coupon.view",
  COUPON_CREATE: "coupon.create",
  COUPON_EDIT: "coupon.edit",
  COUPON_DELETE: "coupon.delete",

  // Homepage
  HOMEPAGE_VIEW: "homepage.view",
  HOMEPAGE_BANNER_EDIT: "homepage.banner.edit",
  HOMEPAGE_BANNER_PUBLISH: "homepage.banner.publish",

  // Documents
  DOCUMENT_VIEW: "document.view",
  DOCUMENT_GENERATE: "document.generate",
  DOCUMENT_DOWNLOAD: "document.download",

  // Analytics
  ANALYTICS_DASHBOARD_VIEW: "analytics.dashboard.view",
  ANALYTICS_SALES_VIEW: "analytics.sales.view",
  ANALYTICS_ORDERS_VIEW: "analytics.orders.view",
  ANALYTICS_PROFIT_VIEW: "analytics.profit.view",
  ANALYTICS_COGS_VIEW: "analytics.cogs.view",

  // Audit
  AUDIT_VIEW: "audit.view",
  AUDIT_VIEW_SENSITIVE: "audit.view_sensitive",

  // Administration & RBAC
  ADMIN_VIEW: "admin.view",
  ADMIN_CREATE: "admin.create",
  ADMIN_EDIT: "admin.edit",
  ADMIN_DELETE: "admin.delete",
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_EDIT: "role.edit",
  ROLE_DELETE: "role.delete",
  PERMISSION_VIEW: "permission.view",
  PERMISSION_MANAGE: "permission.manage",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
  ARAMEX_SETTINGS_VIEW: "aramex.settings.view",
  ARAMEX_SETTINGS_EDIT: "aramex.settings.edit",
} as const;

export type AdminPermissionSlug = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS] | string;
