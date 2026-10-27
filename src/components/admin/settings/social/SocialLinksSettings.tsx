"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  ExternalLink,
  Save,
  AlertCircle,
  RefreshCw,
  Globe,
  AlertTriangle,
  CircleOff,
  CheckCircle2,
} from "lucide-react";
import { siteSettingsService } from "@/services/site-settings.service";
import SocialIcon from "@/components/common/SocialIcon";
import { SocialLink } from "@/types/settings";
import { validateSocialProfileUrl } from "@/lib/social-links";

interface SocialLinksSettingsProps {
  onNotify: (message: string) => void;
}

const SUPPORTED_PROVIDERS = [
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X (Twitter)" },
  { key: "pinterest", label: "Pinterest" },
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "website", label: "Custom Website / Link" },
];

function getPlaceholderForProvider(provider: string): string {
  const norm = (provider || "").toLowerCase().trim();
  switch (norm) {
    case "linkedin":
      return "e.g. https://www.linkedin.com/company/ayaanclothing";
    case "tiktok":
      return "e.g. https://www.tiktok.com/@ayaanclothing";
    case "facebook":
      return "e.g. https://www.facebook.com/ayaanclothing";
    case "instagram":
      return "e.g. https://www.instagram.com/ayaanclothing";
    case "youtube":
      return "e.g. https://www.youtube.com/@ayaanclothing";
    case "x":
    case "twitter":
      return "e.g. https://x.com/ayaanclothing";
    case "pinterest":
      return "e.g. https://www.pinterest.com/ayaanclothing";
    case "telegram":
      return "e.g. https://t.me/ayaanclothing";
    case "whatsapp":
      return "e.g. https://wa.me/8801620853502";
    default:
      return "https://...";
  }
}

function getLinkStatusInfo(provider: string, rawUrl?: string | null) {
  const url = (rawUrl || "").trim();
  if (!url) {
    return {
      status: "unconfigured" as const,
      textColor: "text-muted-foreground",
      description: "Unconfigured. Leave blank if AYC does not have an official account yet — this icon will remain hidden from the footer.",
      badge: (
        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/80 border border-border px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <CircleOff size={10} />
          <span>Unconfigured (Hidden)</span>
        </span>
      ),
    };
  }

  const validation = validateSocialProfileUrl(provider, url);
  if (validation.isGenericPlaceholder) {
    return {
      status: "generic" as const,
      textColor: "text-amber-600 dark:text-amber-400 font-medium",
      description: validation.errorMessage || "Generic homepage is hidden from footer until official AYC profile URL is entered.",
      badge: (
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <AlertTriangle size={10} />
          <span>Generic Homepage (Hidden)</span>
        </span>
      ),
    };
  }

  if (!validation.isValid) {
    return {
      status: "invalid" as const,
      textColor: "text-destructive font-medium",
      description: validation.errorMessage || "Please enter a valid URL starting with https://.",
      badge: (
        <span className="text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <AlertCircle size={10} />
          <span>Invalid URL</span>
        </span>
      ),
    };
  }

  return {
    status: "valid" as const,
    textColor: "text-emerald-600 dark:text-emerald-400 font-medium",
    description: "Official profile verified. This icon is active and visible in the public footer.",
    badge: (
      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
        <CheckCircle2 size={10} />
        <span>Visible in Footer</span>
      </span>
    ),
  };
}

