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

  switch (type) {
    case "hero_banner":
      return <HeroBannerSection data={data} />;
    case "rich_text":
      return <RichTextSection data={data} />;
    case "image_text":
      return <ImageTextSection data={data} />;
    case "feature_grid":
      return <FeatureGridSection data={data} />;
    case "faq_accordion":
      return <FaqAccordionSection data={data} />;
    case "gallery_grid":
      return <GalleryGridSection data={data} />;
    case "call_to_action":
      return <CtaSection data={data} />;
    default:
      console.warn(`[CMS] Unknown section type encountered: ${type}`);
      return null;
  }
}

