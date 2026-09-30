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
  Check,
  Globe,
} from "lucide-react";
import { siteSettingsService } from "@/services/site-settings.service";
import SocialIcon from "@/components/common/SocialIcon";
import { SocialLink } from "@/types/settings";

interface SocialLinksSettingsProps {
  onNotify: (message: string) => void;
}

const SUPPORTED_PROVIDERS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "tiktok", label: "TikTok" },
  { key: "pinterest", label: "Pinterest" },
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "website", label: "Custom Website / Link" },
];

export default function SocialLinksSettings({ onNotify }: SocialLinksSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp Display Number
  const [whatsappDisplay, setWhatsappDisplay] = useState("+880 1982-183886");
  const [siteTitle, setSiteTitle] = useState("AYAAN CLOTHING");
  const [footerDesc, setFooterDesc] = useState("");

  // Social Links List
  const [links, setLinks] = useState<SocialLink[]>([]);

  // Add Link Modal/Drawer state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProvider, setNewProvider] = useState("facebook");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Derive machine number client-side for live instant feedback (mirrors backend normalization)
  const deriveClientMachineNumber = (display: string): string => {
    const raw = (display || "").trim();
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return "";
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
          setWhatsappDisplay(data.whatsapp_display || "+880 1982-183886");
          setSiteTitle(data.site_title || "AYAAN CLOTHING");
          setFooterDesc(data.footer_description || "");
          setLinks(data.social_links || []);
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
    if (!newUrl.trim()) return;

    // Validate URL
    let formattedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch {
      setError("Please enter a valid web URL (e.g. https://instagram.com/yourbrand).");
      return;
    }

    const providerObj = SUPPORTED_PROVIDERS.find((p) => p.key === newProvider);
    const finalName = newName.trim() || providerObj?.label || "Social Link";

    const newLinkItem: SocialLink = {
      id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      provider: newProvider,
      name: finalName,
      url: formattedUrl,
      icon: newProvider,
      is_active: true,
      sort_order: links.length + 1,
    };

    setLinks((prev) => [...prev, newLinkItem]);
    setNewName("");
    setNewUrl("");
    setNewProvider("facebook");
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
              placeholder="e.g. +880 1982-183886"
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
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Derived Machine Number:</span>
              <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border/60">
                {derivedMachineNumber || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Derived URL:</span>
              <span className="font-mono text-xs text-primary truncate max-w-[200px]">
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
              Manage links displayed in the customer footer. Supported platforms automatically select matching vector SVG icons.
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
                className="text-xs text-muted-foreground hover:text-foreground"
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
                  placeholder="e.g. Official Facebook"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Target URL
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Add Link to Footer
              </button>
            </div>
          </div>
        )}

        {/* Links Table */}
        <div className="overflow-x-auto">
          {links.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No social links configured yet. Click &quot;+ ADD LINK&quot; to add your first platform link.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-background">
              {links.map((link, idx) => (
                <div
                  key={link.id}
                  className={`p-3 sm:p-4 flex items-center justify-between gap-3 text-xs sm:text-sm ${
                    !link.is_active ? "opacity-50 bg-secondary/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* SVG Icon Badge */}
                    <div className="w-8 h-8 rounded-full bg-[#0b1329] text-white flex items-center justify-center shrink-0 shadow-xs border border-white/10">
                      <SocialIcon provider={link.icon || link.provider} className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{link.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary px-1.5 py-0.2 rounded">
                          {link.provider}
                        </span>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate block max-w-xs sm:max-w-md"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>

                  {/* Actions & Toggles */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Move Up / Down */}
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move Up"
                    >
                      <MoveUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === links.length - 1}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move Down"
                    >
                      <MoveDown size={15} />
                    </button>

                    {/* Active Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(link.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
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
                      className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete Link"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
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
