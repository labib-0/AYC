import { OrderRecord } from "@/services/order.service";
import BUSINESS_PROFILE from "@/config/business-profile";
import { mockStore } from "@/lib/mock-data/mock-store";

export function generateMockDocument(order: OrderRecord, docType: string, isAdmin: boolean = false): any {
  const isPaid = order.payment_status === "paid" || order.payment_status === "completed";

  // Security & Payment gating: Commercial Invoice and Packing List require payment
  if (!isPaid && !isAdmin && (docType === "COMMERCIAL_INVOICE" || docType === "PACKING_LIST")) {
    return {
      error: "PAYMENT_REQUIRED",
      message: "Commercial Invoice and Packing List are available after payment confirmation.",
      document_type: docType,
      order_number: order.order_number,
      is_locked: true,
    };
  }

  const items = order.items || [];
  const totalPcs = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const cartonCount = Math.max(1, Math.ceil(totalPcs / 50));
  const grossWeight = Math.round((totalPcs * 0.35 + cartonCount * 1.2) * 10) / 10;
  const netWeight = Math.round((totalPcs * 0.32) * 10) / 10;
  const totalCbm = Math.round((cartonCount * 0.084) * 1000) / 1000;

  const header = {
    company_name: BUSINESS_PROFILE.name,
    business_subtitle: BUSINESS_PROFILE.description,
    address: BUSINESS_PROFILE.address.formatted,
    established_year: BUSINESS_PROFILE.establishedYear,
    phone: null,
    email: BUSINESS_PROFILE.contact.email || "export@ayaanclothing.com",
    whatsapp: BUSINESS_PROFILE.contact.whatsappUrl,
    country: "Bangladesh",
  };

  const buyer = {
    name: order.shipping_name || "Valued Buyer",
    company: order.shipping_company || order.shipping_name,
    address: `${order.shipping_address1 || ""}, ${order.shipping_city || ""}, ${order.shipping_postal_code || ""}, ${order.shipping_country_code || "US"}`,
    email: order.email,
    phone: order.shipping_phone || "",
  };

  switch (docType) {
    case "ORDER_SHEET": {
      const orderSheetItems = items.map((i, idx) => {
        const prodId = (i as any).product_id;
        const prod = prodId ? mockStore.getProductByIdOrSlug(String(prodId)) : null;
        const prodImages = (i as any).images || (i as any).product_images || prod?.images || (i.product_image_url ? [i.product_image_url] : []);
        return {
          serial: idx + 1,
          description: i.product_name,
          product_name: i.product_name,
          sku: i.sku || `AYN-${idx + 100}`,
          size: i.size || "Standard Assorted",
          quantity: i.quantity,
          unit_price: i.unit_price,
          unitPrice: i.unit_price,
          line_total: i.line_total,
          total: i.line_total,
          product_image_url: i.product_image_url || prodImages[0],
          product_images: prodImages,
        };
      });

      const primaryItem = orderSheetItems[0];
      const topGallery = primaryItem?.product_images && primaryItem.product_images.length > 0
        ? primaryItem.product_images
        : (primaryItem?.product_image_url ? [primaryItem.product_image_url] : []);

      // Offer Sheet NEVER contains shipping information — shipping is always negotiated separately
      return {
        document_type: "ORDER_SHEET",
        doc_type: "ORDER_SHEET",
        title: "OFFICIAL COMMERCIAL OFFER SHEET",
        document_number: `OS-${order.order_number}`,
        doc_number: `OS-${order.order_number}`,
        order_number: order.order_number,
        date: order.created_at || new Date().toISOString(),
        valid_until: "30 Days from date of issuance",
        exporter: header,
        buyer,
        currency: "USD",
        product_gallery: topGallery,
        items: orderSheetItems,
        summary: {
          total_units: totalPcs,
          goods_value: order.subtotal,
          subtotal: order.subtotal,
          shipping_fee: null, // strictly zero shipping info
          tax: 0,
          grand_total: order.subtotal,
          total_payable: order.subtotal,
        },
        financials: {
          goods_value: order.subtotal,
          subtotal: order.subtotal,
          shipping_charge: 0,
          tax_amount: 0,
          grand_total: order.subtotal,
          total_payable: order.subtotal,
          currency: "USD",
        },
        terms: "Commercial Offer only — Not an invoice. Valid for 30 days. Production per Ayaan Clothing export standard AQL 2.5.",
      };
    }

    case "PROFORMA_INVOICE": {
      // Determine if shipping was auto-quoted (Aramex) or left for manual discussion
      const isManualShipping =
        order.shipping_snapshot?.provider === "manual" ||
        order.shipping_snapshot?.mode === "manual" ||
        order.shipping_snapshot?.quoted_shipping_charge === null ||
        !order.shipping_cost;

      const freightCharge = isManualShipping ? null : (order.shipping_cost || 0);
      const piTotal = isManualShipping
        ? order.subtotal
        : order.total_amount;

      return {
        document_type: "PROFORMA_INVOICE",
        doc_type: "PROFORMA_INVOICE",
        title: "PROFORMA INVOICE (P.I.)",
        document_number: `PI-${order.order_number}`,
        doc_number: `PI-${order.order_number}`,
        pi_number: `PI-${order.order_number}`,
        order_number: order.order_number,
        date: order.created_at || new Date().toISOString(),
        validity: "30 Days from date of issuance",
        valid_until: "30 Days from date of issuance",
        exporter: header,
        buyer,
        payment_terms: "100% Advance T/T or Irrevocable Confirmed L/C at sight",
        shipping_terms: isManualShipping ? "FOB Dhaka (Freight to be confirmed)" : "CIF Destination / DAP",
        carrier: isManualShipping ? null : (order.carrier || "Aramex Express Air"),
        shipping_snapshot: order.shipping_snapshot,
        currency: "USD",
        items: items.map((i, idx) => ({
          serial: idx + 1,
          description: `${i.product_name} (HS Code: 6109.10.00)`,
          product_name: i.product_name,
          sku: i.sku || `AYN-${idx + 100}`,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unitPrice: i.unit_price,
          amount: i.line_total,
          line_total: i.line_total,
          total: i.line_total,
          size: i.size,
          color: i.color,
          package_breakdown: i.package_breakdown,
        })),
        summary: {
          total_quantity: totalPcs,
          fob_amount: order.subtotal,
          goods_value: order.subtotal,
          subtotal: order.subtotal,
          freight: freightCharge,
          insurance: 0,
          tax: 0,
          total_cif_amount: piTotal,
          grand_total: piTotal,
          total_payable: piTotal,
        },
        financials: {
          goods_value: order.subtotal,
          subtotal: order.subtotal,
          shipping_charge: freightCharge || 0,
          tax_amount: 0,
          grand_total: piTotal,
          total_payable: piTotal,
          currency: "USD",
        },
        shipping_note: isManualShipping
          ? "Freight to be confirmed separately by AYAAN CLOTHING team."
          : undefined,
        bank_details: {
          is_configured: true,
          beneficiary_name: BUSINESS_PROFILE.banking.accountTitle,
          account_title: BUSINESS_PROFILE.banking.accountTitle,
          bank_name: BUSINESS_PROFILE.banking.bankName,
          account_number: BUSINESS_PROFILE.banking.accountNo,
          account_no: BUSINESS_PROFILE.banking.accountNo,
          swift_code: BUSINESS_PROFILE.banking.swiftCode,
          bank_address: BUSINESS_PROFILE.banking.bankAddress,
          branch: BUSINESS_PROFILE.banking.branch,
          country: "Bangladesh",
          currency: "USD",
        },
      };
    }

    case "COMMERCIAL_INVOICE":
      return {
        document_type: "COMMERCIAL_INVOICE",
        title: "COMMERCIAL INVOICE",
        document_number: `CI-${order.order_number}`,
        order_number: order.order_number,
        date: new Date().toISOString(),
        payment_status: "PAID / CONFIRMED",
        exporter: header,
        buyer,
        port_of_loading: "Hazrat Shahjalal Int Airport, Dhaka (or Port of Chittagong)",
        destination_country: order.shipping_country_code || "USA",
        currency: "USD",
        items: items.map((i, idx) => ({
          serial: idx + 1,
          hs_code: "6109.10.00",
          description: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_usd: i.line_total,
        })),
        summary: {
          total_quantity: totalPcs,
          subtotal: order.subtotal,
          freight_cost: order.shipping_cost,
          invoice_total: order.total_amount,
          amount_in_words: `US Dollars ${numberToWords(order.total_amount)} Only`,
        },
        declaration: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      };

    case "PACKING_LIST":
      return {
        document_type: "PACKING_LIST",
        title: "EXPORT PACKING LIST",
        document_number: `PL-${order.order_number}`,
        order_number: order.order_number,
        date: new Date().toISOString(),
        exporter: header,
        buyer,
        shipping_marks: `AYN / ${order.shipping_city || "USA"} / CTN 1-${cartonCount}`,
        carton_summary: {
          total_cartons: cartonCount,
          total_pcs: totalPcs,
          carton_dimensions: "60 x 40 x 35 cm",
          gross_weight_kg: grossWeight,
          net_weight_kg: netWeight,
          total_cbm: totalCbm,
        },
        carton_breakdown: Array.from({ length: Math.min(cartonCount, 10) }, (_, i) => ({
          carton_no: `CTN #${i + 1}`,
          contents: `${Math.round(totalPcs / cartonCount)} pcs assorted sizes`,
          gross_weight: Math.round((grossWeight / cartonCount) * 10) / 10,
          net_weight: Math.round((netWeight / cartonCount) * 10) / 10,
          dimensions: "60x40x35 cm",
        })),
      };

    default:
      return {
        document_type: docType,
        document_number: `DOC-${order.order_number}`,
        order_number: order.order_number,
        exporter: header,
        buyer,
      };
  }
}

function numberToWords(amount: number): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  return `${whole} and ${cents}/100`;
}
