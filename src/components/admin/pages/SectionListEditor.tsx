"use client";

import React, { useState } from "react";
import {
  CmsSection,
  CmsSectionType,
  HeroBannerData,
  RichTextData,
  ImageTextData,
  FeatureGridData,
  FaqAccordionData,
  GalleryGridData,
  CallToActionData,
} from "@/types/cms";
import {
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Layout,
  FileText,
  Image as ImageIcon,
  Grid3X3,
  HelpCircle,
  Images,
  Megaphone,
} from "lucide-react";
import { TableMoveControls } from "@/components/admin/ordered-list/TableMoveControls";
import { HeroBannerEditor } from "./editors/HeroBannerEditor";
import { RichTextEditor } from "./editors/RichTextEditor";
import { ImageTextEditor } from "./editors/ImageTextEditor";
import { FeatureGridEditor } from "./editors/FeatureGridEditor";
import { FaqAccordionEditor } from "./editors/FaqAccordionEditor";
import { GalleryGridEditor } from "./editors/GalleryGridEditor";
import { CtaEditor } from "./editors/CtaEditor";

interface SectionListEditorProps {
  sections: CmsSection[];
  onChange: (sections: CmsSection[]) => void;
}

const SECTION_TYPE_CONFIG: Record<
  CmsSectionType,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; description: string }
> = {
  hero_banner: {
    label: "Hero Banner",
    icon: Layout,
    description: "Full-width background image with bold headline, description, and action buttons.",
  },
  rich_text: {
    label: "Rich Text",
    icon: FileText,
    description: "Formatted content, paragraphs, headings, lists, and legal text.",
  },
  image_text: {
    label: "Image + Text",
    icon: ImageIcon,
    description: "Two-column feature block pairing high-res photography with detailed narrative.",
  },
  feature_grid: {
    label: "Feature Grid",
    icon: Grid3X3,
    description: "Grid of cards highlighting core advantages, statistics, or capabilities.",
  },
  faq_accordion: {
    label: "FAQ Accordion",
    icon: HelpCircle,
    description: "Expandable questions and answers with automatic SEO FAQPage schema.",
  },
  gallery_grid: {
    label: "Gallery Grid",
    icon: Images,
    description: "Multi-column responsive image gallery with optional captions.",
  },
  call_to_action: {
    label: "Call to Action",
    icon: Megaphone,
    description: "High-contrast conversion banner driving wholesale quotes or consultations.",
  },
};

function createDefaultSectionData(type: CmsSectionType): any {
  switch (type) {
    case "hero_banner":
      return {
        title: "Garment Manufacturing Excellence",
        subtitle: "Export-grade private label apparel and volume production direct from Dhaka.",
        badge: "WHOLESALE APPAREL",
        alignment: "center",
        overlayOpacity: 40,
        ctaText: "Request Wholesale Quote",
        ctaUrl: "/rfq",
        ctaVariant: "primary",
      } as HeroBannerData;
    case "rich_text":
      return {
        heading: "About Our Facilities",
        content: "<p>Established with a commitment to sustainable garment manufacturing and ethical production, Ayaan Clothing supplies premier wholesale apparel worldwide.</p>",
        maxWidth: "normal",
      } as RichTextData;
    case "image_text":
      return {
        heading: "State-of-the-Art Garment Finishing",
        content: "Every production batch undergoes multi-stage quality control, colorfastness testing, and dimension audits before export dispatch.",
        imagePosition: "left",
        ctaText: "Explore Quality Standards",
        ctaUrl: "/compliance",
      } as ImageTextData;
    case "feature_grid":
      return {
        heading: "Why Global Retailers Trust Ayaan",
        columns: 3,
        items: [
          {
            id: `f_${Date.now()}_1`,
            title: "Ethical Manufacturing",
            description: "100% compliant partner facilities with fair wages and safe working environments.",
            icon: "ShieldCheck",
          },
          {
            id: `f_${Date.now()}_2`,
            title: "Low Volume Flexibility",
            description: "Accessible minimum order quantities for growing brands and emergent labels.",
            icon: "Boxes",
          },
          {
            id: `f_${Date.now()}_3`,
            title: "Global Air & Ocean Freight",
            description: "Door-to-door worldwide shipping with tracked documentation and customs clearance.",
            icon: "Truck",
          },
        ],
      } as FeatureGridData;
    case "faq_accordion":
      return {
        heading: "Frequently Asked Questions",
        items: [
          {
            id: `q_${Date.now()}_1`,
            question: "What is your standard production lead time?",
            answer: "Standard production lead times range between 15 to 30 days depending on fabric availability, custom embellishments, and volume.",
          },
          {
            id: `q_${Date.now()}_2`,
            question: "Do you offer custom private label branding?",
            answer: "Yes, we provide woven neck labels, care tags, hang tags, polybag printing, and custom packaging for all wholesale orders.",
          },
        ],
      } as FaqAccordionData;
    case "gallery_grid":
      return {
        heading: "Production Floor & Showrooms",
        columns: 3,
        items: [],
      } as GalleryGridData;
    case "call_to_action":
      return {
        title: "Ready to Start Your Production Run?",
        subtitle: "Submit your tech pack or product specifications to receive a direct manufacturer quote within 24 hours.",
        primaryBtnText: "Request Wholesale Quote",
        primaryBtnUrl: "/rfq",
        backgroundColor: "navy",
      } as CallToActionData;
  }
}

