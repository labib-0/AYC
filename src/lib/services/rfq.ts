import { RfqRecord, RfqStatus, RfqMessage } from "@/types/b2b";
import { mockStore } from "@/lib/mock-data/mock-store";

export function getStoredRfqs(): RfqRecord[] {
  return mockStore.getRfqs();
}

export function generateRfqNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const year = new Date().getFullYear();
  return `RFQ-${year}-${rand}`;
}

export async function createRfq(
  data: Omit<RfqRecord, "id" | "rfqNumber" | "status" | "createdAt" | "updatedAt">
): Promise<RfqRecord> {
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

export async function getRfqById(id: string): Promise<RfqRecord | null> {
  return mockStore.getRfqById(id);
}

export async function updateRfqStatus(
  id: string,
  status: RfqStatus,
  actorName: string = "Admin",
  note?: string
): Promise<RfqRecord | null> {
  return mockStore.updateRfqStatus(id, status, actorName, note);
}

export async function addRfqMessage(
  rfqId: string,
  senderRole: "buyer" | "admin" | "sales",
  senderName: string,
  message: string
): Promise<RfqMessage | null> {
  return mockStore.addRfqMessage(rfqId, {
    senderRole,
    senderName,
    message,
  });
}
