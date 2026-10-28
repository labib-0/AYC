"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ImageTextData } from "@/types/cms";

interface ImageTextSectionProps {
  data: ImageTextData;
}

export default function ImageTextSection({ data }: ImageTextSectionProps) {
  const {
    heading,
    content,
    imageUrl,
    imageAlt,
    imagePosition = "right",
    ctaText,
    ctaUrl,
    badge,
  } = data;

  const isImageRight = imagePosition === "right";

  return (
    <section className="w-full py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
            isImageRight ? "" : "lg:flex-row-reverse"
          }`}
        >
          {/* Content Column */}
          <div
            className={`lg:col-span-7 flex flex-col ${
              isImageRight ? "order-1" : "order-2 lg:order-2"
            }`}
          >
            {badge && (
              <span className="inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-3">
                {badge}
              </span>
            )}

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
              {heading}
            </h2>

            <div className="space-y-4 text-foreground/80 text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-line">
              {content}
            </div>

            {ctaText && ctaUrl && (
              <div>
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <span>{ctaText}</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>

          {/* Image Column */}
          <div
            className={`lg:col-span-5 ${
              isImageRight ? "order-2" : "order-1 lg:order-1"
            }`}
          >
            <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] rounded-2xl overflow-hidden border border-border/80 shadow-md bg-secondary/30">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={imageAlt || heading}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-wider">
                  No image selected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

