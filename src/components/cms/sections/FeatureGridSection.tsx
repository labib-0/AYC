"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Clock,
  Globe,
  Truck,
  CheckCircle2,
  Factory,
  Sparkles,
  Star,
  Users,
  HeartHandshake,
  Layers,
  LucideIcon,
} from "lucide-react";
import { FeatureGridData } from "@/types/cms";

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck,
  Award,
  Clock,
  Globe,
  Truck,
  CheckCircle2,
  Factory,
  Sparkles,
  Star,
  Users,
  HeartHandshake,
  Layers,
};

interface FeatureGridSectionProps {
  data: FeatureGridData;
}

export default function FeatureGridSection({ data }: FeatureGridSectionProps) {
  const { heading, subheading, columns = 3, items = [] } = data;

  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <section className="w-full py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-secondary/20">
      <div className="mx-auto max-w-6xl">
        {(heading || subheading) && (
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            {heading && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                {subheading}
              </p>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 ${colClass} gap-6 sm:gap-8`}>
          {items.map((item, idx) => {
            const IconComponent = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : ShieldCheck;

            const CardContent = (
              <div className="h-full flex flex-col p-6 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-border hover:shadow-md transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mb-5">
                  <IconComponent size={24} />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {item.description}
                </p>

                {item.linkUrl && (
                  <div className="mt-4 pt-3 border-t border-border/50 text-xs font-semibold text-primary inline-flex items-center gap-1">
                    <span>Learn more</span>
                    <span>→</span>
                  </div>
                )}
              </div>
            );

            return item.linkUrl ? (
              <Link key={item.id || idx} href={item.linkUrl} className="block group">
                {CardContent}
              </Link>
            ) : (
              <div key={item.id || idx}>{CardContent}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

