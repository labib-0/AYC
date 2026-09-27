import { RfqRecord, RfqStatus, QuotationRecord, CommercialDocument, CommercialDocType } from "@/types/b2b";
import { apiClient } from "@/services/api-client";
import { mockStore } from "@/lib/mock-data/mock-store";
import { isFrontendOnly } from "@/lib/frontend-mode";

export interface AdminRfqQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  date_preset?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface RfqSummaryMetrics {
  totalRfqs: number;
  received: number;
  underReview: number;
  approved: number;
  quotationGenerated: number;
}

export function mapBackendQuoteToRfq(q: any): RfqRecord {
  const items = Array.isArray(q.items)
    ? q.items.map((it: any) => ({
        id: String(it.id),
        productId: it.product_id ? String(it.product_id) : (it.productId || ""),
        productName: it.product_name || it.productName || "Product",
        productSlug: it.product_slug || it.productSlug || "",
        brand: it.brand || "Ayaan",
        sku: it.sku || "",
        image: it.image_url || it.image || "/placeholder.jpg",
        selectedColor: it.selected_color || it.selectedColor,
        selectedSize: it.selected_size || it.selectedSize,
        quantity: Number(it.quantity || 1),
        moq: Number(it.moq || 1),
        unitPrice: Number(it.unit_price || it.unitPrice || 0),
        targetPrice: it.target_price ? Number(it.target_price) : (it.targetPrice ? Number(it.targetPrice) : undefined),
        buyerNotes: it.buyer_notes || it.buyerNotes,
        package_breakdown: it.package_breakdown || it.packageBreakdown,
        packageBreakdown: it.package_breakdown || it.packageBreakdown,
      }))
    : [];

  return {
    id: String(q.id),
    rfqNumber: q.rfq_number || q.rfqNumber || `RFQ-${q.id}`,
    userId: q.user_id ? String(q.user_id) : (q.userId ? String(q.userId) : undefined),
    buyerName: q.buyer_name || q.buyerName || "",
    buyerEmail: q.buyer_email || q.buyerEmail || "",
    buyerPhone: q.buyer_phone || q.buyerPhone || "",
    companyName: q.company_name || q.companyName || "",
    businessType: q.business_type || q.businessType || "Wholesaler",
    website: q.website || "",
    taxNumber: q.tax_number || q.taxNumber || "",
    destinationCountry: q.destination_country || q.destinationCountry || "United States",
    destinationCity: q.destination_city || q.destinationCity || "",
    shippingPort: q.shipping_port || q.shippingPort || "",
    targetDeliveryDate: q.target_delivery_date || q.targetDeliveryDate || "",
    requestTitle: q.request_title || q.requestTitle || `RFQ - ${items.length || 1} Items`,
    generalNotes: q.general_notes || q.generalNotes || "",
    status: (q.status as RfqStatus) || "SUBMITTED",
    items,
    messages: Array.isArray(q.messages) ? q.messages : [],
    history: Array.isArray(q.history) ? q.history : [],
    createdAt: q.created_at || q.createdAt || new Date().toISOString(),
    updatedAt: q.updated_at || q.updatedAt || new Date().toISOString(),
    quotationId: q.quotations?.[0]?.id ? String(q.quotations[0].id) : (q.latest_quotation?.id ? String(q.latest_quotation.id) : q.quotationId),
  };
}

export class AdminRfqService {
  /**
   * Get KPI Summary Counts
   */
  async getRfqSummary(): Promise<RfqSummaryMetrics> {
    try {
      const res = await this.getRfqs({ per_page: 500 });
      const list = res.data || [];
      return {
        totalRfqs: res.total !== undefined ? res.total : list.length,
        received: list.filter((r) => r.status === "SUBMITTED" || r.status === "RFQ_RECEIVED").length,
        underReview: list.filter((r) => r.status === "UNDER_REVIEW").length,
        approved: list.filter((r) => r.status === "APPROVED").length,
        quotationGenerated: list.filter(
          (r) =>
            r.status === "QUOTATION_GENERATED" ||
            r.status === "QUOTATION_APPROVED" ||
            r.status === "QUOTATION_PREPARED" ||
            r.status === "PAID"
        ).length,
      };
    } catch {
      return {
        totalRfqs: 0,
        received: 0,
        underReview: 0,
        approved: 0,
        quotationGenerated: 0,
      };
    }
  }

