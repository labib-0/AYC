/**
 * Ayaan Clothing — CMS & Page Builder Types
 */

export type CmsPageStatus = "draft" | "published" | "archived";

export type CmsSectionType =
  | "hero_banner"
  | "rich_text"
  | "image_text"
  | "feature_grid"
  | "faq_accordion"
  | "gallery_grid"
  | "call_to_action";

/* ── Section Data Models ── */

export interface HeroBannerData {
  title?: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  alignment?: "left" | "center" | "right";
  ctaText?: string;
  ctaUrl?: string;
  ctaVariant?: "primary" | "secondary" | "outline";
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  overlayOpacity?: number; // 0 - 100
}

export interface RichTextData {
  heading?: string;
  subheading?: string;
  content: string;
  maxWidth?: "narrow" | "normal" | "full";
}

export interface ImageTextData {
  heading: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: "left" | "right";
  ctaText?: string;
  ctaUrl?: string;
  badge?: string;
}

export interface FeatureCardItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  linkUrl?: string;
}

export interface FeatureGridData {
  heading?: string;
  subheading?: string;
  columns?: 2 | 3 | 4;
  items: FeatureCardItem[];
}

export interface FaqAccordionItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqAccordionData {
  heading?: string;
  subheading?: string;
  items: FaqAccordionItem[];
}

export interface GalleryImageItem {
  id: string;
  imageUrl: string;
  caption?: string;
  alt?: string;
}

export interface GalleryGridData {
  heading?: string;
  subheading?: string;
  columns?: 2 | 3 | 4;
  items: GalleryImageItem[];
}

export interface CallToActionData {
  title: string;
  subtitle?: string;
  primaryBtnText?: string;
  primaryBtnUrl?: string;
  secondaryBtnText?: string;
  secondaryBtnUrl?: string;
  backgroundColor?: "navy" | "orange" | "slate" | "default";
}

export interface CmsSection<T = any> {
  id: string;
  type: CmsSectionType;
  is_visible: boolean;
  data: T;
}

/* ── Full CMS Page Model ── */

export interface CmsPageParentSummary {
  id: number | string;
  title: string;
  slug: string;
  breadcrumb_label?: string | null;
}

export interface CmsPage {
  id: number | string;
  title: string;
  slug: string;
  status: CmsPageStatus;
  sections: CmsSection[];
  draft_sections?: CmsSection[];
  parent_id?: number | string | null;
  parent?: CmsPageParentSummary | null;
  breadcrumb_label?: string | null;
  show_in_footer: boolean;
  footer_label?: string | null;
  footer_sort_order: number;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_image_url?: string | null;
  is_indexable: boolean;
  scheduled_publish_at?: string | null;
  scheduled_unpublish_at?: string | null;
  published_at?: string | null;
  created_by?: number | string | null;
  updated_by?: number | string | null;
  previous_slugs?: string[] | null;
  created_at?: string;
  updated_at?: string;
  creator?: { id: number | string; name: string };
  updater?: { id: number | string; name: string };
  is_preview?: boolean;
}

export interface CmsPageFooterItem {
  id: number | string;
  title: string;
  slug: string;
  footer_label?: string | null;
  footer_sort_order: number;
}

export interface CmsPageRedirectResponse {
  success: boolean;
  redirect: true;
  canonical_slug: string;
  canonical_url: string;
  status_code: 301;
}

/**
 * Reserved slugs that cannot be claimed by CMS pages
 */
export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "ayc",
  "api",
  "auth",
  "cart",
  "checkout",
  "compliance",
  "dashboard",
  "faq",
  "login",
  "order-access",
  "privacy-policy",
  "products",
  "profile",
  "rfq",
  "search",
  "signup",
  "terms-and-conditions",
  "wishlist",
  "sitemap",
  "robots",
  "manifest",
  "favicon",
  "images",
  "assets",
  "static",
] as const;

