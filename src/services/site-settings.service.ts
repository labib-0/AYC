import { apiClient } from "@/services/api-client";
import {
  PublicSiteSettings,
  AdminSiteSettings,
  LegalPage,
  UpdateSettingsPayload,
  UpdateLegalPagePayload,
} from "@/types/settings";
import BUSINESS_PROFILE, {
  WHATSAPP_BUSINESS_DISPLAY,
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_URL,
} from "@/config/business-profile";

const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  site_title: BUSINESS_PROFILE.name || "AYAAN CLOTHING",
  site_logo: null,
  whatsapp: {
    display: WHATSAPP_BUSINESS_DISPLAY,
    number: WHATSAPP_BUSINESS_NUMBER,
    url: WHATSAPP_BUSINESS_URL,
  },
  social_links: [
    {
      id: "link_facebook",
      provider: "facebook",
      name: "Facebook",
      url: "https://facebook.com",
      icon: "facebook",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "link_linkedin",
      provider: "linkedin",
      name: "LinkedIn",
      url: "https://linkedin.com",
      icon: "linkedin",
      is_active: true,
      sort_order: 2,
    },
    {
      id: "link_instagram",
      provider: "instagram",
      name: "Instagram",
      url: "https://instagram.com",
      icon: "instagram",
      is_active: true,
      sort_order: 3,
    },
  ],
  legal_pages: [
    {
      type: "privacy_policy",
      title: "Privacy Policy",
      url: "/privacy-policy",
    },
    {
      type: "terms_conditions",
      title: "Terms & Conditions",
      url: "/terms-and-conditions",
    },
  ],
};