  /**
   * Get Paginated & Filtered RFQs
   */
  async getRfqs(params?: AdminRfqQueryParams): Promise<{
    data: RfqRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    if (!isFrontendOnly()) {
      try {
        const queryParams: Record<string, any> = {};
        if (params?.page) queryParams.page = params.page;
        if (params?.per_page) queryParams.per_page = params.per_page;
        if (params?.search) queryParams.search = params.search;
        if (params?.status && params.status !== "all") queryParams.status = params.status;
        if (params?.date_preset && params.date_preset !== "all") queryParams.date_filter = params.date_preset;
        if (params?.date_from) queryParams.from_date = params.date_from;
        if (params?.date_to) queryParams.to_date = params.date_to;
        if (params?.sort_by) queryParams.sort_by = params.sort_by;
        if (params?.sort_order) queryParams.sort_order = params.sort_order;

        const res = await apiClient.get<any>("/admin/rfqs", { params: queryParams });
        const body = res?.data || res;

        // Check if paginated response format
        if (body?.data && Array.isArray(body.data)) {
          return {
            data: body.data.map(mapBackendQuoteToRfq),
            current_page: body.meta?.current_page || 1,
            last_page: body.meta?.last_page || 1,
            total: body.meta?.total !== undefined ? Number(body.meta.total) : body.data.length,
            per_page: body.meta?.per_page || (params?.per_page ?? 20),
          };
        }

        // Flat array fallback
        const items = Array.isArray(body) ? body : [];
        return {
          data: items.map(mapBackendQuoteToRfq),
          current_page: 1,
          last_page: 1,
          total: items.length,
          per_page: params?.per_page ?? 20,
        };
      } catch (err) {
        console.warn("Failed to fetch RFQs from API:", err);
      }
    }

    // Mock store fallback
    const all = mockStore.getRfqs();
    let filtered = [...all];

    if (params?.status && params.status !== "all") {
      filtered = filtered.filter((r) => r.status.toUpperCase() === params.status!.toUpperCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.rfqNumber.toLowerCase().includes(q) ||
          r.buyerName.toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q) ||
          r.buyerEmail.toLowerCase().includes(q)
      );
    }

