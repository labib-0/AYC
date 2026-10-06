import { 
  QuotationRecord, 
  QuotationStatus, 
  CommercialDocument, 
  CommercialDocType 
} from "@/types/b2b";
import { updateRfqStatus } from "./rfq";
import { mockStore, STORAGE_KEYS } from "@/lib/mock-data/mock-store";
import BUSINESS_PROFILE from "@/config/business-profile";
import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

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
  if (!isFrontendOnly()) {
    const res = await apiClient.post<any>("/admin/quotations", {
      rfq_id: data.rfqId,
      buyer_name: data.buyerName,
      buyer_email: data.buyerEmail,
      buyer_phone: data.buyerPhone,
      company_name: data.companyName,
      destination_country: data.destinationCountry,
      destination_city: data.destinationCity,
      shipping_terms: data.shippingTerms,
      payment_terms: data.paymentTerms,
      incoterm: data.incoterm,
      delivery_estimate: data.deliveryEstimate,
      valid_until: data.validUntil,
      admin_notes: data.adminNotes,
      shipping_fee: data.shippingFee,
      discount_total: data.discountTotal,
      items: data.items.map((it) => ({
        product_id: it.productId,
        product_name: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount_amount: it.discountAmount,
      })),
    });
    const created = res?.data || res;
    if (created && (created.id || created.quotation_number || created.quotationNumber)) {
      return created;
    }
    throw new Error("Invalid response received from quotation creation endpoint.");
  }

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
  if (!isFrontendOnly()) {
    try {
      const res = await apiClient.get<any>(`/quotations/${id}`);
      const quote = res?.data || res;
      if (quote && (quote.id || quote.quotation_number || quote.quotationNumber)) {
        return quote;
      }
      return null;
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) return null;
      throw err;
    }
  }

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
  if (!isFrontendOnly()) {
    const res = await apiClient.get<any>("/quotations", { params: filters });
    const list = Array.isArray(res) ? res : res?.data;
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  }

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
  if (!isFrontendOnly()) {
    const res = await apiClient.post<any>(`/quotations/${quotationId}/respond`, {
      response,
      notes,
    });
    const data = res?.data || res;
    if (data && (data.id || data.quotation_number || data.quotationNumber)) {
      return data;
    }
    return null;
  }

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