export default function SocialLinksSettings({ onNotify }: SocialLinksSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp Display Number
  const [whatsappDisplay, setWhatsappDisplay] = useState("+880 1620-853502");
  const [siteTitle, setSiteTitle] = useState("AYAAN CLOTHING");
  const [footerDesc, setFooterDesc] = useState("");

  // Social Links List
  const [links, setLinks] = useState<SocialLink[]>([]);

  // Add Link Modal/Drawer state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProvider, setNewProvider] = useState("tiktok");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Derive machine number client-side for live instant feedback (mirrors backend normalization)
  const deriveClientMachineNumber = (display: string): string => {
    const raw = (display || "").trim();
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return "";
    if (["8801826304930", "8801711000000", "1826304930"].includes(digits)) {
      return "8801620853502";
    }
    if (digits.startsWith("0") && digits.length === 11) {
      return "880" + digits.slice(1);
    }
    if (digits.length === 10 && digits.startsWith("1")) {
      return "880" + digits;
    }
    return digits;
  };

  const derivedMachineNumber = deriveClientMachineNumber(whatsappDisplay);
  const derivedWhatsAppUrl = derivedMachineNumber ? `https://wa.me/${derivedMachineNumber}` : "";

  useEffect(() => {
    async function loadData() {
      try {
        const data = await siteSettingsService.getAdminSettings();
        if (data) {
          const rawNum = (data.whatsapp_number || "").replace(/\D+/g, "");
          const isStale = ["8801826304930", "8801711000000", "1826304930"].includes(rawNum);
          setWhatsappDisplay(isStale ? "+880 1620-853502" : (data.whatsapp_display || "+880 1620-853502"));
          setSiteTitle(data.site_title || "AYAAN CLOTHING");
          setFooterDesc(data.footer_description || "");

          const initialLinks: SocialLink[] = Array.isArray(data.social_links) && data.social_links.length > 0
            ? [...data.social_links]
            : [
                {
                  id: "link_facebook",
                  provider: "facebook",
                  name: "Facebook",
                  url: "https://www.facebook.com/profile.php?id=61579913706663",
                  icon: "facebook",
                  is_active: true,
                  sort_order: 1,
                },
              ];

          // Ensure LinkedIn and TikTok exist as configurable options
          const existingProviders = new Set(initialLinks.map((l) => (l.provider || "").toLowerCase().trim()));
          if (!existingProviders.has("linkedin")) {
            initialLinks.push({
              id: "link_linkedin",
              provider: "linkedin",
              name: "LinkedIn",
              url: "",
              icon: "linkedin",
              is_active: true,
              sort_order: initialLinks.length + 1,
            });
          }
          if (!existingProviders.has("tiktok")) {
            initialLinks.push({
              id: "link_tiktok",
              provider: "tiktok",
              name: "TikTok",
              url: "",
              icon: "tiktok",
              is_active: true,
              sort_order: initialLinks.length + 1,
            });
          }
          if (!existingProviders.has("instagram")) {
            initialLinks.push({
              id: "link_instagram",
              provider: "instagram",
              name: "Instagram",
              url: "",
              icon: "instagram",
              is_active: true,
              sort_order: initialLinks.length + 1,
            });
          }

          setLinks(initialLinks);
        }
      } catch (err: unknown) {
        console.warn("Notice: Failed to fetch settings for social links, using defaults.", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleActive = (id: string) => {
    setLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: !item.is_active } : item))
    );
  };

  const handleUrlChange = (id: string, url: string) => {
    setLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, url } : item))
    );
  };

  const handleClearUrl = (id: string) => {
    setLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, url: "" } : item))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLinks((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === links.length - 1) return;
    setLinks((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    });
  };

  const handleDelete = (id: string) => {
    setLinks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newUrl.trim();

    if (cleanUrl) {
      let formattedUrl = cleanUrl;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = "https://" + formattedUrl;
      }
      const val = validateSocialProfileUrl(newProvider, formattedUrl);
      if (val.isGenericPlaceholder) {
        setError(val.errorMessage || "Generic platform homepages cannot be saved as official profile links.");
        return;
      }
      if (!val.isValid) {
        setError(val.errorMessage || "Please enter a valid URL starting with https://.");
        return;
      }
    }

    const providerObj = SUPPORTED_PROVIDERS.find((p) => p.key === newProvider);
    const finalName = newName.trim() || providerObj?.label || "Social Link";

    const newLinkItem: SocialLink = {
      id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      provider: newProvider,
      name: finalName,
      url: cleanUrl,
      icon: newProvider,
      is_active: true,
      sort_order: links.length + 1,
    };

    setLinks((prev) => [...prev, newLinkItem]);
    setNewName("");
    setNewUrl("");
    setNewProvider("tiktok");
    setIsAddOpen(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!whatsappDisplay.trim()) {
      setError("WhatsApp Display Number is required.");
      return;
    }

    // Validate all entered social URLs
    for (const link of links) {
      const cleanUrl = (link.url || "").trim();
      if (cleanUrl) {
        const val = validateSocialProfileUrl(link.provider, cleanUrl);
        if (val.isGenericPlaceholder) {
          setError(
            val.errorMessage ||
              `The URL for ${link.name || link.provider} is a generic platform homepage. Please provide an official profile URL or clear the field.`
          );
          return;
        }
        if (!val.isValid) {
          setError(
            val.errorMessage ||
              `Invalid URL for ${link.name || link.provider}. Must start with https:// and match the provider domain.`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      await siteSettingsService.updateAdminSettings({
        site_title: siteTitle,
        whatsapp_display: whatsappDisplay.trim(),
        social_links: links,
        footer_description: footerDesc,
      });
      window.dispatchEvent(new StorageEvent("storage", { key: "ayaan_site_settings_updated" }));
      onNotify("WhatsApp and Social Links updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Notice</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* WHATSAPP SETTINGS SECTION */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl space-y-6 shadow-xs">
        <div className="border-b border-border/60 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageCircle size={18} className="text-[#25D366]" />
              <span>Official WhatsApp Business Contact</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter the human-readable display number. The machine/URL-safe WhatsApp number is derived automatically.
            </p>
          </div>
          <span className="text-[10px] font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-md">
            Auto-Derived URL
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Editable Display Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>WHATSAPP DISPLAY NUMBER</span>
              <span className="text-[10px] text-muted-foreground uppercase">Required</span>
            </label>
            <input
              type="text"
              value={whatsappDisplay}
              onChange={(e) => setWhatsappDisplay(e.target.value)}
              placeholder="e.g. +880 1620-853502"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              What customers see on the website footer and contact cards.
            </p>
          </div>

          {/* Automatic Machine Number & wa.me Live Preview */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Derived Machine &amp; Link Details
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="text-muted-foreground">Derived Machine Number:</span>
              <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border/60 self-start sm:self-auto">
                {derivedMachineNumber || "—"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Derived URL:</span>
              <span className="font-mono text-xs text-primary truncate max-w-full sm:max-w-[200px] break-all">
                {derivedWhatsAppUrl || "—"}
              </span>
            </div>
            {derivedWhatsAppUrl && (
              <a
                href={derivedWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#25D366] hover:underline pt-1 font-semibold"
              >
                <span>Test WhatsApp Link</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* SOCIAL MEDIA / WEBSITE LINKS SECTION */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl space-y-6 shadow-xs">
        <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe size={18} className="text-primary" />
              <span>Footer Social &amp; Custom Website Links</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage links displayed in the customer footer. Supported platforms render official vector icons and automatically validate URLs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer w-fit"
          >
            <Plus size={14} />
            <span>+ ADD LINK</span>
          </button>
        </div>

        {/* Add Link Form Modal / Dropdown */}
        {isAddOpen && (
          <div className="p-4 rounded-xl bg-secondary/60 border border-primary/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Add New Social / Website Link
              </span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Platform / Icon Type
                </label>
                <select
                  value={newProvider}
                  onChange={(e) => {
                    setNewProvider(e.target.value);
                    const opt = SUPPORTED_PROVIDERS.find((p) => p.key === e.target.value);
                    if (opt && !newName) setNewName(opt.label);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SUPPORTED_PROVIDERS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Official TikTok"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Target URL (optional)
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder={getPlaceholderForProvider(newProvider)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Add Link to Footer
              </button>
            </div>
          </div>
        )}

        {/* Links Cards List */}
        <div className="space-y-3.5">
          {links.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No social links configured yet. Click &quot;+ ADD LINK&quot; to add your first platform link.
            </div>
          ) : (
            links.map((link, idx) => {
              const statusInfo = getLinkStatusInfo(link.provider, link.url);

              return (
                <div
                  key={link.id}
                  className={`p-4 rounded-xl border transition-all ${
                    !link.is_active
                      ? "opacity-60 bg-muted/20 border-border/60"
                      : "bg-card border-border/80 shadow-xs hover:border-border"
                  }`}
                >
                  {/* Card Top: Provider identity + Status Badge + Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* SVG Icon Badge */}
                      <div className="w-9 h-9 rounded-full bg-[#0b1329] text-white flex items-center justify-center shrink-0 shadow-xs border border-white/10">
                        <SocialIcon provider={link.icon || link.provider} className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{link.name || link.provider}</span>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                            {link.provider}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                      {/* Live Status Badge */}
                      {statusInfo.badge}

                      {/* Move Up / Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded-md hover:bg-secondary transition-colors cursor-pointer"
                        title="Move Up"
                        aria-label={`Move ${link.name} up`}
                      >
                        <MoveUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === links.length - 1}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-20 rounded-md hover:bg-secondary transition-colors cursor-pointer"
                        title="Move Down"
                        aria-label={`Move ${link.name} down`}
                      >
                        <MoveDown size={14} />
                      </button>

                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(link.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                          link.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {link.is_active ? "Active" : "Inactive"}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(link.id)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                        title="Delete Link"
                        aria-label={`Delete ${link.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Editable URL Input with Clear & Test Link */}
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <label htmlFor={`url-input-${link.id}`} className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                        Profile URL
                      </label>
                      <div className="flex items-center gap-3">
                        {link.url && link.url.trim() ? (
                          <button
                            type="button"
                            onClick={() => handleClearUrl(link.id)}
                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors underline cursor-pointer"
                          >
                            Clear URL
                          </button>
                        ) : null}
                        {statusInfo.status === "valid" ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                          >
                            <span>Test Link</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        id={`url-input-${link.id}`}
                        type="text"
                        value={link.url || ""}
                        onChange={(e) => handleUrlChange(link.id, e.target.value)}
                        placeholder={getPlaceholderForProvider(link.provider)}
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-mono transition-all focus:outline-none focus:ring-2 bg-background ${
                          statusInfo.status === "invalid"
                            ? "border-destructive/60 focus:ring-destructive/20 focus:border-destructive text-destructive"
                            : statusInfo.status === "generic"
                            ? "border-amber-500/60 focus:ring-amber-500/20 focus:border-amber-500 text-foreground"
                            : "border-input focus:ring-primary/20 focus:border-primary text-foreground"
                        }`}
                      />
                    </div>

                    {/* Helper description / warning */}
                    <p className={`text-[11px] ${statusInfo.textColor}`}>
                      {statusInfo.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>Save Contact &amp; Social Links</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
