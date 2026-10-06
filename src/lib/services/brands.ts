// STF-006: Re-export from canonical service layer in src/services/brand.service.ts
import { brandService, BrandModel, BrandQueryParams } from "@/services/brand.service";

export type { BrandModel as Brand, BrandQueryParams };

export async function getBrands(options?: BrandQueryParams): Promise<BrandModel[]> {
  return brandService.getBrands(options);
}

export async function createBrand(name: string, logo?: string, slug?: string): Promise<BrandModel> {
  return brandService.createBrand({ name, logo, slug });
}

export async function updateBrand(id: string, updates: Partial<BrandModel>): Promise<BrandModel | null> {
  return brandService.updateBrand(id, updates);
}

export async function deleteBrand(id: string): Promise<boolean> {
  return brandService.deleteBrand(id);
}
