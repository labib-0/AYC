import { apiClient } from "./api-client";
import { RfqRecord, RfqStatus, RfqMessage } from "@/types/b2b";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

export class RfqService {
  /**
   * Submit new B2B RFQ
   */
  async submitRfq(input: Partial<RfqRecord>): Promise<RfqRecord> {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    const rfqNumber = `RFQ-${year}-${rand}`;
    const id = `rfq_${Date.now()}`;

    const newRecord: RfqRecord = {
      id,
      rfqNumber,
      buyerName: input.buyerName || "",
      buyerEmail: input.buyerEmail || "",
      buyerPhone: input.buyerPhone || "",
      companyName: input.companyName || "",
      businessType: input.businessType || "Wholesaler",
      website: input.website || "",
      taxNumber: input.taxNumber || "",
      destinationCountry: input.destinationCountry || "United States",
      destinationCity: input.destinationCity || "",
      shippingPort: input.shippingPort || "",
      targetDeliveryDate: input.targetDeliveryDate || "",
      requestTitle: input.requestTitle || `RFQ - ${input.items?.length || 1} Items`,
      generalNotes: input.generalNotes || "",
      status: "SUBMITTED",
      items: input.items || [],
      messages: [],
      history: [
        {
          id: `hist_${Date.now()}`,
          rfqId: id,
          status: "SUBMITTED",
          actorName: input.buyerName || "Buyer",
          note: "RFQ request submitted by buyer.",
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>("/rfq", newRecord);
        const item = res?.data || res;
        if (item && item.id) {
          mockStore.saveRfq(item);
          return item;
        }
      } catch {
        // Fallback
      }
    }

    mockStore.saveRfq(newRecord);
    return newRecord;
  }

  /**
   * Get all RFQ records
   */
  async getUserRfqs(): Promise<RfqRecord[]> {
    if (!isFrontendOnly()) {
      try {
        if (apiClient.getToken()) {
          const res = await apiClient.get<any>("/rfq");
          const items = res?.data || res;
          if (Array.isArray(items) && items.length > 0) return items;
        }
      } catch {
        // Fallback
      }
    }

    return mockStore.getRfqs();
  }

  /**
   * Get RFQ by ID
   */
  async getRfqById(id: string): Promise<RfqRecord | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/rfq/${id}`);
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    return mockStore.getRfqById(id);
  }

  /**
   * Update RFQ status
   */
  async updateRfqStatus(
    id: string,
    status: RfqStatus,
    actorName: string = "Admin",
    note?: string
  ): Promise<RfqRecord | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.patch<any>(`/rfq/${id}/status`, { status, note });
        const item = res?.data || res;
        if (item && item.id) {
          mockStore.saveRfq(item);
          return item;
        }
      } catch {
        // Fallback
      }
    }

    return mockStore.updateRfqStatus(id, status, actorName, note);
  }

  /**
   * Add message to RFQ conversation
   */
  async addMessage(
    rfqId: string,
    senderRole: "buyer" | "admin" | "sales",
    senderName: string,
    message: string
  ): Promise<RfqMessage | null> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>(`/rfq/${rfqId}/messages`, {
          senderRole,
          senderName,
          message,
        });
        const item = res?.data || res;
        if (item && item.id) {
          mockStore.addRfqMessage(rfqId, { senderRole, senderName, message });
          return item;
        }
      } catch {
        // Fallback
      }
    }

    return mockStore.addRfqMessage(rfqId, { senderRole, senderName, message });
  }
}

export const rfqService = new RfqService();
