"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { getCommercialDocument } from "@/lib/services/quotations";
import { CommercialDocument, CommercialDocType } from "@/types/b2b";
import DocumentViewer from "@/components/admin/documents/DocumentViewer";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function CommercialDocumentPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = use(params);
  const [doc, setDoc] = useState<CommercialDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getCommercialDocument(type as CommercialDocType, id);
        if (isMounted) {
          if (!data) {
            setErrorMsg("The requested commercial document could not be found or is not available.");
          } else {
            setDoc(data);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Failed to load commercial document.";
          setErrorMsg(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [type, id]);

  return (
    <AdminPageGate permission="document.view">
      {loading ? (
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Generating commercial document...</span>
        </div>
      ) : errorMsg || !doc ? (
        <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-card border border-border text-center space-y-4 shadow-xl">
          <AlertCircle size={40} className="text-destructive mx-auto" />
          <h2 className="text-lg font-bold uppercase text-foreground">Document Unavailable</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {errorMsg || "The requested commercial document could not be found."}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin/documents"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              <ArrowLeft size={13} />
              <span>Documents Hub</span>
            </Link>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-foreground text-xs font-bold uppercase tracking-wider hover:bg-secondary/80 transition-colors"
            >
              <span>Orders List</span>
            </Link>
          </div>
        </div>
      ) : (
        <DocumentViewer doc={doc} />
      )}
    </AdminPageGate>
  );
}
