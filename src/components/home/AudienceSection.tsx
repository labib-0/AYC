"use client";

import { useRouter } from "next/navigation";
import { AudienceTiles } from "@/components/common/AudienceCard";

export default function AudienceSection() {
  const router = useRouter();

  const handleAudienceToggle = (audienceName: string) => {
    router.push("/search?audience=" + encodeURIComponent(audienceName.toLowerCase()) + "&filterOpen=true");
  };

  return (
    <section id="audience" className="pt-1 sm:pt-1.5 pb-1 sm:pb-1.5 bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        
        {/* AUDIENCE Section Heading */}
        <div className="mb-2 sm:mb-2.5 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground leading-tight">
              AUDIENCE
            </h2>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 sm:mt-1 font-sans leading-normal">
              Select one or multiple audiences to explore tailored collections
            </p>
          </div>
        </div>

        {/* 5 Core Audience Tiles: MEN, WOMEN, BOYS, GIRLS, UNISEX */}
        <AudienceTiles
          selectedAudiences={[]}
          onToggle={handleAudienceToggle}
        />

      </div>
    </section>
  );
}
