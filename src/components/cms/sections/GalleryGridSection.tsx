"use client";

import React from "react";
import Image from "next/image";
import { GalleryGridData } from "@/types/cms";

interface GalleryGridSectionProps {
  data: GalleryGridData;
}

export default function GalleryGridSection({ data }: GalleryGridSectionProps) {
  const { heading, subheading, columns = 3, items = [] } = data;

  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  }[columns];

  return (
    <section className="w-full py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {(heading || subheading) && (
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
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

        <div className={`grid ${colClass} gap-4 sm:gap-6`}>
          {items.map((img, idx) => (
            <div
              key={img.id || idx}
              className="group relative flex flex-col rounded-xl overflow-hidden border border-border/80 bg-card shadow-2xs hover:shadow-md transition-all duration-200"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary/30">
                {img.imageUrl ? (
                  <Image
                    src={img.imageUrl}
                    alt={img.alt || img.caption || `Gallery image ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    Placeholder
                  </div>
                )}
              </div>

              {img.caption && (
                <div className="p-3 bg-card border-t border-border/40">
                  <p className="text-xs text-muted-foreground font-medium text-center line-clamp-2">
                    {img.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

