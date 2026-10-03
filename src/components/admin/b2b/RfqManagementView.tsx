"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * @deprecated Legacy oversized RFQ workspace. The RFQ module has been redesigned
 * to follow the Orders page design system at /admin/rfq.
 */
export default function RfqManagementView() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ayc/rfq");
  }, [router]);

  return (
    <div className="py-12 text-center text-xs text-muted-foreground font-mono">
      Redirecting to RFQ management...
    </div>
  );
}
