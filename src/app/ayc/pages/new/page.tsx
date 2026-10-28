"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutTemplate,
  Sparkles,
  Save,
  Globe,
  Sliders,
  AlertCircle,
  FileText,
  HelpCircle,
  Building,
} from "lucide-react";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { cmsPageService } from "@/services/cms-page.service";
import { RESERVED_SLUGS, CmsSection } from "@/types/cms";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export default function AdminNewCmsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [template, setTemplate] = useState<"blank" | "about" | "wholesale" | "faq">("blank");
  const [showInFooter, setShowInFooter] = useState(false);
  const [footerLabel, setFooterLabel] = useState("");
  const [footerSortOrder, setFooterSortOrder] = useState(10);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugManual) {
      setSlug(slugify(val));
    }
    if (!metaTitle) {
      setMetaTitle(`${val} | Ayaan Clothing`);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManual(true);
    setSlug(slugify(val));
  };

  const buildInitialSections = (): CmsSection[] => {
    if (template === "blank") {
      return [
        {
          id: `sec_hero_${Date.now()}`,
          type: "hero_banner",
          is_visible: true,
          data: {
            title: title || "New Storefront Page",
            subtitle: "Custom content and wholesale apparel excellence direct from Dhaka.",
            alignment: "center",
            overlayOpacity: 40,
            ctaText: "Explore Catalog",
            ctaUrl: "/products",
          },
        },
      ];
    }

    if (template === "about") {
      return [
        {
          id: `sec_hero_${Date.now()}`,
          type: "hero_banner",
          is_visible: true,
          data: {
            title: title || "Our Story & Manufacturing Heritage",
            subtitle: "Two decades of world-class apparel export, sustainable facilities, and ethical production.",
            alignment: "center",
            badge: "AYAAN CLOTHING",
          },
        },
        {
          id: `sec_rich_${Date.now()}`,
          type: "rich_text",
          is_visible: true,
          data: {
            heading: "Craftsmanship Meets Modern Technology",
            content: "<p>Headquartered in Uttara, Dhaka, Ayaan Clothing operates as an export manufacturer and sourcing partner for global private label brands.</p>",
            maxWidth: "normal",
          },
        },
        {
          id: `sec_feat_${Date.now()}`,
          type: "feature_grid",
          is_visible: true,
          data: {
            heading: "Core Commitments",
            columns: 3,
            items: [
              { id: "c1", title: "Ethical Labor Standards", description: "Safe facilities, fair compensation, and strict compliance." },
              { id: "c2", title: "Sustainable Fabrics", description: "BCI cotton, organic yarns, and eco-certified dye formulations." },
              { id: "c3", title: "Direct Factory Pricing", description: "Bypass middlemen with transparent cost-per-piece pricing." },
            ],
          },
        },
        {
          id: `sec_cta_${Date.now()}`,
          type: "call_to_action",
          is_visible: true,
          data: {
            title: "Partner With Our Dhaka Facility",
            subtitle: "Inquire about custom sampling, tech packs, or volume container orders.",
            primaryBtnText: "Request Sourcing Consultation",
            primaryBtnUrl: "/rfq",
            backgroundColor: "navy",
          },
        },
      ];
    }

    if (template === "wholesale") {
      return [
        {
          id: `sec_hero_${Date.now()}`,
          type: "hero_banner",
          is_visible: true,
          data: {
            title: title || "Wholesale Apparel Sourcing",
            subtitle: "Low MOQ tier options, full container volume discounts, and custom private label packaging.",
            badge: "WHOLESALE INQUIRIES",
          },
        },
        {
          id: `sec_feat_${Date.now()}`,
          type: "feature_grid",
          is_visible: true,
          data: {
            heading: "Wholesale Tiers & Benefits",
            columns: 3,
            items: [
              { id: "w1", title: "Tiered Pricing", description: "Incremental savings on 200, 400, and 1,000+ unit quantities." },
              { id: "w2", title: "Custom Labelling", description: "Woven neck labels, hang tags, and branded barcodes." },
              { id: "w3", title: "Door-to-Door Freight", description: "Air express or ocean container delivery worldwide." },
            ],
          },
        },
        {
          id: `sec_cta_${Date.now()}`,
          type: "call_to_action",
          is_visible: true,
          data: {
            title: "Ready to Submit an RFQ?",
            subtitle: "Our merchandising team will review your specifications and reply with full commercial terms.",
            primaryBtnText: "Start RFQ Request",
            primaryBtnUrl: "/rfq",
          },
        },
      ];
    }

    // FAQ template
    return [
      {
        id: `sec_hero_${Date.now()}`,
        type: "hero_banner",
        is_visible: true,
        data: {
          title: title || "Frequently Asked Questions",
          subtitle: "Answers regarding minimum orders, sample lead times, international freight, and payment terms.",
          badge: "SUPPORT & FAQS",
        },
      },
      {
        id: `sec_faq_${Date.now()}`,
        type: "faq_accordion",
        is_visible: true,
        data: {
          heading: "Orders & Shipping",
          items: [
            { id: "q1", question: "What is your typical production turnaround?", answer: "Orders typically take 15 to 30 days from tech pack approval." },
            { id: "q2", question: "Do you ship worldwide?", answer: "Yes, we ship globally via air freight and ocean freight with full export documentation." },
          ],
        },
      },
    ];
  };

  const handleCreate = async (publishImmediately: boolean = false) => {
    setError(null);

    if (!title.trim()) {
      setError("Please provide a page title.");
      return;
    }

    const cleanSlug = slugify(slug || title);
    if (!cleanSlug) {
      setError("Please provide a valid slug.");
      return;
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      setError(`"${cleanSlug}" is a reserved system path and cannot be used as a custom page slug.`);
      return;
    }

    setSaving(true);
    try {
      const initialSections = buildInitialSections();

      const created = await cmsPageService.createPage({
        title: title.trim(),
        slug: cleanSlug,
        status: publishImmediately ? "published" : "draft",
        sections: publishImmediately ? initialSections : [],
        draft_sections: initialSections,
        show_in_footer: showInFooter,
        footer_label: (footerLabel.trim() || title.trim()),
        footer_sort_order: Number(footerSortOrder) || 10,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        is_indexable: true,
      });

      showToast(`Page "${created.title}" created successfully!`, "success");
      setTimeout(() => {
        router.push(`/ayc/pages/${created.id}`);
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Failed to create page. Please verify your fields.");
      setSaving(false);
    }
  };

  return (
    <AdminPageGate permission={ADMIN_PERMISSIONS.PAGE_CREATE} moduleName="Create CMS Page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/ayc/pages" className="hover:text-black flex items-center gap-1">
            <ArrowLeft size={14} />
            <span>Back to CMS Pages</span>
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium">Create New Page</span>
        </div>

        {/* Title & Overview */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-black text-white">
              <LayoutTemplate size={18} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Create New Storefront Page
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Define your page title, URL slug, initial starter template, and navigation placement. You can customize sections and preview the layout on the next screen.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Creation Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Main Settings Form */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
          {/* Page Title & Slug */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
                Page Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Sustainable Apparel Manufacturing"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
                Public URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 focus-within:ring-1 focus-within:ring-black focus-within:border-black overflow-hidden">
                <span className="px-3 text-xs text-zinc-500 font-mono select-none">
                  ayaanclothing.com/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="sustainable-apparel"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          {/* Starter Template Selection */}
          <div className="border-t border-zinc-100 pt-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700">
              Choose Starter Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "blank",
                  title: "Blank Canvas",
                  desc: "Starts with a simple Hero Banner so you can build section by section.",
                  icon: FileText,
                },
                {
                  id: "about",
                  title: "About / Corporate Story",
                  desc: "Hero Banner, Rich Story Narrative, Core Commitments Grid, and CTA.",
                  icon: Building,
                },
                {
                  id: "wholesale",
                  title: "Wholesale & Private Label",
                  desc: "Wholesale Hero, Tier Benefits Grid, and RFQ Conversion Banner.",
                  icon: Sparkles,
                },
                {
                  id: "faq",
                  title: "Information & FAQ Guide",
                  desc: "Header Banner paired with expandable Q&A accordion blocks.",
                  icon: HelpCircle,
                },
              ].map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = template === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setTemplate(tmpl.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-black bg-zinc-50 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-900">{tmpl.title}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                          {tmpl.desc}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Footer Placement */}
          <div className="border-t border-zinc-100 pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="footerCheckbox"
                type="checkbox"
                checked={showInFooter}
                onChange={(e) => setShowInFooter(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black"
              />
              <div>
                <label htmlFor="footerCheckbox" className="text-xs font-semibold text-zinc-900 cursor-pointer">
                  Display link in dynamic Storefront Footer &quot;PAGES&quot; column
                </label>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  When enabled, this page will automatically appear in the third column of the storefront footer once published.
                </p>
              </div>
            </div>

            {showInFooter && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Footer Label (Overrides title if shorter)
                  </label>
                  <input
                    type="text"
                    value={footerLabel}
                    onChange={(e) => setFooterLabel(e.target.value)}
                    placeholder={title || "e.g. Sustainability"}
                    className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Sort Order (Lower numbers appear first)
                  </label>
                  <input
                    type="number"
                    value={footerSortOrder}
                    onChange={(e) => setFooterSortOrder(Number(e.target.value))}
                    className="w-full sm:w-32 px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SEO Metadata Card */}
          <div className="border-t border-zinc-100 pt-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
              Search Engine Optimization (SEO)
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="e.g. Sustainable Apparel Manufacturing | Ayaan Clothing"
                className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                Meta Description
              </label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief summary for Google search snippets (recommended 140–160 chars)..."
                className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-y"
              />
            </div>
          </div>

          {/* Submission Bar */}
          <div className="border-t border-zinc-200 pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link
              href="/ayc/pages"
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-black transition-colors text-center"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleCreate(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? "Creating Draft..." : "Create as Draft"}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleCreate(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Globe size={14} />
              <span>{saving ? "Creating & Publishing..." : "Create & Publish Live"}</span>
            </button>
          </div>
        </div>

        {/* Toast notifications */}
        <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
