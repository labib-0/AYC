"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminQuotationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ayc/rfq");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Redirecting to RFQ...
        </p>
      </div>
    </div>
  );
}
