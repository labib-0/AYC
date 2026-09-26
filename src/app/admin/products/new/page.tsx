"use client";

import { ProductForm } from "@/components/admin/products/form";
import { createProduct } from "@/lib/services/products";
import { B2BProductInput } from "@/types/b2b";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function NewProductPage() {
  const handleCreate = async (data: B2BProductInput) => {
    return await createProduct(data);
  };

  return (
    <AdminPageGate permission="product.create" moduleName="Create Product">
      <div className="w-full max-w-full">
        <ProductForm mode="create" onSubmit={handleCreate} />
      </div>
    </AdminPageGate>
  );
}
