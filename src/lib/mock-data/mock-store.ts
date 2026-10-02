import { B2BProductInput } from "@/types/b2b";
import { CategoryModel } from "@/services/category.service";
import { BrandModel } from "@/services/brand.service";
import { User } from "@/types/api";
import { OrderRecord } from "@/services/order.service";
import { RfqRecord, RfqStatus, RfqMessage, QuotationRecord, QuotationStatus } from "@/types/b2b";
import { InventoryRecord, Warehouse, InventoryAdjustmentPayload } from "@/services/admin/inventory.service";
import { CouponRecord } from "@/services/admin/coupon.service";

import { INITIAL_MOCK_PRODUCTS, normalizeProductData } from "./mock-products";
import { INITIAL_MOCK_CATEGORIES } from "./mock-categories";
import { INITIAL_MOCK_BRANDS } from "./mock-brands";
import { INITIAL_MOCK_USERS, MockUserData } from "./mock-users";
import { INITIAL_MOCK_ORDERS } from "./mock-orders";
import { INITIAL_MOCK_RFQS } from "./mock-rfqs";
import { INITIAL_MOCK_QUOTATIONS } from "./mock-quotations";
import { INITIAL_MOCK_INVENTORY, INITIAL_MOCK_WAREHOUSES } from "./mock-inventory";
import { INITIAL_MOCK_COUPONS } from "./mock-coupons";
import BUSINESS_PROFILE, { BusinessProfile } from "@/config/business-profile";

export interface SystemPreferences {
  currency: string;
  defaultIncoterm: string;
  defaultCartonSpec: string;
  defaultQualityStandard: string;
  defaultPaginationSize: number;
  updated_at?: string;
}

export const INITIAL_SYSTEM_PREFERENCES: SystemPreferences = {
  currency: "USD",
  defaultIncoterm: "FOB Dhaka",
  defaultCartonSpec: "Standard 5-ply export master carton (60x40x30 cm)",
  defaultQualityStandard: "AQL 2.5 Major",
  defaultPaginationSize: 20,
};

// Storage Keys
export const STORAGE_KEYS = {
  PRODUCTS: "ayaan_mock_products_v3",
  CATEGORIES: "ayaan_mock_categories_v3",
  BRANDS: "ayaan_mock_brands_v2",
  USERS: "ayaan_mock_users_v2",
  ACTIVE_USER: "ayaan_mock_active_user_v2",
  AUTH_TOKEN: "ayaan_auth_token",
  ORDERS: "ayaan_mock_orders_v2",
  RFQS: "ayaan_mock_rfqs_v2",
  QUOTATIONS: "ayaan_mock_quotations_v2",
  INVENTORY: "ayaan_mock_inventory_v2",
  WAREHOUSES: "ayaan_mock_warehouses_v2",
  COUPONS: "ayaan_mock_coupons_v2",
  BUSINESS_PROFILE: "ayaan_mock_business_profile_v2",
  SYSTEM_PREFERENCES: "ayaan_mock_system_preferences_v2",
  CART: "ayaan_cart",
  WISHLIST: "ayaan_wishlist",
} as const;

class MockStore {
  private inMemoryCache: Record<string, unknown> = {};

  private getItem<T>(key: string, defaultValue: T): T {
    if (this.inMemoryCache[key] !== undefined) {
      return this.inMemoryCache[key] as T;
    }

    if (typeof window === "undefined") {
      return defaultValue;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.inMemoryCache[key] = parsed;
        return parsed;
      }
    } catch {
      // Fallback
    }