    const perPage = params?.per_page ?? 20;
    const page = params?.page ?? 1;
    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    return {
      data: paginated,
      current_page: page,
      last_page: lastPage,
      total,
      per_page: perPage,
    };
  }

  /**
   * Get single RFQ by ID
   */
  async getRfqById(id: string | number): Promise<RfqRecord | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/rfqs/${id}`);
        const data = res?.data || res;
        if (data && (data.id || data.rfq_number)) {
          return mapBackendQuoteToRfq(data);
        }
      } catch (err: any) {
        if (err?.status === 404) return null;
        console.warn("Failed to load RFQ by ID:", err);
      }
    }
    return mockStore.getRfqById(String(id));
  }

  /**
   * Update RFQ status
   */
  async updateRfqStatus(id: string | number, status: RfqStatus, note?: string): Promise<RfqRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.patch<any>(`/admin/rfqs/${id}/status`, {
        status,
        note,
      });
      const data = res?.data || res;
      return mapBackendQuoteToRfq(data);
    }
    const updated = mockStore.updateRfqStatus(String(id), status, "Admin", note);
    if (!updated) throw new Error("RFQ not found in mock store");
    return updated;
  }

  /**
   * Review RFQ (Transitions from SUBMITTED to UNDER_REVIEW)
   */
  async reviewRfq(id: string | number, note?: string): Promise<RfqRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/rfqs/${id}/review`, { note });
      const data = res?.data || res;
      return mapBackendQuoteToRfq(data);
    }
    return this.updateRfqStatus(id, "UNDER_REVIEW", note || "RFQ moved to review");
  }

  /**
   * Approve RFQ (Transitions from UNDER_REVIEW to APPROVED)
   */
  async approveRfq(id: string | number, note?: string): Promise<RfqRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/rfqs/${id}/approve`, { note });
      const data = res?.data || res;
      return mapBackendQuoteToRfq(data);
    }
    return this.updateRfqStatus(id, "APPROVED", note || "RFQ approved for quotation generation");
  }

  /**
   * Create Authoritative Quotation linked to RFQ
   */
  async createQuotation(data: {
    rfq_id: string | number;
    buyer_name: string;
    buyer_email: string;
    buyer_phone?: string;
    company_name: string;
    destination_country?: string;
    destination_city?: string;
    shipping_fee: number;
    admin_notes?: string;
    items: Array<{
      product_id: string | number;
      product_name?: string;
      sku?: string;
      quantity: number;
      unit_price: number;
      package_breakdown?: any;
    }>;
  }): Promise<QuotationRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/admin/quotations", data);
      return res?.data || res;
    }
    const { createQuotation } = await import("@/lib/services/quotations");
    return createQuotation({
      rfqId: String(data.rfq_id),
      rfqNumber: `RFQ-${data.rfq_id}`,
      buyerName: data.buyer_name,
      buyerEmail: data.buyer_email,
      buyerPhone: data.buyer_phone,
      companyName: data.company_name,
      destinationCountry: data.destination_country || "United States",
      destinationCity: data.destination_city || "",
      currency: "USD",
      currencySymbol: "$",
      shippingFee: data.shipping_fee,
      discountTotal: 0,
      taxAmount: 0,
      subtotal: data.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0),
      grandTotal: data.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0) + data.shipping_fee,
      paymentTerms: "100% Advance T/T or L/C at sight",
      shippingTerms: "FOB Chittagong",
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      items: data.items.map((it, idx) => ({
        id: `qi_${idx}`,
        productId: String(it.product_id),
        productName: it.product_name || "Product",
        sku: it.sku || "",
        quantity: it.quantity,
        unitPrice: it.unit_price,
        lineTotal: it.quantity * it.unit_price,
        package_breakdown: it.package_breakdown,
      })),
    });
  }

  /**
   * Update Quotation Line Items, Unit Prices, or Shipping Fee
   */
  async updateQuotation(
    id: string | number,
    data: {
      shipping_fee?: number;
      items?: Array<{
        product_id: string | number;
        product_name?: string;
        sku?: string;
        quantity: number;
        unit_price: number;
        package_breakdown?: any;
      }>;
    }
  ): Promise<QuotationRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/admin/quotations/${id}`, data);
      return res?.data || res;
    }
    const { getStoredQuotations } = await import("@/lib/services/quotations");
    const quotes = getStoredQuotations();
    const target = quotes.find((q) => q.id === String(id) || q.quotationNumber === String(id));
    if (!target) throw new Error("Quotation not found");
    if (data.shipping_fee !== undefined) target.shippingFee = data.shipping_fee;
    target.grandTotal = target.subtotal + target.shippingFee;
    return target;
  }

  /**
   * Approve Quotation (Snapshots authoritative values, generates PI)
   */
  async approveQuotation(id: string | number): Promise<QuotationRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/quotations/${id}/approve`);
      return res?.data || res;
    }
    const { getStoredQuotations } = await import("@/lib/services/quotations");
    const quotes = getStoredQuotations();
    const target = quotes.find((q) => q.id === String(id) || q.quotationNumber === String(id));
    if (!target) throw new Error("Quotation not found");
    target.status = "ACCEPTED";
    target.proformaInvoiceId = `PI-${target.quotationNumber}`;
    return target;
  }

  /**
   * Update Payment Status (Pending -> Paid)
   */
  async updatePaymentStatus(id: string | number, paymentStatus: "PAID" | "PENDING"): Promise<QuotationRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/quotations/${id}/payment`, {
        payment_status: paymentStatus,
      });
      return res?.data || res;
    }
    const { getStoredQuotations } = await import("@/lib/services/quotations");
    const quotes = getStoredQuotations();
    const target = quotes.find((q) => q.id === String(id) || q.quotationNumber === String(id));
    if (!target) throw new Error("Quotation not found");
    target.status = (paymentStatus === "PAID" ? "PAID" : "ACCEPTED") as any;
    return target;
  }

  /**
   * Retrieve Commercial Document Snapshot
   */
  async getCommercialDocument(type: CommercialDocType, quotationId: string | number): Promise<CommercialDocument> {
    const res = await apiClient.get<any>(`/admin/quotations/${quotationId}/document/${type}`);
    return res?.data || res;
  }
}

export const adminRfqService = new AdminRfqService();
