import { mockStore } from "@/lib/mock-data/mock-store";
import { generateMockDocument } from "@/lib/mock-data/mock-documents";
import { getWhatsAppUrl } from "@/config/business-profile";
import { apiClient } from "./api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { OrderDocumentItem, OrderDocumentGroup } from "@/types/b2b";

export interface OrderItemRecord {
  id?: string;
  order_id?: string;
  user_id?: string | number;
  product_id?: string;
  product_variant_id?: string;
  product_name: string;
  product_slug?: string;
  product_image_url?: string;
  product_images?: string[];
  sku?: string;
  variant_title?: string;
  variant_summary?: string;
  size?: string;
  color?: string;
  package_breakdown?: any;
  unit_price: number;
  unit_price_cents: number;
  quantity: number;
  line_total: number;
  line_total_cents: number;
  current_stock?: number | null;
  stock_available?: boolean | null;
  stock_shortfall?: number | null;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  user_id?: string | number | null;
  event_type: 
    | "order_placed"
    | "payment_succeeded"
    | "payment_failed"
    | "payment_proof_uploaded"
    | "fulfillment_processing"
    | "fulfillment_shipped"
    | "fulfillment_delivered"
    | "order_cancelled"
    | "order_refunded"
    | string;
  message?: string;
  created_at: string;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  user_id?: string | number | null;
  order_source?: "storefront" | "pos" | string;
  created_by_admin_id?: string | number | null;
  created_by_admin?: {
    id?: string | number;
    name?: string;
    email?: string;
  } | null;
  status: "pending" | "processing" | "confirmed" | "fulfilled" | "cancelled" | "shipped" | "delivered" | string;
  customer_status?: "ORDER_PLACED" | "PAYMENT_PENDING" | "WAITING_FOR_APPROVAL" | "ORDER_CONFIRMED" | "ON_SHIPMENT" | string;
  payment_status: "pending" | "paid" | "failed" | "refunded" | string;
  fulfillment_status: "unfulfilled" | "processing" | "shipped" | "delivered" | "returned" | string;
  currency: string;
  email: string;
  shipping_name: string;
  shipping_phone?: string;
  shipping_company?: string;
  shipping_address1: string;
  shipping_address2?: string;
  shipping_city: string;
  shipping_region?: string;
  shipping_postal_code: string;
  shipping_country_code: string;
  shipping_method?: string;
  carrier?: string;
  tracking_number?: string;
  shipment_id?: string;
  shipment_reference?: string;
  shipment_label_url?: string;
  carrier_status?: string;
  last_carrier_update?: string;
  last_shipment_error?: string;
  shipping_quote_id?: string;
  shipping_snapshot?: import("@/types/b2b").OrderShippingSnapshot;
  direct_tracking_url?: string;
  can_create_aramex_shipment?: boolean;
  payment_method: string;
  notes?: string;
  transport_method?: string;
  shipping_service_type?: string;
  destination_port?: string;
  special_instructions?: string;
  third_party_notify?: {
    name?: string;
    address?: string;
  };
  subtotal: number;
  subtotal_cents: number;
  shipping_cost: number;
  shipping_cents: number;
  tax_amount: number;
  tax_cents: number;
  other_charges?: number;
  other_charges_cents?: number;
  discount_amount: number;
  discount_cents: number;
  manual_discount_amount?: number;
  manual_discount_type?: "percentage" | "fixed" | string;
  manual_discount_value?: number;
  manual_discount_reason?: string;
  paid_amount?: number;
  balance_due?: number;
  coupon_code?: string;
  promo_code?: string;
  total_amount: number;
  total_cents: number;
  payment_proof_url?: string;
  placed_at: string;
  created_at: string;
  updated_at: string;
  items?: OrderItemRecord[];
  status_events?: OrderStatusEvent[];
  user?: {
    id?: number | string;
    name?: string;
    email?: string;
    company_name?: string;
  };
  payment_details?: {
    payment_status?: string;
    payment_method?: string;
    transaction_id?: string;
    payer_name?: string;
    bank_name?: string;
    account_number?: string;
    payment_amount?: number;
    currency?: string;
    payment_date?: string;
    notes?: string;
    receipt_url?: string;
    receipt_original_name?: string;
    confirmed_at?: string;
    confirmed_by_id?: number | string;
    confirmed_by_name?: string;
    inventory_decremented?: boolean;
    inventory_decremented_at?: string;
    tendered_amount?: number;
    change_return?: number;
  } | null;
  payment_confirmed_at?: string;
  payments?: any[];
}