const DEFAULT_LEGAL_PAGES: Record<string, LegalPage> = {
  privacy_policy: {
    id: 1,
    type: "privacy_policy",
    title: "Privacy Policy",
    content: `## 1. Information We Collect

AYAAN CLOTHING collects relevant corporate and business buyer information necessary to process wholesale apparel orders, manage export documentation, and maintain commercial trade communications. This includes buyer contact names, corporate email addresses, phone/WhatsApp numbers, delivery and port destinations, and commercial invoice details.

## 2. How We Use Information

Your commercial information is strictly utilized to:
- Process and fulfill wholesale orders and Requests for Quotations (RFQs).
- Coordinate international freight forwarding, customs clearance, and shipping documentation.
- Provide direct B2B order status updates and commercial support.
- Comply with statutory tax, customs, and banking regulations.

## 3. Data Protection & Confidentiality

We do not sell, rent, or trade buyer contact details or purchasing history to third parties. Data is shared exclusively with authorized export logistical partners (customs brokers, freight carriers) and commercial banks solely to execute authorized transactions.

## 4. Contact Us

For any privacy-related inquiries or data requests, please contact our export administration office.`,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  terms_conditions: {
    id: 2,
    type: "terms_conditions",
    title: "Terms & Conditions",
    content: `## 1. Scope & Minimum Order Quantities (MOQ)

All commercial transactions conducted through AYAAN CLOTHING are subject to export-grade B2B ready-made garment manufacturing standards. Products are sold subject to specified minimum order quantities per colorway and size allocation matrix as indicated in confirmed commercial proforma invoices.

## 2. Quotations & Pricing

All catalog prices and issued quotations are quoted in US Dollars (USD) on FOB (Free On Board) or CIF terms as explicitly agreed. Quotations remain valid for 14 calendar days from the date of issuance due to raw material and freight fluctuations.

## 3. Quality Assurance & Inspection

Production adheres to international garment manufacturing quality standards (AQL 2.5 Major / 4.0 Minor). Pre-shipment inspections by buyer-nominated third-party agencies (e.g., SGS, Bureau Veritas) are welcomed upon advance scheduling.

## 4. Payment Terms & Commercial Invoicing

Acceptable payment methods include Irrevocable Letter of Credit (L/C) at sight or Telegraphic Transfer (T/T) according to the payment schedule specified in the proforma invoice. Production commences upon receipt of the agreed deposit or operative L/C.

## 5. Trademarks & Brand Disclaimer

All third-party brand names, logos, and trademarks referenced are the property of their respective owners. AYAAN CLOTHING operates as an independent apparel manufacturer and exporter.`,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
};

export class SiteSettingsService {
  /**
   * Fetch customer-safe public storefront settings.
   */
  async getPublicSettings(): Promise<PublicSiteSettings> {
    try {
      const response = await apiClient.get<{ status: string; data: PublicSiteSettings }>(
        "/settings/public"
      );
      if (response && response.data) {
        return response.data;
      }
      return DEFAULT_PUBLIC_SETTINGS;
    } catch (error) {
      console.warn("Notice: Public site settings could not be loaded from API, using fallback defaults.", error);
      return DEFAULT_PUBLIC_SETTINGS;
    }
  }

  /**
   * Fetch public legal page by type.
   */
  async getPublicLegalPage(type: string): Promise<LegalPage> {
    const normalizedType = type.replace(/-/g, "_").toLowerCase();
    try {
      const response = await apiClient.get<{ status: string; data: LegalPage }>(
        `/legal/${normalizedType}`
      );
      if (response && response.data) {
        return response.data;
      }
      return DEFAULT_LEGAL_PAGES[normalizedType] || {
        id: null,
        type: normalizedType,
        title: normalizedType === "privacy_policy" ? "Privacy Policy" : "Terms & Conditions",
        content: "Content is being updated.",
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    } catch {
      return DEFAULT_LEGAL_PAGES[normalizedType] || {
        id: null,
        type: normalizedType,
        title: normalizedType === "privacy_policy" ? "Privacy Policy" : "Terms & Conditions",
        content: "Content is being updated.",
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch admin settings.
   */
  async getAdminSettings(): Promise<AdminSiteSettings> {
    const response = await apiClient.get<{ status: string; data: AdminSiteSettings }>("/admin/settings");
    return response.data;
  }

  /**
   * Update admin settings (branding, whatsapp display, social links).
   */
  async updateAdminSettings(payload: UpdateSettingsPayload): Promise<void> {
    await apiClient.put("/admin/settings", payload);
  }

  /**
   * Upload logo (supports PNG and SVG).
   */
  async uploadLogo(file: File): Promise<{ logo_url: string }> {
    const name = file.name.toLowerCase();
    const type = (file.type || "").toLowerCase();
    const isPng = name.endsWith(".png") && (type === "image/png" || type === "");
    const isSvg = name.endsWith(".svg") && (type === "image/svg+xml" || type === "image/svg" || type === "");

    if (!isPng && !isSvg) {
      throw new Error("Invalid file format. Only PNG and SVG image files are allowed for the website logo.");
    }

    const formData = new FormData();
    formData.append("logo", file);

    const response = await apiClient.post<{ status: string; data: { logo_url: string } }>(
      "/admin/settings/logo",
      formData
    );
    return response.data;
  }

  /**
   * Remove logo.
   */
  async removeLogo(): Promise<void> {
    await apiClient.delete("/admin/settings/logo");
  }

  /**
   * Fetch all legal pages for Admin.
   */
  async getAdminLegalPages(): Promise<LegalPage[]> {
    const response = await apiClient.get<{ status: string; data: LegalPage[] }>("/admin/legal");
    return response.data;
  }

  /**
   * Fetch specific legal page for Admin.
   */
  async getAdminLegalPage(type: string): Promise<LegalPage> {
    const normalizedType = type.replace(/-/g, "_").toLowerCase();
    const response = await apiClient.get<{ status: string; data: LegalPage }>(
      `/admin/legal/${normalizedType}`
    );
    return response.data;
  }

  /**
   * Update legal page for Admin.
   */
  async updateAdminLegalPage(type: string, payload: UpdateLegalPagePayload): Promise<LegalPage> {
    const normalizedType = type.replace(/-/g, "_").toLowerCase();
    const response = await apiClient.put<{ status: string; data: LegalPage }>(
      `/admin/legal/${normalizedType}`,
      payload
    );
    return response.data;
  }
}

export const siteSettingsService = new SiteSettingsService();
