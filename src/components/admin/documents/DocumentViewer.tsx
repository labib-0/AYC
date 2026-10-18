"use client";

import React, { useState, useEffect, useRef } from "react";
import { CommercialDocument } from "@/types/b2b";
import {
  generateCommercialDocumentPDFBlob,
  downloadCommercialDocumentPDF,
} from "@/lib/pdf-generator";
import { Loader2 } from "lucide-react";
import DocumentToolbar from "./DocumentToolbar";
import PackingListDocument from "./PackingListDocument";
import CommercialInvoiceDocument from "./CommercialInvoiceDocument";
import ProformaInvoiceDocument from "./ProformaInvoiceDocument";
import OfferSheetDocument from "./OfferSheetDocument";
import QuotationDocument from "./QuotationDocument";

export interface DocumentViewerProps {
  doc: CommercialDocument;
}

export default function DocumentViewer({ doc }: DocumentViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfArtifact, setPdfArtifact] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setPdfLoading(true);

    generateCommercialDocumentPDFBlob(doc)
      .then((res) => {
        if (!active) {
          if (res.url) URL.revokeObjectURL(res.url);
          return;
        }
        objectUrl = res.url;
        setPdfArtifact(res);
      })
      .catch((err) => {
        console.error("Failed to generate authoritative PDF artifact:", err);
      })
      .finally(() => {
        if (active) setPdfLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // fallback
      }
    }
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (pdfArtifact) {
        await downloadCommercialDocumentPDF(doc, pdfArtifact.blob, pdfArtifact.filename);
      } else {
        await downloadCommercialDocumentPDF(doc);
      }
    } catch (err) {
      console.error("Failed to download PDF artifact:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderDocumentContent = () => {
    switch (doc.docType) {
      case "PACKING_LIST":
        return <PackingListDocument doc={doc} />;
      case "COMMERCIAL_INVOICE":
      case "INVOICE":
        return <CommercialInvoiceDocument doc={doc} />;
      case "PROFORMA_INVOICE":
        return <ProformaInvoiceDocument doc={doc} />;
      case "OFFER_SHEET":
      case "ORDER_SHEET":
        return <OfferSheetDocument doc={doc} />;
      case "QUOTATION":
      case "CHALAN":
      default:
        return <QuotationDocument doc={doc} />;
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 py-6 sm:py-8 px-3 sm:px-6 print:p-0 print:bg-white">
      {/* Top Floating Print Controls (Hidden on Print) */}
      <DocumentToolbar
        doc={doc}
        onPrint={handlePrint}
        onDownloadPDF={handleDownloadPDF}
        isDownloading={isDownloading}
      />

      {/* DOCUMENT SHEET CONTAINER: Authoritative PDF Artifact Viewer */}
      <div className="max-w-5xl mx-auto overflow-hidden print:overflow-visible">
        {pdfLoading ? (
          <div className="min-h-[500px] bg-card border border-border/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 shadow-xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-muted-foreground">
              Generating authoritative commercial PDF document...
            </p>
          </div>
        ) : pdfArtifact?.url ? (
          <div className="bg-card text-foreground border border-border/80 rounded-3xl shadow-xl overflow-hidden print:shadow-none print:border-0">
            <iframe
              ref={iframeRef}
              src={pdfArtifact.url}
              title={doc.title}
              className="w-full h-[85vh] border-0 rounded-3xl"
            />
          </div>
        ) : (
          <div className="min-w-[320px] sm:min-w-0 bg-card text-foreground border border-border/80 rounded-3xl p-6 sm:p-12 shadow-xl print:shadow-none print:border-0 print:p-0 print:text-black print:bg-white space-y-6 font-sans">
            {renderDocumentContent()}
          </div>
        )}
      </div>
    </div>
  );
}
