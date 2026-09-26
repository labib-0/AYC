import { RfqRecord, RfqStatus, RfqMessage } from "@/types/b2b";
import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export function getStoredRfqs(): RfqRecord[] {
  return mockStore.getRfqs();
}

export function generateRfqNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const year = new Date().getFullYear();
  return `RFQ-${year}-${rand}`;
}

function mapBackendQuoteToRfq(q: any): RfqRecord {
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
    requestTitle: q.request_title || q.requestTitle || `RFQ - ${q.items?.length || 1} Items`,
    generalNotes: q.general_notes || q.generalNotes || "",
    status: (q.status as RfqStatus) || "SUBMITTED",
    items: Array.isArray(q.items)
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
        }))
      : [],
    messages: Array.isArray(q.messages) ? q.messages : [],
    history: Array.isArray(q.history)
      ? q.history
      : [
          {
            id: `hist_${q.id}`,
            rfqId: String(q.id),
            status: (q.status as RfqStatus) || "SUBMITTED",
            actorName: q.buyer_name || q.buyerName || "Buyer",
            note: "RFQ record created",
            createdAt: q.created_at || q.createdAt || new Date().toISOString(),
          },
        ],
    createdAt: q.created_at || q.createdAt || new Date().toISOString(),
    updatedAt: q.updated_at || q.updatedAt || new Date().toISOString(),
  };
}

export async function createRfq(
  data: Omit<RfqRecord, "id" | "rfqNumber" | "status" | "createdAt" | "updatedAt">
): Promise<RfqRecord> {
  if (!isFrontendOnly()) {
    const res = await apiClient.post<any>("/rfq", data);
    const backendQuote = res?.data || res;
    if (backendQuote && (backendQuote.id || backendQuote.rfq_number)) {
      return mapBackendQuoteToRfq(backendQuote);
    }
    throw new Error("Invalid response received from RFQ submission endpoint.");
  }

  const id = `rfq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const rfqNumber = generateRfqNumber();
  const now = new Date().toISOString();

  const newRfq: RfqRecord = {
    ...data,
    id,
    rfqNumber,
    status: "SUBMITTED",
    messages: data.generalNotes
      ? [
          {
            id: `msg_${Date.now()}`,
            rfqId: id,
            senderRole: "buyer",
            senderName: data.buyerName,
            message: data.generalNotes,
            createdAt: now,
          },
        ]
      : [],
    history: [
      {
        id: `hist_${Date.now()}`,
        rfqId: id,
        status: "SUBMITTED",
        actorName: data.buyerName,
        note: "Request for Quote submitted by buyer.",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return mockStore.saveRfq(newRfq);
}

export async function getAllRfqs(filters?: {
  status?: string;
  country?: string;
  search?: string;
}): Promise<RfqRecord[]> {
  if (!isFrontendOnly()) {
    const res = await apiClient.get<any>("/rfq");
    const list = Array.isArray(res) ? res : res?.data;
    if (Array.isArray(list)) {
      let mapped = list.map(mapBackendQuoteToRfq);
      if (filters?.status && filters.status !== "all") {
        mapped = mapped.filter((r) => r.status === filters.status);
      }
      if (filters?.country && filters.country !== "all") {
        mapped = mapped.filter((r) => r.destinationCountry?.toLowerCase() === filters.country!.toLowerCase());
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        mapped = mapped.filter((r) =>
          r.rfqNumber.toLowerCase().includes(q) ||
          r.buyerName.toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q) ||
          r.destinationCountry.toLowerCase().includes(q)
        );
      }
      return mapped;
    }
    return [];
  }

  const all = mockStore.getRfqs();

  return all.filter((rfq) => {
    if (filters?.status && filters.status !== "all" && rfq.status !== filters.status) {
      return false;
    }
    if (
      filters?.country &&
      filters.country !== "all" &&
      rfq.destinationCountry.toLowerCase() !== filters.country.toLowerCase()
    ) {
      return false;
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      const match =
        rfq.rfqNumber.toLowerCase().includes(q) ||
        rfq.buyerName.toLowerCase().includes(q) ||
        rfq.companyName.toLowerCase().includes(q) ||
        rfq.destinationCountry.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export async function getRfqById(
  id: string,
  userFilter?: { userId?: string | number; email?: string }
): Promise<RfqRecord | null> {
  if (!isFrontendOnly()) {
    try {
      const res = await apiClient.get<any>(`/rfq/${id}`);
      const quote = res?.data || res;
      if (quote && (quote.id || quote.rfq_number)) {
        return mapBackendQuoteToRfq(quote);
      }
      return null;
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) return null;
      throw err;
    }
  }

  const rfq = mockStore.getRfqById(id);
  if (rfq && userFilter) {
    const isOwner =
      (userFilter.userId !== undefined && String(rfq.userId) === String(userFilter.userId)) ||
      (userFilter.email !== undefined && rfq.buyerEmail && rfq.buyerEmail.toLowerCase() === userFilter.email.toLowerCase());
    if (!isOwner) return null;
  }
  return rfq;
}

export async function updateRfqStatus(
  id: string,
  status: RfqStatus,
  actorName: string = "Admin",
  note?: string
): Promise<RfqRecord | null> {
  if (!isFrontendOnly()) {
    const res = await apiClient.patch<any>(`/rfq/${id}/status`, { status, actor_name: actorName, note });
    const data = res?.data || res;
    if (data && (data.id || data.rfq_number)) {
      return mapBackendQuoteToRfq(data);
    }
    return null;
  }
  return mockStore.updateRfqStatus(id, status, actorName, note);
}

export async function addRfqMessage(
  rfqId: string,
  senderRole: "buyer" | "admin" | "sales",
  senderName: string,
  message: string
): Promise<RfqMessage | null> {
  if (!isFrontendOnly()) {
    const res = await apiClient.post<any>(`/rfq/${rfqId}/messages`, {
      message,
      sender_name: senderName,
    });
    return res?.data || res || null;
  }
  return mockStore.addRfqMessage(rfqId, {
    senderRole,
    senderName,
    message,
  });
}
