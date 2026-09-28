"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductForm } from "@/components/admin/products/form";
import { createProduct } from "@/lib/services/products";
import { B2BProductInput } from "@/types/b2b";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

function NewProductContent() {
  const searchParams = useSearchParams();
  const resumeDraft = searchParams.get("resume") === "true";

  const handleCreate = async (data: B2BProductInput) => {
    return await createProduct(data);
  };

  return (
    <div className="w-full max-w-full">
      <ProductForm mode="create" resumeDraft={resumeDraft} onSubmit={handleCreate} />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <AdminPageGate permission="product.create" moduleName="Create Product">
      <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading fresh product form...</div>}>
        <NewProductContent />
      </Suspense>
    </AdminPageGate>
  );
}