export function SectionListEditor({ sections, onChange }: SectionListEditorProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    sections[0]?.id || null
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddSection = (type: CmsSectionType) => {
    const newSection: CmsSection = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      is_visible: true,
      data: createDefaultSectionData(type),
    };
    const next = [...sections, newSection];
    onChange(next);
    setExpandedSectionId(newSection.id);
    setShowAddMenu(false);
  };

  const handleRemoveSection = (id: string) => {
    const next = sections.filter((s) => s.id !== id);
    onChange(next);
    if (expandedSectionId === id) {
      setExpandedSectionId(next[0]?.id || null);
    }
  };

  const handleDuplicateSection = (index: number) => {
    const target = sections[index];
    const duplicated: CmsSection = {
      ...JSON.parse(JSON.stringify(target)),
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const next = [...sections];
    next.splice(index + 1, 0, duplicated);
    onChange(next);
    setExpandedSectionId(duplicated.id);
  };

  const handleToggleVisibility = (index: number) => {
    const next = [...sections];
    next[index] = { ...next[index], is_visible: !next[index].is_visible };
    onChange(next);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
  };

  const handleUpdateSectionData = (index: number, updatedData: any) => {
    const next = [...sections];
    next[index] = { ...next[index], data: updatedData };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Page Layout Sections ({sections.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Add, reorder, toggle visibility, and configure custom content blocks for this page.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={15} />
            <span>Add Section</span>
            <ChevronDown size={14} className={`transition-transform ${showAddMenu ? "rotate-180" : ""}`} />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-zinc-200 p-2 z-30 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Available Section Types
              </div>
              {(Object.keys(SECTION_TYPE_CONFIG) as CmsSectionType[]).map((type) => {
                const config = SECTION_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddSection(type)}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-700 mt-0.5">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900">{config.label}</div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1">{config.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
          <Layout size={32} className="mx-auto text-zinc-400 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-800">No Sections in Page Draft</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Click &quot;Add Section&quot; above to begin assembling your layout blocks.
          </p>
          <button
            type="button"
            onClick={() => handleAddSection("hero_banner")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-black rounded-lg hover:bg-zinc-800"
          >
            <Plus size={14} />
            <span>Add Hero Banner</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const config = SECTION_TYPE_CONFIG[section.type] || {
              label: section.type,
              icon: Layout,
              description: "",
            };
            const Icon = config.icon;
            const isExpanded = expandedSectionId === section.id;

            return (
              <div
                key={section.id}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded ? "border-zinc-900 shadow-sm" : "border-zinc-200 hover:border-zinc-300"
                } ${!section.is_visible ? "opacity-60 bg-zinc-50/70" : ""}`}
              >
                {/* Section Header */}
                <div
                  onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TableMoveControls
                      globalIndex={index + 1}
                      isFirst={index === 0}
                      isLast={index === sections.length - 1}
                      onMoveUp={() => handleMove(index, "up")}
                      onMoveDown={() => handleMove(index, "down")}
                      itemTitle={config.label}
                    />

                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-700">
                      <Icon size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900">
                          {config.label}
                        </span>
                        {!section.is_visible && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {section.data?.heading || section.data?.title || config.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(index)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                      title={section.is_visible ? "Hide section on storefront" : "Show section"}
                    >
                      {section.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateSection(index)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                      title="Duplicate section"
                    >
                      <Copy size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(section.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete section"
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-900 ml-1"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Section Content Editor (Expanded) */}
                {isExpanded && (
                  <div className="p-4 border-t border-zinc-100 bg-white rounded-b-xl">
                    {section.type === "hero_banner" && (
                      <HeroBannerEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                    {section.type === "rich_text" && (
                      <RichTextEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                    {section.type === "image_text" && (
                      <ImageTextEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                    {section.type === "feature_grid" && (
                      <FeatureGridEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                    {section.type === "faq_accordion" && (
                      <FaqAccordionEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                    {section.type === "gallery_grid" && (
                      <GalleryGridEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                    {section.type === "call_to_action" && (
                      <CtaEditor
                        data={section.data}
                        onChange={(d) => handleUpdateSectionData(index, d)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

