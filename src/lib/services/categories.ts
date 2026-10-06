// STF-006: Re-export from canonical service layer in src/services/category.service.ts
import { categoryService, CategoryModel, CategoryQueryParams } from "@/services/category.service";
import { AUDIENCE_CATEGORIES } from "../filters";

export type { CategoryModel as CategoryInfo, CategoryQueryParams };

export async function getCategories(options?: CategoryQueryParams): Promise<CategoryModel[]> {
  return categoryService.getCategories(options);
}

export function getAudiences() {
  return AUDIENCE_CATEGORIES;
}
