"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FileText, FileCheck } from "lucide-react";
import RfqManagementView from "@/components/admin/b2b/RfqManagementView";
import QuotationManagementView from "@/components/admin/b2b/QuotationManagementView";

function B2BRfqQuotesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") === "quotes" ? "quotes" : "rfqs";

  const handleTabChange = (tab: "rfqs" | "quotes") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "quotes") {
      params.set("tab", "quotes");
    } else {
      params.delete("tab");
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    router.replace(`${pathname}${query}`);
  };

  return (
    <div className="space-y-6">
      {/* Unified B2B Page Header */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-foreground">
            B2B RFQs &amp; Quotes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage wholesale inquiries and commercial quotations in one unified workspace.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 border-b border-border/60 -mb-4 pt-1">
          <button
            type="button"
            onClick={() => handleTabChange("rfqs")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              currentTab === "rfqs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <FileText size={15} />
            <span>RFQs &amp; Inquiries</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("quotes")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              currentTab === "quotes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <FileCheck size={15} />
            <span>Commercial Quotes</span>
          </button>
        </div>
      </div>

      {/* Active Tab Workspace */}
      <div>
        {currentTab === "rfqs" ? (
          <RfqManagementView />
        ) : (
          <QuotationManagementView />
        )}
      </div>
    </div>
  );
}

export default function AdminB2BRfqQuotesPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-secondary/30 rounded-2xl" />}>
      <B2BRfqQuotesContent />
    </Suspense>
  );
}
