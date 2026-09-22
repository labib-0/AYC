import { 
  QuotationRecord, 
  QuotationStatus, 
  CommercialDocument, 
  CommercialDocType 
} from "@/types/b2b";
import { updateRfqStatus } from "./rfq";
import { mockStore, STORAGE_KEYS } from "@/lib/mock-data/mock-store";
import BUSINESS_PROFILE from "@/config/business-profile";

export function getStoredQuotations(): QuotationRecord[] {
  return mockStore.getQuotations();
}

function persistQuotations(quotes: QuotationRecord[]) {
  if (typeof window !== "undefined") {
    try {
      (mockStore as any).setItem(STORAGE_KEYS.QUOTATIONS, quotes);
    } catch {
      // Ignore
    }
  }
}

export function generateQuotationNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const year = new Date().getFullYear();
  return `QT-${year}-${rand}`;
}

export function generatePiNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const year = new Date().getFullYear();
  return `PI-${year}-${rand}`;
}

export async function createQuotation(
  data: Omit<QuotationRecord, "id" | "quotationNumber" | "revisionNumber" | "status" | "createdAt" | "updatedAt">
): Promise<QuotationRecord> {
  const id = `qt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const quotationNumber = generateQuotationNumber();
  const now = new Date().toISOString();

  const newQuote: QuotationRecord = {
    ...data,
    id,
    quotationNumber,
    revisionNumber: 1,
    status: "READY",
    createdAt: now,
    updatedAt: now,
  };

  mockStore.saveQuotation(newQuote);

  // Link quotation to RFQ and update RFQ status to QUOTATION_PREPARED
  const rfq = mockStore.getRfqById(data.rfqId);
  if (rfq) {
    rfq.quotationId = newQuote.id;
    mockStore.saveRfq(rfq);
  }
  await updateRfqStatus(data.rfqId, "QUOTATION_PREPARED", "Sales Admin", `Quotation ${quotationNumber} prepared.`);

  return newQuote;
}

export async function createQuotationRevision(
  quotationId: string,
  revisedData: Partial<QuotationRecord>
): Promise<QuotationRecord | null> {
  const all = getStoredQuotations();
  const index = all.findIndex((q) => q.id === quotationId || q.quotationNumber === quotationId);
  if (index === -1) return null;

  const current = all[index];
  const now = new Date().toISOString();
  const nextRev = (current.revisionNumber || 1) + 1;

  const revisedQuote: QuotationRecord = {
    ...current,
    ...revisedData,
    id: `qt_${Date.now()}_rev${nextRev}`,
    revisionNumber: nextRev,
    status: "READY",
    updatedAt: now,
  };

  const updated = [revisedQuote, ...all];
  persistQuotations(updated);

  await updateRfqStatus(current.rfqId, "NEGOTIATION", "Sales Admin", `Quotation ${current.quotationNumber} revised to Rev.${nextRev}.`);
  return revisedQuote;
}

export async function getQuotationById(
  id: string,
  userFilter?: { email?: string; companyName?: string }
): Promise<QuotationRecord | null> {
  const all = getStoredQuotations();
  const found = all.find((q) => q.id === id || q.quotationNumber === id);
  if (found && userFilter) {
    const matchesEmail = userFilter.email && found.buyerEmail && found.buyerEmail.toLowerCase() === userFilter.email.toLowerCase();
    const matchesCompany = userFilter.companyName && found.companyName && found.companyName.toLowerCase() === userFilter.companyName.toLowerCase();
    if (!matchesEmail && !matchesCompany) {
      return null;
    }
  }
  return found || null;
}

export async function getQuotationByRfqId(
  rfqId: string,
  userFilter?: { email?: string; companyName?: string }
): Promise<QuotationRecord | null> {
  const all = getStoredQuotations();
  const found = all.find((q) => q.rfqId === rfqId);
  if (found && userFilter) {
    const matchesEmail = userFilter.email && found.buyerEmail && found.buyerEmail.toLowerCase() === userFilter.email.toLowerCase();
    const matchesCompany = userFilter.companyName && found.companyName && found.companyName.toLowerCase() === userFilter.companyName.toLowerCase();
    if (!matchesEmail && !matchesCompany) {
      return null;
    }
  }
  return found || null;
}

export async function getAllQuotations(filters?: {
  status?: string;
  search?: string;
}): Promise<QuotationRecord[]> {
  const all = getStoredQuotations();

  return all.filter((quote) => {
    if (filters?.status && filters.status !== "all" && quote.status !== filters.status) {
      return false;
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      const match =
        quote.quotationNumber.toLowerCase().includes(q) ||
        quote.rfqNumber.toLowerCase().includes(q) ||
        quote.buyerName.toLowerCase().includes(q) ||
        quote.companyName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

/**
 * Handle Buyer's response to an official quotation (Accept, Reject, Request Changes)
 */
export async function buyerRespondToQuotation(
  quotationId: string,
  response: "accept" | "reject" | "request_changes",
  notes?: string
): Promise<QuotationRecord | null> {
  const all = getStoredQuotations();
  const index = all.findIndex((q) => q.id === quotationId || q.quotationNumber === quotationId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const current = all[index];

  let newStatus: QuotationStatus = "VIEWED";
  if (response === "accept") {
    newStatus = "ACCEPTED";
    const piNum = generatePiNumber();
    current.proformaInvoiceId = piNum;
    await updateRfqStatus(current.rfqId, "ACCEPTED", current.buyerName, `Buyer accepted quotation ${current.quotationNumber}. Generated ${piNum}.`);
  } else if (response === "reject") {
    newStatus = "REJECTED";
    current.rejectionReason = notes || "No specific reason provided.";
    await updateRfqStatus(current.rfqId, "REJECTED", current.buyerName, `Buyer rejected quotation: ${notes}`);
  } else if (response === "request_changes") {
    newStatus = "NEGOTIATION";
    await updateRfqStatus(current.rfqId, "NEGOTIATION", current.buyerName, `Buyer requested changes: ${notes}`);
  }

  current.status = newStatus;
  current.updatedAt = now;
  all[index] = current;

  persistQuotations(all);
  return current;
}

/**
 * Generate standardized Commercial Document layout (Quotation, PI, Order Sheet, Invoice, Packing List, Chalan)
 * Supports both official Quotes and Orders.
 */
export async function getCommercialDocument(
  docType: CommercialDocType,
  id: string,
  userFilter?: { userId?: string | number; email?: string }
): Promise<CommercialDocument | null> {
  // Check if ID refers to an Order
  const cleanId = id.startsWith("order_") ? id.replace("order_", "") : id;

  try {
    const { orderService } = await import("@/services/order.service");
    const orderDoc = await orderService.getOrderCommercialDocument(cleanId, docType);
    if (orderDoc && (orderDoc.doc_number || orderDoc.document_number)) {
      if (userFilter?.email && orderDoc.buyer?.email) {
        if (orderDoc.buyer.email.toLowerCase() !== userFilter.email.toLowerCase()) {
          return null;
        }
      }
      const docNum = orderDoc.doc_number || orderDoc.document_number;
      return {
        id: orderDoc.id || `doc_${docType}_${orderDoc.order_id || cleanId}`,
        docNumber: docNum,
        docType: (orderDoc.doc_type || orderDoc.document_type || docType) as CommercialDocType,
        title: orderDoc.title,
        date: orderDoc.date,
        orderNumber: orderDoc.order_number,
        order_id: orderDoc.order_id || cleanId,
        companyName: orderDoc.buyer?.company || orderDoc.buyer?.company_name || orderDoc.buyer?.name || "Consignee",
        buyerName: orderDoc.buyer?.name || "Valued Buyer",
        buyerEmail: orderDoc.buyer?.email || "",
        buyerPhone: orderDoc.buyer?.phone,
        buyerAddress: orderDoc.buyer?.address || [
          orderDoc.buyer?.address1,
          orderDoc.buyer?.address2,
          orderDoc.buyer?.city,
          orderDoc.buyer?.region,
          orderDoc.buyer?.postal_code,
        ].filter(Boolean).join(", "),
        buyerCountry: orderDoc.buyer?.country_code || "US",
        shipping_snapshot: orderDoc.shipping_snapshot,
        items: (orderDoc.items || []).map((item: any) => ({
          description: item.description || item.product_name,
          sku: item.sku || "AYN-SKU",
          product_image_url: item.product_image_url,
          product_images: item.product_images || (item.product_image_url ? [item.product_image_url] : []),
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? item.unit_price,
          total: item.total ?? item.line_total ?? item.amount,
          size: item.size,
          color: item.color,
          package_breakdown: item.package_breakdown,
          details: item.details,
        })),
        product_gallery: orderDoc.product_gallery || orderDoc.items?.[0]?.product_images || (orderDoc.items?.[0]?.product_image_url ? [orderDoc.items[0].product_image_url] : []),
        subtotal: orderDoc.financials?.subtotal ?? orderDoc.summary?.subtotal ?? orderDoc.summary?.goods_value ?? orderDoc.summary?.fob_amount ?? 0,
        goods_value: orderDoc.financials?.goods_value ?? orderDoc.summary?.goods_value ?? orderDoc.summary?.fob_amount ?? orderDoc.summary?.subtotal ?? 0,
        discount: orderDoc.financials?.discount_amount ?? 0,
        shipping: orderDoc.financials?.shipping_charge ?? orderDoc.summary?.freight ?? 0,
        tax: 0,
        other_charges: orderDoc.financials?.other_charges ?? 0,
        grandTotal: orderDoc.financials?.grand_total ?? orderDoc.summary?.grand_total ?? orderDoc.summary?.total_cif_amount ?? 0,
        total_payable: orderDoc.financials?.total_payable ?? orderDoc.summary?.total_payable ?? orderDoc.summary?.total_cif_amount ?? orderDoc.summary?.grand_total ?? 0,
        currency: orderDoc.financials?.currency || orderDoc.currency || "USD",
        paymentTerms: orderDoc.payment_terms,
        shippingTerms: orderDoc.shipping_terms,
        incoterm: orderDoc.incoterm,
        validUntil: orderDoc.valid_until || orderDoc.validity,
        notes: orderDoc.notes || orderDoc.shipping_note,
        bankDetails: {
          isConfigured: Boolean(orderDoc.bank_details?.is_configured ?? BUSINESS_PROFILE.banking.isConfigured),
          beneficiaryName: orderDoc.bank_details?.account_title || orderDoc.bank_details?.beneficiary_name || BUSINESS_PROFILE.banking.accountTitle,
          accountTitle: orderDoc.bank_details?.account_title || BUSINESS_PROFILE.banking.accountTitle,
          bankName: orderDoc.bank_details?.bank_name || BUSINESS_PROFILE.banking.bankName,
          accountNumber: orderDoc.bank_details?.account_no || orderDoc.bank_details?.account_number || BUSINESS_PROFILE.banking.accountNo,
          accountNo: orderDoc.bank_details?.account_no || orderDoc.bank_details?.account_number || BUSINESS_PROFILE.banking.accountNo,
          swiftCode: orderDoc.bank_details?.swift_code || BUSINESS_PROFILE.banking.swiftCode,
          bankAddress: orderDoc.bank_details?.bank_address || BUSINESS_PROFILE.banking.bankAddress,
          branch: orderDoc.bank_details?.branch || BUSINESS_PROFILE.banking.branch,
          routing_no: null,
          routingNumber: null,
        },
      };
    }
  } catch {
    // If not found in orders, proceed
  }

  // Check if ID is a product ID or slug for an OFFER_SHEET
  if (docType === "ORDER_SHEET") {
    try {
      const { getProductBySlugOrId } = await import("@/lib/services/products");
      const prod = await getProductBySlugOrId(cleanId);
      if (prod) {
        const basePrice = Number(prod.wholesalePrice || (prod as any).price) || 12;
        const moq = prod.moq || 10;
        const prodImages = prod.images && prod.images.length > 0 ? prod.images : ((prod as any).image ? [(prod as any).image] : []);
        return {
          id: `doc_offer_${prod.id}`,
          docNumber: `OS-${(prod.sku || prod.id).toUpperCase()}`,
          docType: "ORDER_SHEET",
          title: "OFFICIAL COMMERCIAL OFFER SHEET",
          date: new Date().toISOString().slice(0, 10),
          companyName: "Commercial Buyer",
          buyerName: "Prospective Consignee",
          buyerEmail: "buyer@example.com",
          buyerCountry: "Worldwide Export",
          product_gallery: prodImages,
          items: [
            {
              description: prod.name,
              sku: prod.sku || "AYN-SKU",
              product_image_url: prodImages[0],
              product_images: prodImages,
              quantity: moq,
              unitPrice: basePrice,
              total: basePrice * moq,
              details: `Material: ${prod.material || "100% Cotton"} • MOQ: ${moq} pcs`,
            },
          ],
          subtotal: basePrice * moq,
          goods_value: basePrice * moq,
          discount: 0,
          shipping: 0, // Strictly zero shipping on offer sheet
          tax: 0,
          grandTotal: basePrice * moq,
          total_payable: basePrice * moq,
          currency: "USD",
          paymentTerms: "100% Advance T/T or L/C at sight",
          shippingTerms: "FOB Dhaka (Shipping negotiated separately)",
          incoterm: "FOB",
          validUntil: "30 Days from date of issuance",
          notes: "Commercial Offer only — Not an invoice. Valid for 30 days. FOB Dhaka Port / Airport.",
          bankDetails: {
            isConfigured: false,
            beneficiaryName: BUSINESS_PROFILE.banking.accountTitle,
            accountTitle: BUSINESS_PROFILE.banking.accountTitle,
            bankName: BUSINESS_PROFILE.banking.bankName,
            accountNumber: BUSINESS_PROFILE.banking.accountNo,
            accountNo: BUSINESS_PROFILE.banking.accountNo,
            swiftCode: BUSINESS_PROFILE.banking.swiftCode,
            bankAddress: BUSINESS_PROFILE.banking.bankAddress,
          },
        };
      }
    } catch {
      // ignore
    }
  }

  const quote = await getQuotationById(id, userFilter ? { email: userFilter.email } : undefined);
  if (!quote) return null;

  let title = "COMMERCIAL QUOTATION";
  let docNumber = quote.quotationNumber;

  if (docType === "PROFORMA_INVOICE") {
    title = "PROFORMA INVOICE";
    docNumber = quote.proformaInvoiceId || `PI-2026-${quote.quotationNumber.split("-")[2] || "0001"}`;
  } else if (docType === "ORDER_SHEET") {
    title = "COMMERCIAL ORDER SHEET";
    docNumber = `ORD-2026-${quote.quotationNumber.split("-")[2] || "0001"}`;
  } else if (docType === "COMMERCIAL_INVOICE") {
    title = "COMMERCIAL INVOICE";
    docNumber = `INV-2026-${quote.quotationNumber.split("-")[2] || "0001"}`;
  } else if (docType === "PACKING_LIST") {
    title = "PACKING LIST";
    docNumber = `PL-2026-${quote.quotationNumber.split("-")[2] || "0001"}`;
  } else if (docType === "CHALAN") {
    title = "DELIVERY CHALAN / GATE PASS";
    docNumber = `CH-2026-${quote.quotationNumber.split("-")[2] || "0001"}`;
  }

  return {
    id: `doc_${docType}_${quote.id}`,
    docNumber,
    docType,
    title,
    date: quote.createdAt.split("T")[0],
    quotationNumber: quote.quotationNumber,
    rfqNumber: quote.rfqNumber,
    companyName: quote.companyName,
    buyerName: quote.buyerName,
    buyerEmail: quote.buyerEmail,
    buyerPhone: quote.buyerPhone,
    buyerAddress: `${quote.destinationCity}, ${quote.destinationCountry}`,
    buyerCountry: quote.destinationCountry,
    items: quote.items.map((item) => ({
      description: `${item.productName} (${item.variantTitle || "Standard"})`,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.lineTotal,
      details: item.variantTitle,
    })),
    subtotal: quote.subtotal,
    goods_value: quote.subtotal,
    discount: quote.discountTotal,
    shipping: quote.shippingFee,
    tax: quote.taxAmount,
    other_charges: 0,
    grandTotal: quote.grandTotal,
    total_payable: quote.grandTotal,
    currency: quote.currency,
    paymentTerms: quote.paymentTerms,
    shippingTerms: quote.shippingTerms,
    incoterm: quote.incoterm,
    validUntil: quote.validUntil,
    notes: quote.adminNotes,
    bankDetails: {
      isConfigured: BUSINESS_PROFILE.banking.isConfigured,
      beneficiaryName: BUSINESS_PROFILE.banking.accountTitle,
      accountTitle: BUSINESS_PROFILE.banking.accountTitle,
      bankName: BUSINESS_PROFILE.banking.bankName,
      accountNumber: BUSINESS_PROFILE.banking.accountNo,
      accountNo: BUSINESS_PROFILE.banking.accountNo,
      swiftCode: BUSINESS_PROFILE.banking.swiftCode,
      bankAddress: BUSINESS_PROFILE.banking.bankAddress,
      branch: BUSINESS_PROFILE.banking.branch,
      routing_no: null,
      routingNumber: null,
    },
  };
}
