import { AUDIENCE_CATEGORIES } from "../filters";
import { categoryService } from "@/services/category.service";
import { getCategoryImageUrl } from "../category-images";

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  audience?: string;
  description?: string;
  image?: string;
  image_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Fetch dynamic categories from the data store
 */
export async function getCategories(options?: { all?: boolean; isAdmin?: boolean }): Promise<CategoryInfo[]> {
  const list = await categoryService.getCategories(options);
  return list.map((c) => {
    const resolvedImg = getCategoryImageUrl(c.slug || c.name, c.image_url || c.image);
    return {
      id: String(c.id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: resolvedImg,
      image_url: resolvedImg,
      is_active: c.is_active,
      sort_order: c.sort_order,
    };
  });
}

export function getAudiences() {
  return AUDIENCE_CATEGORIES;
}
