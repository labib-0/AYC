'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import HorizontalCarousel from "@/components/common/HorizontalCarousel";

interface Certificate {
  id: string;
  title: string;
  imageUrl: string;
}

const certificates: Certificate[] = [
  {
    id: 'cert-1',
    title: 'BGMEA Associate Membership',
    imageUrl: '/certificates/cert-bgmea.webp'
  },
  {
    id: 'cert-2',
    title: 'VAT Registration Certificate',
    imageUrl: '/certificates/cert-vat.webp'
  },
  {
    id: 'cert-3',
    title: 'Taxpayer Identification Certificate',
    imageUrl: '/certificates/cert-tin.png'
  },
  {
    id: 'cert-4',
    title: 'ISO 9001:2015 Certification',
    imageUrl: '/certificates/cert-iso.webp'
  }
];

export default function BrandTrust() {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = selectedCert ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [selectedCert]);

  const openLightbox = (cert: Certificate) => {
    setSelectedCert(cert);
  };

  const closeLightbox = () => {
    setSelectedCert(null);
  };

  return (
    <section id="certificate" className="pt-6 sm:pt-8 pb-12 sm:pb-16 bg-background scroll-mt-20">
      <span id="certificates" className="sr-only" aria-hidden="true" />
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        <div className="text-left mb-6 md:mb-8">
          <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight text-foreground mb-1.5">
            CERTIFICATE
          </h2>
          <p className="section-subtitle mt-1 sm:mt-1.5">
            Verified registrations and quality certifications. Tap any document to view it in full.
          </p>
        </div>

        <HorizontalCarousel trackClassName="gap-3 sm:gap-4 pb-4 pt-1 font-sans">
          {certificates.map((cert) => (
            <div 
              key={cert.id} 
              className="w-[85vw] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] shrink-0 snap-start group flex flex-col bg-background cursor-pointer rounded-xl border border-border/60 p-3.5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              onClick={() => openLightbox(cert)}
            >
              <div className="relative aspect-[3/4] w-full rounded-lg border border-border/40 overflow-hidden bg-white mb-3 flex items-center justify-center p-2">
                <img 
                  src={cert.imageUrl} 
                  alt={cert.title} 
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <h3 className="text-sm font-display font-semibold text-foreground px-0.5 pb-0.5 line-clamp-2">{cert.title}</h3>
            </div>
          ))}
        </HorizontalCarousel>
      </div>

      {/* Lightbox */}
      {selectedCert && (
        <div className="fixed inset-0 bg-ink/85 z-[9999] flex items-center justify-center p-4 sm:p-8 backdrop-blur-md animate-in fade-in duration-300" onClick={closeLightbox}>
          <div className="bg-background w-full max-w-2xl relative flex flex-col rounded-xl overflow-hidden max-h-[95vh] shadow-2xl animate-in zoom-in-95 duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-3 right-3 bg-background/90 text-foreground w-9 h-9 rounded-full flex items-center justify-center cursor-pointer z-10 transition-transform duration-200 hover:scale-105 hover:bg-background shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              onClick={closeLightbox}
              aria-label="Close lightbox"
            >
              <X size={20} />
            </button>
            <div className="w-full bg-secondary flex items-center justify-center overflow-hidden p-4 sm:p-6">
              <img 
                src={selectedCert.imageUrl} 
                alt={selectedCert.title} 
                className="max-w-full max-h-[75vh] object-contain shadow-sm border border-border/20 bg-white"
              />
            </div>
            <div className="p-4 text-center bg-background border-t border-border/20">
              <h3 className="text-lg font-display font-medium">{selectedCert.title}</h3>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