    const clonedDefault = Array.isArray(defaultValue) ? ([...defaultValue] as unknown as T) : defaultValue;
    this.inMemoryCache[key] = clonedDefault;
    this.setItem(key, clonedDefault);
    return clonedDefault;
  }

  private setItem<T>(key: string, value: T): void {
    this.inMemoryCache[key] = value;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent("ayaan:data-updated", { detail: { key, value } }));
      } catch {
        // Storage quota or disabled
      }
    }
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  getProducts(): B2BProductInput[] {
    const list = this.getItem<B2BProductInput[]>(STORAGE_KEYS.PRODUCTS, INITIAL_MOCK_PRODUCTS);
    // Self-healing synchronization: If stored dataset is smaller than baseline dataset, merge missing products
    if (Array.isArray(list) && list.length < INITIAL_MOCK_PRODUCTS.length) {
      const existingIds = new Set(list.map((p) => String(p.id)));
      const missing = INITIAL_MOCK_PRODUCTS.filter((p) => !existingIds.has(String(p.id)));
      if (missing.length > 0) {
        const merged = [...list, ...missing];
        this.setItem(STORAGE_KEYS.PRODUCTS, merged);
        return merged;
      }
    }
    return list;
  }

  getProductByIdOrSlug(idOrSlug: string): B2BProductInput | null {
    const products = this.getProducts();
    const clean = String(idOrSlug).toLowerCase();
    return (
      products.find(
        (p) => String(p.id).toLowerCase() === clean || String(p.slug).toLowerCase() === clean
      ) || null
    );
  }

  saveProduct(productInput: Partial<B2BProductInput>): B2BProductInput {
    const products = this.getProducts();
    const existingIndex = products.findIndex((p) => String(p.id) === String(productInput.id));

    let savedProduct: B2BProductInput;

    if (existingIndex >= 0) {
      const existing = products[existingIndex];
      const cleanUpdates: any = {};
      for (const key of Object.keys(productInput)) {
        if ((productInput as any)[key] !== undefined) {
          cleanUpdates[key] = (productInput as any)[key];
        }
      }
      // Never erase saved productId on partial update if incoming is blank or omitted
      if (!cleanUpdates.productId && !cleanUpdates.product_id && (existing.productId || (existing as any).product_id)) {
        cleanUpdates.productId = existing.productId || (existing as any).product_id;
        cleanUpdates.product_id = cleanUpdates.productId;
      }
      // Never erase packageAllocations or shippingPackageProfiles if untouched
      if ((!cleanUpdates.packageAllocations || cleanUpdates.packageAllocations.length === 0) && existing.packageAllocations && existing.packageAllocations.length > 0) {
        cleanUpdates.packageAllocations = existing.packageAllocations;
      }
      if ((!cleanUpdates.shippingPackageProfiles || cleanUpdates.shippingPackageProfiles.length === 0) && existing.shippingPackageProfiles && existing.shippingPackageProfiles.length > 0) {
        cleanUpdates.shippingPackageProfiles = existing.shippingPackageProfiles;
      }
      savedProduct = {
        ...existing,
        ...cleanUpdates,
      } as B2BProductInput;
      products[existingIndex] = savedProduct;
    } else {
      savedProduct = normalizeProductData({
        ...productInput,
        id: productInput.id || `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });
      products.unshift(savedProduct);
    }

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    return savedProduct;
  }

  deleteProduct(id: string): boolean {
    const products = this.getProducts().filter((p) => String(p.id) !== String(id));
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    return true;
  }

  duplicateProduct(id: string): B2BProductInput | null {
    const original = this.getProductByIdOrSlug(id);
    if (!original) return null;

    const copy: B2BProductInput = {
      ...original,
      id: `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${Date.now().toString(36)}`,
      sku: `${original.sku}-CPY`,
      status: "draft",
    };

    const products = [copy, ...this.getProducts()];
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    return copy;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  getCategories(): CategoryModel[] {
    return this.getItem<CategoryModel[]>(STORAGE_KEYS.CATEGORIES, INITIAL_MOCK_CATEGORIES);
  }

  getCategoryBySlug(slugOrId: string): CategoryModel | null {
    const categories = this.getCategories();
    const clean = String(slugOrId).toLowerCase();
    return (
      categories.find(
        (c) => String(c.id).toLowerCase() === clean || String(c.slug).toLowerCase() === clean
      ) || null
    );
  }

  saveCategory(data: Partial<CategoryModel>): CategoryModel {
    const categories = this.getCategories();
    const id = data.id || `c_${(data.name || "cat").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const slug = data.slug || (data.name || "cat").toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const img = data.image_url || data.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800";
    const category: CategoryModel = {
      id,
      name: data.name || "New Category",
      slug,
      image_url: img,
      image: img,
      description: data.description || "",
      accent_color: data.accent_color,
      sort_order: data.sort_order ?? categories.length + 1,
      is_active: data.is_active ?? true,
    };

    const existingIndex = categories.findIndex((c) => String(c.id) === String(id));
    if (existingIndex >= 0) {
      categories[existingIndex] = { ...categories[existingIndex], ...category };
    } else {
      categories.push(category);
    }

    this.setItem(STORAGE_KEYS.CATEGORIES, categories);
    return category;
  }

  deleteCategory(id: string | number): boolean {
    const categories = this.getCategories().filter((c) => String(c.id) !== String(id));
    this.setItem(STORAGE_KEYS.CATEGORIES, categories);
    return true;
  }

  // ==========================================
  // BRANDS
  // ==========================================
  getBrands(): BrandModel[] {
    return this.getItem<BrandModel[]>(STORAGE_KEYS.BRANDS, INITIAL_MOCK_BRANDS);
  }

  getBrandBySlug(slugOrId: string): BrandModel | null {
    const brands = this.getBrands();
    const clean = String(slugOrId).toLowerCase();
    return (
      brands.find(
        (b) => String(b.id).toLowerCase() === clean || String(b.slug).toLowerCase() === clean
      ) || null
    );
  }

  saveBrand(data: Partial<BrandModel>): BrandModel {
    const brands = this.getBrands();
    const id = data.id || `br_${(data.name || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const slug = data.slug || (data.name || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const logoVal = data.logo_url || data.logo || "";
    const brand: BrandModel = {
      id,
      name: data.name || "New Brand",
      slug,
      logo_url: logoVal,
      logo: logoVal,
      website: data.website || null,
      sort_order: data.sort_order ?? brands.length + 1,
      is_active: data.is_active ?? true,
      products_count: data.products_count ?? 0,
    };

    const existingIndex = brands.findIndex((b) => String(b.id) === String(id));
    if (existingIndex >= 0) {
      brands[existingIndex] = { ...brands[existingIndex], ...brand };
    } else {
      brands.push(brand);
    }

    this.setItem(STORAGE_KEYS.BRANDS, brands);
    return brand;
  }

  deleteBrand(id: string | number): boolean {
    const brands = this.getBrands().filter((b) => String(b.id) !== String(id));
    this.setItem(STORAGE_KEYS.BRANDS, brands);
    return true;
  }

  // ==========================================
  // USERS & AUTH
  // ==========================================
  getUsers(): MockUserData[] {
    const list = this.getItem<MockUserData[]>(STORAGE_KEYS.USERS, INITIAL_MOCK_USERS);
    // Self-healing synchronization: If stored dataset is missing baseline accounts, merge missing users
    if (Array.isArray(list)) {
      let modified = false;
      const normalizedList = list.map((u) => {
        if ((u as any).role === "b2b_buyer") {
          modified = true;
          return { ...u, role: "customer" as const };
        }
        return u;
      });

      const existingEmails = new Set(normalizedList.map((u) => (u.email || "").toLowerCase()));
      const missing = INITIAL_MOCK_USERS.filter((u) => !existingEmails.has((u.email || "").toLowerCase()));
      if (missing.length > 0) {
        const merged = [...normalizedList, ...missing];
        this.setItem(STORAGE_KEYS.USERS, merged);
        return merged;
      }

      if (modified) {
        this.setItem(STORAGE_KEYS.USERS, normalizedList);
        return normalizedList;
      }
      return normalizedList;
    }
    return list;
  }

  getUserById(id: number | string): MockUserData | null {
    return this.getUsers().find((u) => String(u.id) === String(id)) || null;
  }

  getUserByEmail(email: string): MockUserData | null {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getActiveUser(): User | null {
    const active = this.getItem<User | null>(STORAGE_KEYS.ACTIVE_USER, null);
    if (active && (active as any).role === "b2b_buyer") {
      active.role = "customer";
      this.setActiveUser(active);
    }
    return active;
  }

  setActiveUser(user: User | null): void {
    this.setItem(STORAGE_KEYS.ACTIVE_USER, user);
    if (user) {
      if (typeof window !== "undefined") {
        const isFrontend = localStorage.getItem("ayaan_frontend_only_mode") === "true";
        const currentToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        // Prompt 7: NEVER overwrite a genuine backend token (Sanctum plainTextToken) with a mock token
        if (isFrontend && (!currentToken || currentToken.startsWith("mock_token_"))) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, `mock_token_${user.role}_${user.id}`);
        }
      }
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      }
    }
  }

  saveUser(userData: Partial<MockUserData>): MockUserData {
    const users = this.getUsers();
    const existingIndex = users.findIndex(
      (u) => String(u.id) === String(userData.id) || u.email.toLowerCase() === (userData.email || "").toLowerCase()
    );

    let saved: MockUserData;
    if (existingIndex >= 0) {
      saved = { ...users[existingIndex], ...userData };
      users[existingIndex] = saved;
    } else {
      saved = {
        id: userData.id || Date.now(),
        name: userData.name || "New User",
        email: userData.email || `user${Date.now()}@example.com`,
        password: userData.password || "password",
        role: userData.role === "admin" ? "admin" : "customer",
        phone: userData.phone,
        company_name: userData.company_name,
        tax_id: userData.tax_id,
        country: userData.country,
        business_type: userData.business_type,
        website: userData.website,
        b2b_approval_status: userData.b2b_approval_status || "approved",
        b2b_payment_terms: userData.b2b_payment_terms || "none",
        is_active: userData.is_active ?? true,
        created_at: new Date().toISOString(),
      };
      users.push(saved);
    }

    this.setItem(STORAGE_KEYS.USERS, users);

    // If updating current active user, sync session
    const currentActive = this.getActiveUser();
    if (currentActive && String(currentActive.id) === String(saved.id)) {
      this.setActiveUser(saved);
    }

    return saved;
  }

  deleteUser(id: number | string): boolean {
    const currentActive = this.getActiveUser();
    if (currentActive && String(currentActive.id) === String(id)) {
      return false; // Prevent deleting active user
    }
    const users = this.getUsers().filter((u) => String(u.id) !== String(id));
    this.setItem(STORAGE_KEYS.USERS, users);
    return true;
  }

  // ==========================================
  // ORDERS
  // ==========================================
  getOrders(): OrderRecord[] {
    const list = this.getItem<OrderRecord[]>(STORAGE_KEYS.ORDERS, INITIAL_MOCK_ORDERS);
    // Self-healing synchronization: If stored dataset is missing baseline orders, merge missing orders
    if (Array.isArray(list)) {
      const existingIds = new Set(list.map((o) => String(o.id)));
      const missing = INITIAL_MOCK_ORDERS.filter((o) => !existingIds.has(String(o.id)));
      if (missing.length > 0) {
        const merged = [...list, ...missing];
        this.setItem(STORAGE_KEYS.ORDERS, merged);
        return merged;
      }
    }
    return list;
  }

  getOrderById(id: string): OrderRecord | null {
    const orders = this.getOrders();
    const clean = String(id).trim().toLowerCase();
    const cleanNoHash = clean.replace(/^#/, "");
    return (
      orders.find((o) => {
        const oId = String(o.id).toLowerCase();
        const oNum = String(o.order_number || "").toLowerCase();
        const oNumNoHash = oNum.replace(/^#/, "");
        return oId === clean || oNum === clean || oNumNoHash === cleanNoHash || oId === cleanNoHash;
      }) || null
    );
  }

  getUserOrders(userId: string | number): OrderRecord[] {
    return this.getOrders().filter((o) => String(o.user_id) === String(userId));
  }

  saveOrder(order: OrderRecord): OrderRecord {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => String(o.id) === String(order.id) || o.order_number === order.order_number);

    if (index >= 0) {
      orders[index] = order;
    } else {
      orders.unshift(order);
    }

    this.setItem(STORAGE_KEYS.ORDERS, orders);
    return order;
  }

  // ==========================================
  // RFQS
  // ==========================================
  getRfqs(): RfqRecord[] {
    return this.getItem<RfqRecord[]>(STORAGE_KEYS.RFQS, INITIAL_MOCK_RFQS);
  }

  getRfqById(id: string): RfqRecord | null {
    const rfqs = this.getRfqs();
    return rfqs.find((r) => r.id === id || r.rfqNumber === id) || null;
  }

  saveRfq(rfq: RfqRecord): RfqRecord {
    const rfqs = this.getRfqs();
    const index = rfqs.findIndex((r) => r.id === rfq.id || r.rfqNumber === rfq.rfqNumber);

    if (index >= 0) {
      rfqs[index] = rfq;
    } else {
      rfqs.unshift(rfq);
    }

    this.setItem(STORAGE_KEYS.RFQS, rfqs);
    return rfq;
  }

  updateRfqStatus(id: string, status: RfqStatus, actorName: string = "Admin", note?: string): RfqRecord | null {
    const rfq = this.getRfqById(id);
    if (!rfq) return null;

    rfq.status = status;
    rfq.updatedAt = new Date().toISOString();
    if (!rfq.history) rfq.history = [];
    rfq.history.unshift({
      id: `hist_${Date.now()}`,
      rfqId: id,
      status,
      actorName,
      note: note || `Status updated to ${status}`,
      createdAt: new Date().toISOString(),
    });

    return this.saveRfq(rfq);
  }

  addRfqMessage(
    rfqId: string,
    message: {
      senderRole: "buyer" | "admin" | "sales";
      senderName: string;
      message: string;
      createdAt?: string;
    }
  ): RfqMessage | null {
    const rfq = this.getRfqById(rfqId);
    if (!rfq) return null;

    const now = message.createdAt || new Date().toISOString();
    const msgObj: RfqMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rfqId: rfq.id,
      senderRole: message.senderRole,
      senderName: message.senderName,
      message: message.message,
      createdAt: now,
    };

    if (!rfq.messages) {
      rfq.messages = [];
    }

    rfq.messages.push(msgObj);
    rfq.updatedAt = now;
    this.saveRfq(rfq);
    return msgObj;
  }

  // ==========================================
  // QUOTATIONS
  // ==========================================
  getQuotations(): QuotationRecord[] {
    return this.getItem<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, INITIAL_MOCK_QUOTATIONS);
  }

  getQuotationById(id: string): QuotationRecord | null {
    const quotes = this.getQuotations();
    return quotes.find((q) => q.id === id || q.quotationNumber === id) || null;
  }

  getQuotationByRfqId(rfqId: string): QuotationRecord | null {
    const quotes = this.getQuotations();
    return quotes.find((q) => q.rfqId === rfqId || q.rfqNumber === rfqId) || null;
  }

  saveQuotation(quote: QuotationRecord): QuotationRecord {
    const quotes = this.getQuotations();
    const index = quotes.findIndex(
      (q) => q.id === quote.id || q.quotationNumber === quote.quotationNumber
    );

    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.unshift(quote);
    }

    this.setItem(STORAGE_KEYS.QUOTATIONS, quotes);
    return quote;
  }

  updateQuotationStatus(id: string, status: QuotationStatus): QuotationRecord | null {
    const quote = this.getQuotationById(id);
    if (!quote) return null;

    quote.status = status;
    quote.updatedAt = new Date().toISOString();
    return this.saveQuotation(quote);
  }

  // ==========================================
  // INVENTORY & SINGLE UTTARA WAREHOUSE
  // ==========================================
  getInventory(): InventoryRecord[] {
    const raw = this.getItem<InventoryRecord[]>(STORAGE_KEYS.INVENTORY, INITIAL_MOCK_INVENTORY);
    if (!Array.isArray(raw)) return [];
    return raw;
  }

  getWarehouses(): Warehouse[] {
    const count = this.getInventory().length;
    return INITIAL_MOCK_WAREHOUSES.map((w) => ({
      ...w,
      inventories_count: count,
    }));
  }

  adjustInventory(payload: InventoryAdjustmentPayload): InventoryRecord | null {
    const inventoryList = this.getInventory();
    const item = inventoryList.find((i) => i.id === payload.inventory_id);
    if (!item) return null;

    const prev = item.quantity;
    const diff = payload.adjustment_amount ?? ((payload.new_quantity ?? prev) - prev);
    const result = prev + diff;

    item.quantity = result;
    item.updated_at = new Date().toISOString();

    if (!item.adjustments) item.adjustments = [];
    item.adjustments.unshift({
      id: Date.now(),
      previous_quantity: prev,
      adjustment_amount: diff,
      resulting_quantity: result,
      reason: payload.reason,
      notes: payload.notes,
      created_at: new Date().toISOString(),
      admin_user: {
        id: 1,
        name: "Ayaan Admin",
        email: "admin@ayaanclothing.com",
      },
    });

    this.setItem(STORAGE_KEYS.INVENTORY, inventoryList);
    return item;
  }

  // ==========================================
  // COUPONS
  // ==========================================
  getCoupons(): CouponRecord[] {
    const list = this.getItem<CouponRecord[]>(STORAGE_KEYS.COUPONS, INITIAL_MOCK_COUPONS);
    if (Array.isArray(list)) {
      const existingCodes = new Set(list.map((c) => (c.code || "").toUpperCase().trim()));
      const missing = INITIAL_MOCK_COUPONS.filter(
        (c) => !existingCodes.has((c.code || "").toUpperCase().trim())
      );
      if (missing.length > 0) {
        const merged = [...list, ...missing];
        this.setItem(STORAGE_KEYS.COUPONS, merged);
        return merged;
      }
      return list;
    }
    return list;
  }

  saveCoupon(couponData: Partial<CouponRecord>): CouponRecord {
    const coupons = [...this.getCoupons()];
    const existingIndex = coupons.findIndex((c) => c.id === couponData.id);

    let saved: CouponRecord;
    if (existingIndex >= 0) {
      saved = { ...coupons[existingIndex], ...couponData } as CouponRecord;
      coupons[existingIndex] = saved;
    } else {
      saved = {
        id: Date.now(),
        code: (couponData.code || "DISCOUNT").toUpperCase().trim(),
        discount_type: couponData.discount_type || "percentage",
        discount_value: couponData.discount_value || 10,
        min_spend: couponData.min_spend ?? 500,
        max_discount: couponData.max_discount,
        usage_limit: couponData.usage_limit,
        usage_count: couponData.usage_count || 0,
        starts_at: couponData.starts_at || new Date().toISOString(),
        expires_at: couponData.expires_at,
        is_active: couponData.is_active ?? true,
        created_at: new Date().toISOString(),
      };
      coupons.unshift(saved);
    }

    this.setItem(STORAGE_KEYS.COUPONS, coupons);
    return saved;
  }

  incrementCouponUsage(codeOrId: string | number): void {
    const coupons = this.getCoupons();
    const clean = String(codeOrId).toUpperCase().trim();
    const coupon = coupons.find(
      (c) => String(c.id) === String(codeOrId) || (c.code || "").toUpperCase().trim() === clean
    );
    if (coupon) {
      coupon.usage_count = (coupon.usage_count || 0) + 1;
      this.saveCoupon(coupon);
    }
  }

  deleteCoupon(id: number | string): boolean {
    const coupons = this.getCoupons().filter((c) => String(c.id) !== String(id));
    this.setItem(STORAGE_KEYS.COUPONS, coupons);
    return true;
  }

  // ==========================================
  // BUSINESS PROFILE & PREFERENCES
  // ==========================================
  getBusinessProfile(): BusinessProfile {
    return this.getItem<BusinessProfile>(STORAGE_KEYS.BUSINESS_PROFILE, BUSINESS_PROFILE);
  }

  saveBusinessProfile(data: Partial<BusinessProfile>): BusinessProfile {
    const current = this.getBusinessProfile();
    const updated: BusinessProfile = {
      ...current,
      ...data,
      address: {
        ...current.address,
        ...(data.address || {}),
      },
      contact: {
        ...current.contact,
        ...(data.contact || {}),
      },
      // Strictly preserve approved Pubali Bank Limited export wire details
      banking: {
        ...BUSINESS_PROFILE.banking,
        ...(data.banking || {}),
        bankName: "Pubali Bank Limited",
        accountTitle: "M/S AYAAN  CLOTHING",
        accountNo: "1788-901-044316",
        accountNumber: "1788-901-044316",
        swiftCode: "PUBABDDH210",
        bankAddress: "Nawabpur Road Branch,\n125 Nawabpur Road,\nDhaka-1100,\nBangladesh",
        branch: "Nawabpur Road Branch",
        routingNumber: null,
      },
    };
    this.setItem(STORAGE_KEYS.BUSINESS_PROFILE, updated);
    return updated;
  }

  getSystemPreferences(): SystemPreferences {
    return this.getItem<SystemPreferences>(STORAGE_KEYS.SYSTEM_PREFERENCES, INITIAL_SYSTEM_PREFERENCES);
  }

  saveSystemPreferences(data: Partial<SystemPreferences>): SystemPreferences {
    const current = this.getSystemPreferences();
    const updated: SystemPreferences = {
      ...current,
      ...data,
      currency: "USD", // Strictly USD
      updated_at: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.SYSTEM_PREFERENCES, updated);
    return updated;
  }

  // ==========================================
  // RESET ALL DEMO DATA
  // ==========================================
  resetAllMockData(): void {
    this.inMemoryCache = {};

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
        localStorage.removeItem(STORAGE_KEYS.BRANDS);
        localStorage.removeItem(STORAGE_KEYS.USERS);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.ORDERS);
        localStorage.removeItem(STORAGE_KEYS.RFQS);
        localStorage.removeItem(STORAGE_KEYS.QUOTATIONS);
        localStorage.removeItem(STORAGE_KEYS.INVENTORY);
        localStorage.removeItem(STORAGE_KEYS.WAREHOUSES);
        localStorage.removeItem(STORAGE_KEYS.COUPONS);
        localStorage.removeItem(STORAGE_KEYS.BUSINESS_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.SYSTEM_PREFERENCES);
        localStorage.removeItem(STORAGE_KEYS.CART);
        localStorage.removeItem(STORAGE_KEYS.WISHLIST);
        localStorage.removeItem("ayaan_customer_addresses_v1");
        localStorage.removeItem("ayaan_recent_searches");
      } catch {
        // Ignore
      }
    }

    // Re-seed baseline data
    this.setItem(STORAGE_KEYS.PRODUCTS, INITIAL_MOCK_PRODUCTS);
    this.setItem(STORAGE_KEYS.CATEGORIES, INITIAL_MOCK_CATEGORIES);
    this.setItem(STORAGE_KEYS.BRANDS, INITIAL_MOCK_BRANDS);
    this.setItem(STORAGE_KEYS.USERS, INITIAL_MOCK_USERS);
    this.setItem(STORAGE_KEYS.ORDERS, INITIAL_MOCK_ORDERS);
    this.setItem(STORAGE_KEYS.RFQS, INITIAL_MOCK_RFQS);
    this.setItem(STORAGE_KEYS.QUOTATIONS, INITIAL_MOCK_QUOTATIONS);
    this.setItem(STORAGE_KEYS.INVENTORY, INITIAL_MOCK_INVENTORY);
    this.setItem(STORAGE_KEYS.WAREHOUSES, INITIAL_MOCK_WAREHOUSES);
    this.setItem(STORAGE_KEYS.COUPONS, INITIAL_MOCK_COUPONS);
    this.setItem(STORAGE_KEYS.BUSINESS_PROFILE, BUSINESS_PROFILE);
    this.setItem(STORAGE_KEYS.SYSTEM_PREFERENCES, INITIAL_SYSTEM_PREFERENCES);
    this.setItem(STORAGE_KEYS.ACTIVE_USER, null);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ayaan:data-reset", { detail: { timestamp: Date.now() } }));
    }
  }
}

export const mockStore = new MockStore();
