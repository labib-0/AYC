import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cmsPageService } from "@/services/cms-page.service";
import CmsPageView from "@/components/cms/CmsPageView";
import { CmsPage, RESERVED_SLUGS } from "@/types/cms";
import { canonicalUrl } from "@/lib/seo/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DynamicCmsPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate SEO metadata dynamically for published CMS pages
 */
export async function generateMetadata({
  params,
}: DynamicCmsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const clean = slug.toLowerCase().trim();

  // If slug is a reserved route, let static routes handle it or return empty
  if (RESERVED_SLUGS.includes(clean)) {
    return {};
  }

  try {
    const pageData = await cmsPageService.getPublishedPageBySlug(clean);
    if (!pageData || (pageData as any).redirect) {
      return {};
    }

    const page = pageData as CmsPage;
    const title = page.meta_title || page.title;
    const description =
      page.meta_description ||
      `Learn more about ${page.title} at Ayaan Clothing, manufacturer and exporter of ready-made garments.`;
    const pageCanonical = page.canonical_url || canonicalUrl(`/${page.slug}`);

    return {
      title,
      description,
      alternates: {
        canonical: pageCanonical,
      },
      openGraph: {
        title,
        description,
        url: pageCanonical,
        type: "website",
        images: page.og_image_url ? [{ url: page.og_image_url }] : undefined,
      },
      robots: {
        index: page.is_indexable !== false,
        follow: page.is_indexable !== false,
      },
    };
  } catch (err) {
    console.warn(`[SEO] Failed to generate metadata for CMS slug /${slug}:`, err);
    return {};
  }
}

/**
 * Dynamic Storefront CMS Page Renderer
 */
export default async function DynamicCmsPage({ params }: DynamicCmsPageProps) {
  const { slug } = await params;
  const clean = slug.toLowerCase().trim();

  // Disallow collision with reserved system routes
  if (RESERVED_SLUGS.includes(clean)) {
    notFound();
  }

  let pageOrRedirect = null;
  try {
    pageOrRedirect = await cmsPageService.getPublishedPageBySlug(clean);
  } catch (err) {
    console.error(`[CMS] Error fetching page for slug /${clean}:`, err);
  }

  // If page does not exist or fetch failed -> 404
  if (!pageOrRedirect) {
    notFound();
  }

  // Handle 301 redirect for previous slug
  if ((pageOrRedirect as any).redirect && (pageOrRedirect as any).canonical_url) {
    redirect((pageOrRedirect as any).canonical_url);
  }

  const page = pageOrRedirect as CmsPage;

  // Enforce published status for public route
  if (page.status && page.status !== "published") {
    notFound();
  }

  return <CmsPageView page={page} />;
}

