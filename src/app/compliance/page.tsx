"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Award, FileCheck2, ArrowLeft, X, ExternalLink } from "lucide-react";
import StorefrontShell from "@/components/layout/StorefrontShell";

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  regNumber: string;
  imageUrl: string;
  description: string;
}

const OFFICIAL_CERTIFICATES: Certificate[] = [
  {
    id: "cert-bgmea",
    title: "BGMEA Associate Membership",
    issuer: "Bangladesh Garment Manufacturers and Exporters Association",
    regNumber: "Member ID #2140",
    imageUrl: "/certificates/cert-bgmea.webp",
    description: "Official trade accreditation ensuring compliance with national export standards, labor regulations, and ethical RMG manufacturing.",
  },
  {
    id: "cert-iso",
    title: "ISO 9001:2015 Certification",
    issuer: "International Organization for Standardization",
    regNumber: "Quality Management System",
    imageUrl: "/certificates/cert-iso.webp",
    description: "Certified Quality Management System covering knitwear and woven apparel export, pattern cutting, sewing, and final packaging.",
  },
  {
    id: "cert-vat",
    title: "Value Added Tax (VAT) Registration",
    issuer: "National Board of Revenue, Bangladesh",
    regNumber: "BIN: 004189324-0101",
    imageUrl: "/certificates/cert-vat.webp",
    description: "Authoritative tax and VAT compliance certificate authorizing lawful international export shipments and trade invoicing.",
  },
  {
    id: "cert-tin",
    title: "Taxpayer Identification Certificate",
    issuer: "Taxes Zone-08, Dhaka, Bangladesh",
    regNumber: "TIN: 7128-4910-2391",
    imageUrl: "/certificates/cert-tin.png",
    description: "Verified corporate income tax registration for Ayaan Clothing Ltd. supporting export documentation and L/C trade clearance.",
  },
];

export default function CompliancePage() {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

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
            <span className="text-foreground">Compliance &amp; Certifications</span>
          </div>

          {/* Page Header */}
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-500/20">
              <ShieldCheck size={14} />
              <span>International Trade Accreditations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight text-foreground">
              Compliance &amp; Certifications
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              AYAAN CLOTHING maintains strict compliance with Bangladesh labor standards, BGMEA export protocols, and international quality management certifications. Every production run is audited under AQL 2.5 inspection parameters.
            </p>
          </div>

          {/* Key Compliance Standards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5">
                  <FileCheck2 size={20} />
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1.5">
                  AQL 2.5 Inspection Standard
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Our quality assurance team enforces ANSI/ASQ Z1.4 (ISO 2859-1) AQL 2.5 Major and 4.0 Minor inspection protocols for knitwear, hoodies, t-shirts, and denim.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5">
                  <Award size={20} />
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1.5">
                  BGMEA Trade Registration
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Active member of the Bangladesh Garment Manufacturers and Exporters Association, upholding ethical workplace safety, wage transparency, and export governance.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1.5">
                  Customs &amp; Export Verification
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Fully verified Export Registration Certificate (ERC), BIN/VAT, and Bangladesh Bank foreign exchange authorization for Letter of Credit (L/C) shipments.
                </p>
              </div>
            </div>
          </div>

          {/* Certificates Gallery Section */}
          <div className="mb-14">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tight text-foreground">
                Official Certification Documents
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Click any certificate to expand full high-resolution verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {OFFICIAL_CERTIFICATES.map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCert(cert)}
                  className="group rounded-2xl border border-border/70 bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[3/4] w-full rounded-xl bg-white border border-border/30 overflow-hidden mb-3.5 flex items-center justify-center p-2">
                    <img
                      src={cert.imageUrl}
                      alt={cert.title}
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="font-display font-bold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                    {cert.title}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono font-medium mb-1.5">
                    {cert.regNumber}
                  </span>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {cert.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing Prompt */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
                Require factory audit documents or customer-specific compliance?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Our compliance department can provide complete technical files and factory inspection reports for your buyer audit.
              </p>
            </div>
            <Link
              href="/rfq"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Request Compliance Pack →
            </Link>
          </div>

        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedCert && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="bg-card w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-border relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-display font-bold text-base text-foreground">{selectedCert.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedCert.issuer} • {selectedCert.regNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-6 bg-white flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={selectedCert.imageUrl}
                alt={selectedCert.title}
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <div className="p-4 border-t border-border bg-card text-xs text-muted-foreground">
              {selectedCert.description}
            </div>
          </div>
        </div>
      )}
    </StorefrontShell>
  );
}
