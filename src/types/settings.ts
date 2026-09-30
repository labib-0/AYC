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
