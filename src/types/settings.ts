/**
 * Storefront Settings, Branding, Social Links & Legal Pages Type Definitions
 */

export type KnownSocialProvider =
  | "facebook"
  | "instagram"
  | "youtube"
  | "x"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "pinterest"
  | "telegram"
  | "whatsapp"
  | "website";

export interface SocialLink {
  id: string;
  provider: string;
  name: string;
  url: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
}

export interface PublicLegalPageSummary {
  type: string;
  title: string;
  url: string;
  updated_at?: string;
}

export interface PublicSiteSettings {
  site_title: string;
  site_logo: string | null;
  whatsapp: {
    display: string;
    number: string;
    url: string;
  };
  social_links: SocialLink[];
  legal_pages: PublicLegalPageSummary[];
  google_search_console_verification?: string | null;
}

export interface LegalPage {
  id: number | null;
  type: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at?: string | null;
}

export interface AdminSiteSettings {
  site_title: string;
  site_logo: string | null;
  whatsapp_display: string;
  whatsapp_number: string;
  whatsapp_url: string;
  social_links: SocialLink[];
  footer_description?: string;
  google_search_console_verification?: string | null;
}

export interface UpdateSettingsPayload {
  site_title: string;
  whatsapp_display: string;
  social_links?: SocialLink[];
  footer_description?: string;
}

export interface UpdateLegalPagePayload {
  title: string;
  content: string;
  is_active: boolean;
}

export interface BankProfile {
  id: string;
  name: string;
  currency: string;
  bank_name: string;
  account_title: string;
  account_name?: string;
  account_number: string;
  account_no?: string;
  swift_code?: string;
  branch?: string;
  branch_name?: string;
  bank_address?: string;
  routing_number?: string;
  notes?: string;
  is_active: boolean;
  is_default: boolean;
}

export interface BusinessSettingsPayload {
  company: {
    name: string;
    legal_name?: string;
    tagline?: string;
    website?: string;
    logo_url?: string;
  };
  contact: {
    office_address: string;
    city?: string;
    country?: string;
    phone?: string;
    email: string;
    whatsapp: string;
    whatsapp_canonical?: string;
    whatsapp_url?: string;
  };
  legal: {
    trade_license?: string;
    tin_number?: string;
    bin_vat?: string;
    erc_number?: string;
    irc_number?: string;
    bgmea_reg?: string;
    incorporation_number?: string;
  };
  banking: {
    bank_name: string;
    branch_name?: string;
    account_name: string;
    account_number: string;
    swift_code?: string;
    routing_number?: string;
    currency?: string;
    profiles?: BankProfile[];
  };
  bank_profiles?: BankProfile[];
  supported_currencies?: string[];
  document_defaults: {
    port_of_loading?: string;
    country_of_origin?: string;
    payment_terms_default?: string;
    incoterm_default?: string;
    declaration_text?: string;
    authorized_signatory_name?: string;
    authorized_signatory_title?: string;
  };
}

