"use client";

import React, { useState } from "react";
import { CommercialDocument } from "@/types/b2b";
import { downloadCommercialDocumentPDF } from "@/lib/pdf-generator";
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadCommercialDocumentPDF(doc);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
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

      {/* DOCUMENT SHEET CONTAINER (A4 Formatted Commercial Container) */}
      <div className="max-w-4xl mx-auto overflow-x-auto print:overflow-visible">
        <div className="min-w-[320px] sm:min-w-0 bg-card text-foreground border border-border/80 rounded-3xl p-6 sm:p-12 shadow-xl print:shadow-none print:border-0 print:p-0 print:text-black print:bg-white space-y-6 font-sans">
          {renderDocumentContent()}
        </div>
      </div>
    </div>
  );
}
