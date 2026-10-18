import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProductBySlugOrId } from "@/lib/services/products";
import ProductDetailView from "./ProductDetailView";
import {
  generateProductMetadata,
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
  buildProductBreadcrumbs,
} from "@/lib/seo";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProductBySlugOrId(slug);
    if (
      !product ||
      product.status === "draft" ||
      product.isHiddenFromStorefront ||
      (product as any).is_hidden_from_storefront
    ) {
      return generateProductMetadata(null, slug);
    }
    return generateProductMetadata(product, product.slug || slug);
  } catch {
    return generateProductMetadata(null, slug);
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product = null;
  try {
    const fetched = await getProductBySlugOrId(slug);
    if (
      fetched &&
      fetched.status !== "draft" &&
      !fetched.isHiddenFromStorefront &&
      !(fetched as any).is_hidden_from_storefront
    ) {
      product = fetched;
    }
  } catch (err) {
    console.warn("Server product fetch notice:", err);
  }

  // If accessed by old slug or previous slug, redirect safely to canonical product URL
  if (product && product.slug && product.slug.toLowerCase() !== slug.toLowerCase()) {
    redirect(`/products/${product.slug}`);
  }

  const jsonLdProduct = product ? generateProductJsonLd(product) : null;
  const breadcrumbs = product ? buildProductBreadcrumbs(product) : [];
  const jsonLdBreadcrumb =
    breadcrumbs.length > 0 ? generateBreadcrumbJsonLd(breadcrumbs) : null;

  return (
    <>
      {jsonLdProduct && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
        />
      )}
      {jsonLdBreadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
        />
      )}
      <ProductDetailView initialProduct={product} slug={product?.slug || slug} />
    </>
  );
}
