"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageX, ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/products/form";
import { getProductBySlugOrId, updateProduct } from "@/lib/services/products";
import { B2BProductInput } from "@/types/b2b";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const [product, setProduct] = useState<B2BProductInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isUnderAdminPath = pathname.startsWith("/ayc") || pathname.startsWith("/admin");
  const backHref = isUnderAdminPath ? "/ayc/products" : "/products";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const found = await getProductBySlugOrId(id);
        setProduct(found);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load product.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleUpdate = async (data: B2BProductInput) => {
    if (!product) return null;
    const res = await updateProduct(product.id, data);
    if (res) {
      setProduct(res);
    }
    return res;
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-6 max-w-full pb-16 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="py-3.5 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary" />
            <div className="space-y-1">
              <div className="h-5 w-36 rounded bg-secondary" />
              <div className="h-3 w-56 rounded bg-secondary/60" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-xl bg-secondary" />
            <div className="h-9 w-32 rounded-xl bg-secondary" />
          </div>
        </div>

        {/* 2-Column Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-96 rounded-2xl bg-secondary/50 border border-border/60" />
            <div className="h-64 rounded-2xl bg-secondary/50 border border-border/60" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-44 rounded-2xl bg-secondary/50 border border-border/60" />
            <div className="h-80 rounded-2xl bg-secondary/50 border border-border/60" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Product Not Found State
  if (!product || error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-card border border-border/80 rounded-2xl p-8 shadow-sm">
          <PackageX size={36} className="mx-auto text-muted-foreground/40" />
          <div>
            <h2 className="text-base font-bold text-foreground uppercase tracking-tight">
              Product Not Found
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {error || `The product with identifier "${id}" does not exist or has been removed from the catalog.`}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <ArrowLeft size={14} />
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Populated Edit Form
  return (
    <AdminPageGate permission="product.edit" moduleName="Edit Product">
      <div className="w-full max-w-full">
        <ProductForm
          key={product.id}
          initialData={product}
          mode="edit"
          onSubmit={handleUpdate}
        />
      </div>
    </AdminPageGate>
  );
}