function normalizeCommercialDocumentPayload(
  raw: any,
  docType: CommercialDocType,
  cleanId: string
): CommercialDocument {
  const docNum = raw.docNumber || raw.doc_number || raw.document_number || `${docType}-${cleanId}`;
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const normalizedItems = rawItems.map((item: any, idx: number) => {
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 1);
    const total = Number(item.total ?? item.line_total ?? item.amount ?? (unitPrice * quantity));
    return {
      id: item.id ? String(item.id) : `item_${idx}`,
      item_no: item.item_no || idx + 1,
      description: item.description || item.product_name || item.name || "Commercial Merchandise",
      sku: item.sku || "AYN-SKU",
      hs_code: item.hs_code || "6105.10.00",
      marks_and_numbers: item.marks_and_numbers,
      product_image_url: item.product_image_url,
      product_images: item.product_images || (item.product_image_url ? [item.product_image_url] : []),
      quantity,
      unitPrice,
      total,
      size: item.size,
      color: item.color,
      package_breakdown: item.package_breakdown,
      details: item.details,
    };
  });

  const subtotal = Number(
    raw.subtotal ??
    raw.goods_value ??
    raw.financials?.subtotal ??
    raw.summary?.subtotal ??
    raw.summary?.goods_value ??
    raw.summary?.fob_amount ??
    normalizedItems.reduce((acc: number, it: { total: number }) => acc + it.total, 0)
  );

  const goods_value = Number(
    raw.goods_value ??
    raw.subtotal ??
    raw.financials?.goods_value ??
    raw.summary?.goods_value ??
    raw.summary?.fob_amount ??
    subtotal
  );

  const grandTotal = Number(
    raw.grandTotal ??
    raw.grand_total ??
    raw.total_payable ??
    raw.financials?.grand_total ??
    raw.summary?.grand_total ??
    raw.summary?.total_cif_amount ??
    subtotal
  );

  const total_payable = Number(
    raw.total_payable ??
    raw.grandTotal ??
    raw.grand_total ??
    raw.financials?.total_payable ??
    raw.summary?.total_payable ??
    raw.summary?.total_cif_amount ??
    grandTotal
  );

  const discount = Number(raw.discount ?? raw.financials?.discount_amount ?? 0);
  const shipping = Number(raw.shipping ?? raw.freight_charge ?? raw.financials?.shipping_charge ?? raw.summary?.freight ?? 0);
  const tax = Number(raw.tax ?? 0);
  const other_charges = Number(raw.other_charges ?? raw.financials?.other_charges ?? 0);

  const buyerAddress = raw.buyerAddress || raw.buyer?.address || [
    raw.buyer?.address1,
    raw.buyer?.address2,
    raw.buyer?.city,
    raw.buyer?.region,
    raw.buyer?.postal_code,
  ].filter(Boolean).join(", ");

  const bankSource = raw.bankDetails || raw.bank_details;

  return {
    id: raw.id || `doc_${docType}_${raw.order_id || cleanId}`,
    docNumber: docNum,
    docType: (raw.docType || raw.doc_type || raw.document_type || docType) as CommercialDocType,
    title: raw.title || `${docType.replace(/_/g, " ")}`,
    date: raw.date || raw.created_at || new Date().toISOString(),
    quotationNumber: raw.quotationNumber || raw.quotation_number,
    rfqNumber: raw.rfqNumber || raw.rfq_number,
    orderNumber: raw.orderNumber || raw.order_number,
    order_id: String(raw.order_id || cleanId),
    related_invoice_number: raw.related_invoice_number,
    pi_number: raw.pi_number,
    order_sheet_number: raw.order_sheet_number,
    packing_list_number: raw.packing_list_number,
    is_payment_verified: Boolean(raw.is_payment_verified),
    is_gated: Boolean(raw.is_gated),
    payment_status: raw.payment_status,
    payment_details: raw.payment_details,
    companyName: raw.companyName || raw.company_name || raw.buyer?.company || raw.buyer?.company_name || raw.buyer?.name || "Consignee",
    buyerName: raw.buyerName || raw.buyer_name || raw.buyer?.name || "Valued Buyer",
    buyerEmail: raw.buyerEmail || raw.buyer_email || raw.buyer?.email || "",
    buyerPhone: raw.buyerPhone || raw.buyer_phone || raw.buyer?.phone,
    buyerAddress: buyerAddress || undefined,
    buyerCountry: raw.buyerCountry || raw.buyer_country || raw.buyer?.country_code || raw.buyer?.country || "US",
    shipping_snapshot: raw.shipping_snapshot,
    items: normalizedItems,
    product_gallery: raw.product_gallery || normalizedItems[0]?.product_images || (normalizedItems[0]?.product_image_url ? [normalizedItems[0].product_image_url] : []),
    packing_cartons: raw.packing_cartons,
    totals_summary: raw.totals_summary,
    subtotal,
    goods_value,
    discount,
    shipping,
    tax,
    other_charges,
    grandTotal,
    total_payable,
    currency: raw.currency || raw.financials?.currency || "USD",
    amount_in_words: raw.amount_in_words,
    paymentTerms: raw.paymentTerms || raw.payment_terms,
    shippingTerms: raw.shippingTerms || raw.shipping_terms,
    incoterm: raw.incoterm,
    validUntil: raw.validUntil || raw.valid_until || raw.validity,
    notes: raw.notes || raw.shipping_note,
    bankDetails: bankSource ? {
      isConfigured: Boolean(bankSource.is_configured ?? bankSource.isConfigured ?? BUSINESS_PROFILE.banking.isConfigured),
      beneficiaryName: bankSource.beneficiary_name || bankSource.beneficiaryName || bankSource.account_title || BUSINESS_PROFILE.banking.accountTitle,
      accountTitle: bankSource.account_title || bankSource.accountTitle || BUSINESS_PROFILE.banking.accountTitle,
      bankName: bankSource.bank_name || bankSource.bankName || BUSINESS_PROFILE.banking.bankName,
      accountNumber: bankSource.account_no || bankSource.account_number || bankSource.accountNumber || BUSINESS_PROFILE.banking.accountNo,
      accountNo: bankSource.account_no || bankSource.account_number || bankSource.accountNumber || BUSINESS_PROFILE.banking.accountNo,
      swiftCode: bankSource.swift_code || bankSource.swiftCode || BUSINESS_PROFILE.banking.swiftCode,
      bankAddress: bankSource.bank_address || bankSource.bankAddress || BUSINESS_PROFILE.banking.bankAddress,
      currency: bankSource.currency || "USD",
      branch: bankSource.branch || bankSource.branch_name,
      notes: bankSource.notes,
    } : undefined,
    exporter: raw.exporter,
    notify_party: raw.notify_party,
    logistics: raw.logistics,
  };
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

  if (!isFrontendOnly()) {
    const isExplicitQuotation = cleanId.startsWith("QT-") || cleanId.startsWith("qt_") || docType.toUpperCase() === "QUOTATION";
    const primaryEndpoint = isExplicitQuotation
      ? `/quotations/${cleanId}/documents/${docType}`
      : `/orders/${cleanId}/documents/${docType}`;

    try {
      const res = await apiClient.get<any>(primaryEndpoint);
      const data = res?.data || res;
      if (data && (data.docNumber || data.doc_number)) {
        return normalizeCommercialDocumentPayload(data, docType, cleanId);
      }
    } catch {
      if (!isExplicitQuotation) {
        try {
          const fallbackRes = await apiClient.get<any>(`/quotations/${cleanId}/documents/${docType}`);
          const fallbackData = fallbackRes?.data || fallbackRes;
          if (fallbackData && (fallbackData.docNumber || fallbackData.doc_number)) {
            return normalizeCommercialDocumentPayload(fallbackData, docType, cleanId);
          }
        } catch {
          // Ignore
        }
      }
    }
    return null;
  }

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