export interface CreateOrderInput {
  userId?: string | number;
  email: string;
  shippingName: string;
  shippingCompany?: string;
  shippingPhone?: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingCity: string;
  shippingRegion?: string;
  shippingPostalCode: string;
  shippingCountryCode: string;
  shippingMethod?: string;
  carrier?: string;
  shippingCost: number;
  shippingQuoteId?: string;
  shippingSnapshot?: any;
  otherCharges?: number;
  couponCode?: string;
  promoCode?: string;
  discountAmount?: number;
  paymentMethod?: string;
  notes?: string;
  transportMethod?: string;
  shippingServiceType?: string;
  destinationPort?: string;
  specialInstructions?: string;
  thirdPartyNotify?: {
    name?: string;
    address?: string;
  };
  items: Array<{
    productId?: string;
    variantId?: string;
    productName?: string;
    name?: string;
    sku?: string;
    productSlug?: string;
    productImage?: string;
    image?: string;
    size?: string;
    color?: string;
    variantTitle?: string;
    quantity: number;
    unitPrice?: number;
    packageBreakdown?: any;
  }>;
}

export class OrderService {
  /**
   * Fetch all orders for a user
   */
  async getUserOrders(userId?: string | number): Promise<OrderRecord[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/orders");
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list)) {
        return list.map((o: any) => this.normalizeOrderRecord(o));
      }
      return [];
    }

    if (userId) {
      return mockStore.getUserOrders(userId);
    }
    return mockStore.getOrders();
  }

  /**
   * Fetch a single order by ID
   */
  async getOrderById(orderId: string): Promise<OrderRecord | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/orders/${orderId}`);
        const data = res?.data || res;
        if (data && (data.id || data.order_number)) {
          return this.normalizeOrderRecord(data);
        }
        return null;
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null;
        throw err;
      }
    }

    return mockStore.getOrderById(orderId);
  }

  /**
   * Create an order
   */
  async createOrder(input: CreateOrderInput): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/orders", input);
      const data = res?.data || res;
      if (data && (data.id || data.order_number)) {
        return this.normalizeOrderRecord(data);
      }
      throw new Error("Invalid response received from order creation endpoint.");
    }

    const totalUnits = input.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const subtotal = input.items.reduce((sum, i) => sum + (i.unitPrice || 15) * (i.quantity || 1), 0);
    const requestedDiscount = input.discountAmount || 0;
    const discount = Math.min(subtotal, Math.max(0, Math.round(requestedDiscount * 100) / 100));
    const shipping = input.shippingCost || 0;
    const otherCharges = input.otherCharges || 0;
    const grandTotal = Math.max(0, subtotal - discount) + shipping + otherCharges;
    const appliedCode = (input.couponCode || input.promoCode || "").trim().toUpperCase() || undefined;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `AYN-${dateStr}-${randNum}`;
    const orderId = `ord_${Date.now()}`;

    const newOrder: OrderRecord = {
      id: orderId,
      order_number: orderNumber,
      user_id: input.userId || null,
      status: "processing",
      payment_status: "pending",
      fulfillment_status: "processing",
      currency: "USD",
      email: input.email,
      shipping_name: input.shippingName,
      shipping_company: input.shippingCompany,
      shipping_phone: input.shippingPhone,
      shipping_address1: input.shippingAddress,
      shipping_address2: input.shippingAddress2,
      shipping_city: input.shippingCity,
      shipping_region: input.shippingRegion || "Default Region",
      shipping_postal_code: input.shippingPostalCode,
      shipping_country_code: input.shippingCountryCode || "US",
      shipping_method: input.shippingMethod || "Aramex Priority Air Express",
      carrier: input.carrier || "Aramex Express Air",
      tracking_number: `AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      shipment_id: `SHP-${Math.floor(10000 + Math.random() * 90000)}`,
      direct_tracking_url: getWhatsAppUrl(`Track Order ${orderNumber}`),
      carrier_status: "Processing at Export Facility",
      payment_method: input.paymentMethod || "proforma_invoice",
      notes: input.notes || input.specialInstructions,
      transport_method: input.transportMethod || (input.shippingSnapshot?.mode === "sea" ? "sea" : "air"),
      shipping_service_type: input.shippingServiceType || "door_to_door",
      destination_port: input.destinationPort,
      special_instructions: input.specialInstructions || input.notes,
      third_party_notify: input.thirdPartyNotify,
      shipping_snapshot: input.shippingSnapshot
        ? {
            ...input.shippingSnapshot,
            destination: {
              ...input.shippingSnapshot.destination,
              name: input.shippingName,
              company_name: input.shippingCompany,
              phone: input.shippingPhone,
              email: input.email,
              address1: input.shippingAddress,
              address2: input.shippingAddress2,
              city: input.shippingCity,
              region: input.shippingRegion,
              postal_code: input.shippingPostalCode,
              country_code: input.shippingCountryCode,
            },
            service_type: input.shippingServiceType || input.shippingSnapshot.service_type || "door_to_door",
            destination_port: input.destinationPort || input.shippingSnapshot.destination_port,
            special_instructions: input.specialInstructions || input.notes || input.shippingSnapshot.special_instructions,
            third_party_notify: input.thirdPartyNotify || input.shippingSnapshot.third_party_notify,
          }
        : undefined,
      subtotal,
      subtotal_cents: Math.round(subtotal * 100),
      shipping_cost: shipping,
      shipping_cents: Math.round(shipping * 100),
      tax_amount: 0,
      tax_cents: 0,
      other_charges: otherCharges,
      other_charges_cents: Math.round(otherCharges * 100),
      discount_amount: discount,
      discount_cents: Math.round(discount * 100),
      coupon_code: appliedCode,
      promo_code: appliedCode,
      total_amount: grandTotal,
      total_cents: Math.round(grandTotal * 100),
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: input.items.map((item, idx) => ({
        id: `item_${orderId}_${idx + 1}`,
        order_id: orderId,
        product_id: item.productId,
        product_variant_id: item.variantId,
        product_name: item.productName || item.name || "Export Garment Item",
        product_slug: item.productSlug || (item.productName || item.name || "garment").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        product_image_url: item.productImage || item.image || "/placeholder.jpg",
        sku: item.sku || `AYN-EXP-${idx + 101}`,
        size: item.size || item.variantTitle || "Standard Assorted",
        color: item.color || "Assorted",
        quantity: item.quantity,
        unit_price: item.unitPrice || 15,
        unit_price_cents: Math.round((item.unitPrice || 15) * 100),
        line_total: (item.unitPrice || 15) * item.quantity,
        line_total_cents: Math.round((item.unitPrice || 15) * item.quantity * 100),
        package_breakdown: item.packageBreakdown,
      })),
      status_events: [
        {
          id: `ev_${Date.now()}_1`,
          order_id: orderId,
          event_type: "order_placed",
          message: `Commercial order confirmed (${totalUnits} pcs). Proforma Invoice issued.`,
          created_at: new Date().toISOString(),
        },
      ],
    };

    mockStore.saveOrder(newOrder);

    if (appliedCode) {
      mockStore.incrementCouponUsage(appliedCode);
    }

    return newOrder;
  }

  /**
   * Fetch official commercial document for an order
   */
  async getOrderCommercialDocument(orderId: string, docType: string): Promise<any> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>(`/orders/${orderId}/documents/${docType}`);
      return res?.data || res;
    }

    const order = mockStore.getOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const activeUser = mockStore.getActiveUser();
    const isAdmin = activeUser?.role === "admin";
    return generateMockDocument(order, docType, isAdmin);
  }

  /**
   * Fetch customer document groups (Order-wise Document Center)
   */
  async getCustomerDocumentGroups(params?: {
    search?: string;
    filter?: string;
    page?: number;
    per_page?: number;
    userId?: string | number;
  }): Promise<{ data: OrderDocumentGroup[]; meta?: any }> {
    if (!isFrontendOnly()) {
      try {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.set("search", params.search);
        if (params?.filter) queryParams.set("filter", params.filter);
        if (params?.page) queryParams.set("page", String(params.page));
        if (params?.per_page) queryParams.set("per_page", String(params.per_page));

        const queryString = queryParams.toString();
        const url = `/orders/documents${queryString ? `?${queryString}` : ""}`;
        const res = await apiClient.get<any>(url);

        if (res && res.data && Array.isArray(res.data)) {
          return { data: res.data, meta: res.meta };
        }
      } catch (err) {
        console.warn("Failed to fetch order documents from API, falling back to local assembly:", err);
      }
    }

    // Offline / Mock Store Assembly
    const orders = await this.getUserOrders(params?.userId);
    let groups: OrderDocumentGroup[] = [];

    for (const order of orders) {
      let year = "2026";
      let orderNumClean = "";
      const dateMatch = String(order.order_number).match(/(\d{4})(\d{4})/);
      if (dateMatch) {
        year = dateMatch[1];
        orderNumClean = dateMatch[2];
      } else {
        orderNumClean = String(order.order_number).replace(/\D/g, "").slice(-4) || String(order.id);
        year = order.placed_at ? order.placed_at.slice(0, 4) : "2026";
      }
      const isPaid = order.payment_status === "paid" || order.payment_status === "completed" || order.status === "processing" || order.status === "confirmed";

      const allDocs: OrderDocumentItem[] = [];

      // 1. Proforma Invoice (PI)
      allDocs.push({
        id: `doc_PI_${order.id}`,
        doc_type: "PROFORMA_INVOICE",
        type_name: "Proforma Invoice",
        badge_code: "PI",
        reference: `PI-${year}-${orderNumClean}`,
        date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: order.total_amount,
        currency: order.currency || "USD",
        source_id: order.id,
        is_gated: false,
      });

      // 2. Commercial Invoice (CI) - paid only
      if (isPaid) {
        allDocs.push({
          id: `doc_CI_${order.id}`,
          doc_type: "COMMERCIAL_INVOICE",
          type_name: "Commercial Invoice",
          badge_code: "CI",
          reference: `CI-${year}-${orderNumClean}`,
          date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          amount: order.total_amount,
          currency: order.currency || "USD",
          source_id: order.id,
          is_gated: false,
        });
      }

      // 3. Invoice / Order Invoice (INV)
      allDocs.push({
        id: `doc_INV_${order.id}`,
        doc_type: "INVOICE",
        type_name: "Invoice",
        badge_code: "INV",
        reference: `INV-${year}-${orderNumClean}`,
        date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: order.total_amount,
        currency: order.currency || "USD",
        source_id: order.id,
        is_gated: false,
      });

      // 4. Order Sheet (OS)
      allDocs.push({
        id: `doc_OS_${order.id}`,
        doc_type: "ORDER_SHEET",
        type_name: "Order Sheet",
        badge_code: "OS",
        reference: `ORD-${year}-${orderNumClean}`,
        date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: order.subtotal || order.total_amount,
        currency: order.currency || "USD",
        source_id: order.id,
        is_gated: false,
      });

      // 5. Packing List (PL) - paid only
      if (isPaid) {
        allDocs.push({
          id: `doc_PL_${order.id}`,
          doc_type: "PACKING_LIST",
          type_name: "Packing List",
          badge_code: "PL",
          reference: `PL-${year}-${orderNumClean}`,
          date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          amount: null,
          currency: order.currency || "USD",
          source_id: order.id,
          is_gated: false,
        });
      }

      // Filter inside group
      let visibleDocs = allDocs;
      const docFilter = (params?.filter || "ALL").toUpperCase();
      if (docFilter !== "ALL") {
        visibleDocs = allDocs.filter((d) => {
          if (docFilter === "INVOICES") return ["PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "INVOICE"].includes(d.doc_type);
          if (docFilter === "QUOTATIONS") return ["QUOTATION", "ORDER_SHEET"].includes(d.doc_type as any);
          if (docFilter === "PACKING") return d.doc_type === "PACKING_LIST";
          return true;
        });
      }

      if (visibleDocs.length > 0) {
        groups.push({
          order: {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.shipping_name || (order as any).customer_name || "Valued Buyer",
            company_name: (order as any).company_name || order.shipping_name || "Valued Buyer",
            order_date: order.placed_at ? order.placed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            total: order.total_amount,
            currency: order.currency || "USD",
            status: order.status || "processing",
            payment_status: order.payment_status || "pending",
            total_documents: allDocs.length,
            visible_documents: visibleDocs.length,
            is_quote: false,
          },
          documents: visibleDocs,
        });
      }
    }

    // Search filter
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      const strippedQ = q.replace(/^(pi|ci|inv|ord|pl|qt)[-_ ]+/i, "").replace(/^(202[4-9])[-_ ]+/i, "");

      groups = groups.filter((g) => {
        const matchesOrder = g.order.order_number.toLowerCase().includes(q) || (Boolean(strippedQ) && g.order.order_number.toLowerCase().includes(strippedQ));
        const matchesCustomer = g.order.customer_name.toLowerCase().includes(q);
        const matchesCompany = (g.order.company_name || "").toLowerCase().includes(q);
        const matchesDoc = g.documents.some((d) => d.reference.toLowerCase().includes(q) || (Boolean(strippedQ) && d.reference.toLowerCase().includes(strippedQ)));
        return matchesOrder || matchesCustomer || matchesCompany || matchesDoc;
      });
    }

    const perPage = params?.per_page || 10;
    const page = params?.page || 1;
    const total = groups.length;
    const start = (page - 1) * perPage;
    const paginated = groups.slice(start, start + perPage);

    return {
      data: paginated,
      meta: {
        current_page: page,
        last_page: Math.ceil(total / perPage) || 1,
        per_page: perPage,
        total_orders: total,
      },
    };
  }

  /**
   * Fetch live carrier tracking status for an order
   */
  async getOrderTracking(orderId: string): Promise<any> {
    if (!isFrontendOnly()) {
      const order = await this.getOrderById(orderId);
      return {
        order_number: order?.order_number || orderId,
        carrier: order?.carrier || "Aramex Express Air",
        tracking_number: order?.tracking_number || "AWB-8801928374",
        status: order?.carrier_status || "In Transit to Destination Airport",
        last_updated: order?.last_carrier_update || "Cleared Export Customs at Dhaka (DAC)",
        direct_url: (order as any)?.direct_tracking_url || getWhatsAppUrl(`Track Order ${order?.order_number || orderId}`),
      };
    }

    const order = mockStore.getOrderById(orderId);
    return {
      order_number: order?.order_number || orderId,
      carrier: order?.carrier || "Aramex Express Air",
      tracking_number: order?.tracking_number || "AWB-8801928374",
      status: order?.carrier_status || "In Transit to Destination Airport",
      last_updated: order?.last_carrier_update || "Cleared Export Customs at Dhaka (DAC)",
      direct_url: order?.direct_tracking_url || getWhatsAppUrl(`Track Order ${order?.order_number}`),
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, _userId: string | number, reason?: string): Promise<boolean> {
    if (!isFrontendOnly()) {
      await apiClient.post(`/orders/${orderId}/cancel`, { reason });
      return true;
    }

    const order = mockStore.getOrderById(orderId);
    if (order) {
      order.status = "cancelled";
      order.status_events?.push({
        id: `ev_${Date.now()}`,
        order_id: order.id,
        event_type: "order_cancelled",
        message: `Order cancelled by user. Reason: ${reason || "Customer request"}`,
        created_at: new Date().toISOString(),
      });
      mockStore.saveOrder(order);
    }
    return true;
  }

  private normalizeOrderRecord(raw: any): OrderRecord {
    const subtotal = raw.subtotal !== undefined
      ? Number(raw.subtotal)
      : raw.subtotal_cents !== undefined
      ? Number(raw.subtotal_cents) / 100
      : 0;

    const shipping = raw.shipping_cost !== undefined
      ? Number(raw.shipping_cost)
      : raw.shipping_cents !== undefined
      ? Number(raw.shipping_cents) / 100
      : 0;

    const tax = raw.tax_amount !== undefined
      ? Number(raw.tax_amount)
      : raw.tax_cents !== undefined
      ? Number(raw.tax_cents) / 100
      : 0;

    const total = raw.total_amount !== undefined
      ? Number(raw.total_amount)
      : raw.total_cents !== undefined
      ? Number(raw.total_cents) / 100
      : subtotal + shipping + tax;

    const items: OrderItemRecord[] = Array.isArray(raw.items)
      ? raw.items.map((i: any) => {
          const unitPrice = i.unit_price !== undefined
            ? Number(i.unit_price)
            : i.unit_price_cents !== undefined
            ? Number(i.unit_price_cents) / 100
            : 0;
          const lineTotal = i.line_total !== undefined
            ? Number(i.line_total)
            : i.line_total_cents !== undefined
            ? Number(i.line_total_cents) / 100
            : unitPrice * (i.quantity || 1);

          return {
            id: String(i.id || ""),
            order_id: String(i.order_id || raw.id || ""),
            product_id: i.product_id ? String(i.product_id) : undefined,
            product_variant_id: i.product_variant_id ? String(i.product_variant_id) : undefined,
            product_name: i.product_name || "Product",
            product_slug: i.product_slug,
            product_image_url: i.product_image_url || "/placeholder.jpg",
            sku: i.sku,
            variant_title: i.variant_title || (i.size ? `Size: ${i.size}` : undefined),
            size: i.size,
            color: i.color,
            package_breakdown: i.package_breakdown,
            unit_price: unitPrice,
            unit_price_cents: Math.round(unitPrice * 100),
            quantity: Number(i.quantity) || 1,
            line_total: lineTotal,
            line_total_cents: Math.round(lineTotal * 100),
          };
        })
      : [];

    return {
      id: String(raw.id || ""),
      order_number: raw.order_number || `AYN-${raw.id || "000"}`,
      user_id: raw.user_id,
      status: raw.status || "pending",
      customer_status: raw.customer_status,
      payment_status: raw.payment_status || "pending",
      fulfillment_status: raw.fulfillment_status || "unfulfilled",
      currency: raw.currency || "USD",
      email: raw.email || "",
      shipping_name: raw.shipping_name || "",
      shipping_phone: raw.shipping_phone || "",
      shipping_company: raw.shipping_company,
      shipping_address1: raw.shipping_address1 || "",
      shipping_address2: raw.shipping_address2,
      shipping_city: raw.shipping_city || "",
      shipping_region: raw.shipping_region || "",
      shipping_postal_code: raw.shipping_postal_code || "",
      shipping_country_code: raw.shipping_country_code || "US",
      shipping_method: raw.shipping_method,
      carrier: raw.carrier,
      tracking_number: raw.tracking_number,
      shipment_id: raw.shipment_id,
      shipment_reference: raw.shipment_reference,
      shipment_label_url: raw.shipment_label_url,
      carrier_status: raw.carrier_status,
      last_carrier_update: raw.last_carrier_update,
      last_shipment_error: raw.last_shipment_error,
      shipping_quote_id: raw.shipping_quote_id,
      shipping_snapshot: raw.shipping_snapshot,
      direct_tracking_url: raw.direct_tracking_url,
      can_create_aramex_shipment: raw.can_create_aramex_shipment,
      payment_method: raw.payment_method || "card",
      payment_proof_url: raw.payment_proof_url,
      notes: raw.notes,
      transport_method: raw.transport_method || raw.shipping_snapshot?.mode,
      shipping_service_type: raw.shipping_service_type || raw.shipping_snapshot?.service_type,
      destination_port: raw.destination_port || raw.shipping_snapshot?.destination_port,
      special_instructions: raw.special_instructions || raw.notes || raw.shipping_snapshot?.special_instructions,
      third_party_notify: raw.third_party_notify || raw.shipping_snapshot?.third_party_notify,
      subtotal,
      subtotal_cents: Math.round(subtotal * 100),
      shipping_cost: shipping,
      shipping_cents: Math.round(shipping * 100),
      tax_amount: tax,
      tax_cents: Math.round(tax * 100),
      discount_amount: Number(raw.discount_amount || 0),
      discount_cents: Math.round(Number(raw.discount_amount || 0) * 100),
      total_amount: total,
      total_cents: Math.round(total * 100),
      placed_at: raw.placed_at || raw.created_at || new Date().toISOString(),
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),
      items,
      status_events: raw.status_events || [],
    };
  }
}

export const orderService = new OrderService();
