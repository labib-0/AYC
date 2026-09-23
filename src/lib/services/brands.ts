import { brandService } from "@/services/brand.service";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  logo_url?: string;
  website?: string | null;
  sort_order?: number;
  is_active?: boolean;
  products_count?: number;
}

/**
 * Fetch dynamic brands from the data store
 */
export async function getBrands(options?: { all?: boolean; isAdmin?: boolean; search?: string }): Promise<Brand[]> {
  const list = await brandService.getBrands(options);
  return list.map((b) => ({
    id: String(b.id),
    name: b.name,
    slug: b.slug,
    logo: b.logo_url || b.logo || "/brands/generic.png",
    logo_url: b.logo_url,
    website: b.website,
    sort_order: b.sort_order,
    is_active: b.is_active,
    products_count: b.products_count,
  }));
}

export async function createBrand(name: string, logo?: string, slug?: string): Promise<Brand> {
  const b = await brandService.createBrand({ name, logo, slug });
  return {
    id: String(b.id),
    name: b.name,
    slug: b.slug,
    logo: b.logo_url || b.logo || "/brands/generic.png",
    logo_url: b.logo_url,
    website: b.website,
    sort_order: b.sort_order,
    is_active: b.is_active,
    products_count: b.products_count,
  };
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<Brand | null> {
  const b = await brandService.updateBrand(id, updates);
  if (!b) return null;
  return {
    id: String(b.id),
    name: b.name,
    slug: b.slug,
    logo: b.logo_url || b.logo || "/brands/generic.png",
    logo_url: b.logo_url,
    website: b.website,
    sort_order: b.sort_order,
    is_active: b.is_active,
    products_count: b.products_count,
  };
}

export async function deleteBrand(id: string): Promise<boolean> {
  return brandService.deleteBrand(id);
}
