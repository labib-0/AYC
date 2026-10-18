"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HelpCircle, ChevronDown, MessageCircle, FileText, ArrowLeft } from "lucide-react";
import StorefrontShell from "@/components/layout/StorefrontShell";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { siteSettingsService } from "@/services/site-settings.service";

export interface FaqItem {
  id: string | number;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: boolean;
}

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 1,
    question: "What is your Minimum Order Quantity (MOQ)?",
    answer: "Our standard production MOQ for custom OEM manufacturing is typically 500–1,000 pieces per style/colour depending on the fabric composition. For ready-made stock lots and factory surplus inventory, lower MOQs starting from 200–300 pieces are available for immediate shipment.",
    sort_order: 1,
    is_active: true,
  },
  {
    id: 2,
    question: "What international payment terms do you support?",
    answer: "We support Irrevocable Letter of Credit (L/C at sight) opened through prime international banks and Telegraphic Transfer (T/T: 30% advance deposit upon order confirmation, with the remaining 70% balance payable against presentation of original Bill of Lading (B/L) and export shipping documents).",
    sort_order: 2,
    is_active: true,
  },
  {
    id: 3,
    question: "Which Incoterms and shipping methods are available?",
    answer: "Our baseline quotations are structured on FOB Chittagong (Sea Freight) or FOB Dhaka (Air Freight via DAC). We also accommodate CIF, CFR, or Ex-Works (EXW) upon buyer instruction. All container stuffing, port clearance, and customs declarations are coordinated by our logistics team.",
    sort_order: 3,
    is_active: true,
  },
  {
    id: 4,
    question: "How do you verify quality and inspection standards?",
    answer: "Every garment production batch is inspected following international ANSI/ASQ Z1.4 (ISO 2859-1) AQL 2.5 Major and 4.0 Minor parameters. We conduct yarn and GSM testing, inline cutting and stitching audits, pre-packaging inspections, and provide full laboratory test reports upon request.",
    sort_order: 4,
    is_active: true,
  },
  {
    id: 5,
    question: "What is your production and sampling turnaround time?",
    answer: "Counter-sample and fit-sample development typically takes 7–10 working days. Bulk production lead time is 45–60 days after sample approval, lab dip confirmation, and Letter of Credit establishment. Ready-made stock lots ship within 5–7 business days.",
    sort_order: 5,
    is_active: true,
  },
  {
    id: 6,
    question: "Can you provide custom labeling, tags, and barcode packaging?",
    answer: "Yes. We offer comprehensive OEM packaging including custom woven neck labels, care tags with multivariant size/origin data, heat-seal prints, brand hangtags, retail barcodes, and custom polybags conforming to international retail chain standards.",
    sort_order: 6,
    is_active: true,
  },
];

export default function FaqPage() {
  const { settings, getWhatsAppUrl } = useSiteSettings();
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);
  const [openFaqId, setOpenFaqId] = useState<string | number | null>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFaqs() {
      try {
        setLoading(true);
        const res = await siteSettingsService.getPublicSettings();
        const serverFaqs = (res as any)?.faqs;
        if (Array.isArray(serverFaqs) && serverFaqs.length > 0) {
          const activeOnly = serverFaqs
            .filter((f) => f.is_active !== false)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          if (activeOnly.length > 0) {
            setFaqs(activeOnly);
            setOpenFaqId(activeOnly[0].id);
          }
        }
      } catch (err) {
        console.warn("Using default wholesale FAQs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  const toggleFaq = (id: string | number) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <StorefrontShell>
      <div className="bg-background min-h-screen py-8 sm:py-12">
        <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
          
          {/* Breadcrumb / Back Navigation */}
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
            <span>/</span>
            <span className="text-foreground">Frequently Asked Questions</span>
          </div>

          {/* Header */}
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3 border border-primary/20">
              <HelpCircle size={14} />
              <span>Wholesale Buyer Guide</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight text-foreground">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Find clear answers regarding minimum order quantities, production lead times, export payment terms, quality inspections, and international logistics.
            </p>
          </div>

          {/* FAQ Accordion List */}
          <div className="max-w-4xl space-y-3 mb-14">
            {faqs.map((faq, index) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id || index}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "border-primary/40 bg-card shadow-sm"
                      : "border-border/70 bg-card/60 hover:border-border hover:bg-card"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="font-display font-bold text-sm sm:text-base text-foreground">
                      {faq.question}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-primary/15 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 mt-1 animate-in fade-in duration-200">
                      <p className="whitespace-pre-line">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contact / RFQ Callout */}
          <div className="max-w-4xl rounded-2xl border border-border/80 bg-secondary/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
                Have a specific sourcing requirement or custom inquiry?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Our merchandisers and export managers are ready to provide technical specifications and quotation packages.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href="/rfq"
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <FileText size={15} />
                <span>Request a Quote</span>
              </Link>
              <a
                href={getWhatsAppUrl(`Hi ${settings.site_title}, I have a wholesale apparel sourcing question.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <MessageCircle size={15} />
                <span>WhatsApp Help</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </StorefrontShell>
  );
}
