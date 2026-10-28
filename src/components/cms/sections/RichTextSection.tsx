"use client";

import React from "react";
import { RichTextData } from "@/types/cms";

interface RichTextSectionProps {
  data: RichTextData;
}

export default function RichTextSection({ data }: RichTextSectionProps) {
  const safeData = data || {};
  const heading = safeData.heading || (safeData as any).title;
  const subheading = safeData.subheading || (safeData as any).subtitle;
  const content = safeData.content || "";
  const maxWidth = safeData.maxWidth || "normal";

  const maxWidthClass = {
    narrow: "max-w-3xl",
    normal: "max-w-4xl",
    full: "max-w-6xl",
  }[maxWidth];

  return (
    <section className="w-full py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className={`mx-auto ${maxWidthClass}`}>
        {(heading || subheading) && (
          <div className="mb-8 border-b border-border/60 pb-6">
            {heading && (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
                {subheading}
              </p>
            )}
          </div>
        )}

        <div className="space-y-6 text-foreground/90 text-sm sm:text-base leading-relaxed">
          {renderFormattedText(content)}
        </div>
      </div>
    </section>
  );
}

function renderFormattedText(raw: string) {
  if (!raw) return null;

  const blocks = raw.split(/\n\n+/);

  return blocks.map((block, bIdx) => {
    const trimmed = block.trim();

    // H2 Heading: ## ...
    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={bIdx}
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-8 mb-3 first:mt-0"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }

    // H3 Heading: ### ...
    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={bIdx}
          className="text-lg sm:text-xl font-semibold text-foreground mt-6 mb-2"
        >
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
    }

    // Blockquote: > ...
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={bIdx}
          className="border-l-4 border-amber-500 pl-4 py-1 italic text-muted-foreground bg-secondary/30 rounded-r-lg my-4"
        >
          {formatInline(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
    }

    // Bullet List: lines starting with - or *
    const lines = trimmed.split("\n");
    const isBulletList = lines.every(
      (line) => line.trim().startsWith("- ") || line.trim().startsWith("* ")
    );
    if (isBulletList && lines.length > 0) {
      return (
        <ul key={bIdx} className="list-disc pl-5 space-y-2 text-foreground/85">
          {lines.map((line, lIdx) => (
            <li key={lIdx}>{formatInline(line.replace(/^[-*]\s+/, ""))}</li>
          ))}
        </ul>
      );
    }

    // Standard Paragraph
    return (
      <p key={bIdx} className="leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  });
}

function formatInline(text: string) {
  // Parse **bold** syntax
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

