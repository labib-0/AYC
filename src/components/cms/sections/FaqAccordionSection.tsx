"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FaqAccordionData } from "@/types/cms";

interface FaqAccordionSectionProps {
  data: FaqAccordionData;
}

export default function FaqAccordionSection({ data }: FaqAccordionSectionProps) {
  const { heading, subheading, items = [] } = data;
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggleIndex = (idx: number) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <section className="w-full py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {(heading || subheading) && (
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            {heading && (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="text-sm sm:text-base text-muted-foreground mt-2.5 leading-relaxed">
                {subheading}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3.5">
          {items.map((item, idx) => {
            const isOpen = openIndices.includes(idx);
            const buttonId = `faq-btn-${idx}`;
            const panelId = `faq-panel-${idx}`;

            return (
              <div
                key={item.id || idx}
                className="rounded-xl border border-border/80 bg-card overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleIndex(idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-foreground hover:bg-secondary/30 transition-colors cursor-pointer min-h-[48px]"
                >
                  <span className="text-base sm:text-lg pr-4">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-5 pb-5 pt-1 text-sm sm:text-base text-foreground/80 leading-relaxed border-t border-border/40 whitespace-pre-line"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

