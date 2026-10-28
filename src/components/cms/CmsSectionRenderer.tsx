"use client";

import React from "react";
import { CmsSection } from "@/types/cms";
import HeroBannerSection from "./sections/HeroBannerSection";
import RichTextSection from "./sections/RichTextSection";
import ImageTextSection from "./sections/ImageTextSection";
import FeatureGridSection from "./sections/FeatureGridSection";
import FaqAccordionSection from "./sections/FaqAccordionSection";
import GalleryGridSection from "./sections/GalleryGridSection";
import CtaSection from "./sections/CtaSection";

interface CmsSectionRendererProps {
  section: CmsSection;
}

export default function CmsSectionRenderer({ section }: CmsSectionRendererProps) {
  if (!section || section.is_visible === false) {
    return null;
  }

  const { type, data } = section;
  const sectionData = (data && typeof data === "object" && Object.keys(data).length > 0)
    ? { ...(section as any), ...data }
    : (section as any);

  switch (type) {
    case "hero_banner":
      return <HeroBannerSection data={sectionData} />;
    case "rich_text":
      return <RichTextSection data={sectionData} />;
    case "image_text":
      return <ImageTextSection data={sectionData} />;
    case "feature_grid":
      return <FeatureGridSection data={sectionData} />;
    case "faq_accordion":
      return <FaqAccordionSection data={sectionData} />;
    case "gallery_grid":
      return <GalleryGridSection data={sectionData} />;
    case "call_to_action":
      return <CtaSection data={sectionData} />;
    default:
      console.warn(`[CMS] Unknown section type encountered: ${type}`);
      return null;
  }
}

