import Link from "next/link";
import ProductCard from "../product/ProductCard";
import { Product } from "@/types";

interface ProductGridProps {
  title: string;
  linkText?: string;
  linkHref?: string;
  products: Product[];
  id?: string;
}

export default function ProductGrid({ title, linkText, linkHref, products, id }: ProductGridProps) {
  return (
    <section id={id} className="py-10 sm:py-14 bg-background">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-12 gap-4">
          <h2 className="text-fluid-h2 font-display uppercase tracking-tight">{title}</h2>
          {linkText && linkHref && (
            <Link href={linkHref} className="text-sm font-semibold uppercase tracking-wider relative group self-start sm:self-auto hover:text-muted-foreground transition-colors">
              {linkText}
              <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-border transition-all duration-300 group-hover:bg-foreground" />
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6 2xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
