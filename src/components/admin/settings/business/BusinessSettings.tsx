"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  MessageSquare,
  Landmark,
  FileText,
  Save,
  AlertCircle,
  ShieldCheck,
  Ship,
  FileCheck2,
  CheckCircle2,
  RefreshCw,
  Info,
  ExternalLink,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { siteSettingsService, DEFAULT_BUSINESS_SETTINGS } from "@/services/site-settings.service";
import { BusinessSettingsPayload, BankProfile } from "@/types/settings";

export interface BusinessSettingsProps {
  onNotify: (message: string) => void;
}

export default function BusinessSettings({ onNotify }: BusinessSettingsProps) {
  const [data, setData] = useState<BusinessSettingsPayload>(DEFAULT_BUSINESS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Bank profile editor state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<BankProfile> | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await siteSettingsService.getBusinessSettings();
        if (isMounted && fetched) {
          setData(fetched);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn("Could not load backend business settings:", err);
          setError("Notice: Displaying offline business profile defaults.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (
    section: keyof BusinessSettingsPayload,
    field: string,
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleResetWhatsApp = () => {
    handleChange("contact", "whatsapp", "+880 1620-853502");
    onNotify("WhatsApp number reset to official default (+880 1620-853502)");
  };

  // Resolve current active bank profiles
  const currentProfiles: BankProfile[] = (data.bank_profiles && data.bank_profiles.length > 0)
    ? data.bank_profiles
    : [
        {
          id: "profile_usd_default",
          name: `${data.banking?.bank_name || "Pubali Bank Limited"} (${(data.banking?.currency || "USD").toUpperCase()} Account)`,
          currency: (data.banking?.currency || "USD").toUpperCase(),
          bank_name: data.banking?.bank_name || "Pubali Bank Limited",
          account_title: data.banking?.account_name || "M/S AYAAN  CLOTHING",
          account_name: data.banking?.account_name || "M/S AYAAN  CLOTHING",
          account_number: data.banking?.account_number || "1788-901-044316",
          swift_code: data.banking?.swift_code || "PUBABDDH210",
          branch: data.banking?.branch_name || "Nawabpur Road Branch",
          branch_name: data.banking?.branch_name || "Nawabpur Road Branch",
          bank_address: data.banking?.branch_name || "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh",
          routing_number: data.banking?.routing_number || "175271894",
          notes: "Primary beneficiary wire instructions for foreign trade settlement.",
          is_active: true,
          is_default: true,
        },
      ];

  const updateProfiles = (newProfiles: BankProfile[]) => {
    const defaultProf = newProfiles.find((p) => p.is_default && p.is_active) || newProfiles[0];

    setData((prev) => ({
      ...prev,
      bank_profiles: newProfiles,
      banking: defaultProf
        ? {
            bank_name: defaultProf.bank_name,
            branch_name: defaultProf.bank_address || defaultProf.branch || "",
            account_name: defaultProf.account_title,
            account_number: defaultProf.account_number,
            swift_code: defaultProf.swift_code || "",
            routing_number: defaultProf.routing_number || "",
            currency: defaultProf.currency,
          }
        : prev.banking,
    }));
  };

  const handleSetDefaultProfile = (profileId: string) => {
    const updated = currentProfiles.map((p) => ({
      ...p,
      is_default: p.id === profileId,
      is_active: p.id === profileId ? true : p.is_active,
    }));
    updateProfiles(updated);
    onNotify("Default beneficiary bank profile updated.");
  };

  const handleToggleActiveProfile = (profileId: string) => {
    const target = currentProfiles.find((p) => p.id === profileId);
    if (!target) return;
    if (target.is_default && target.is_active) {
      setError("Cannot deactivate the default bank profile. Designate another active profile as default first.");
      return;
    }
    const updated = currentProfiles.map((p) =>
      p.id === profileId ? { ...p, is_active: !p.is_active } : p
    );
    updateProfiles(updated);
  };

  const handleDeleteProfile = (profileId: string) => {
    const target = currentProfiles.find((p) => p.id === profileId);
    if (!target) return;
    if (target.is_default) {
      setError("Cannot delete the default bank profile. Designate another profile as default first.");
      return;
    }
    if (currentProfiles.length <= 1) {
      setError("At least one beneficiary bank profile must remain configured.");
      return;
    }
    const updated = currentProfiles.filter((p) => p.id !== profileId);
    updateProfiles(updated);
    onNotify("Bank profile removed.");
  };

  const handleStartEditProfile = (profile: BankProfile) => {
    setIsCreatingProfile(false);
    setEditingProfileId(profile.id);
    setProfileForm({ ...profile });
  };

  const handleStartAddProfile = () => {
    setIsCreatingProfile(true);
    setEditingProfileId(null);
    setProfileForm({
      id: `prof_${Date.now()}`,
      name: "",
      currency: "EUR",
      bank_name: "",
      account_title: data.company?.name || "M/S AYAAN  CLOTHING",
      account_number: "",
      swift_code: "",
      branch: "",
      bank_address: "",
      routing_number: "",
      notes: "",
      is_active: true,
      is_default: false,
    });
  };

  const handleCancelProfileForm = () => {
    setIsCreatingProfile(false);
    setEditingProfileId(null);
    setProfileForm(null);
  };

  const handleSaveProfileForm = () => {
    if (!profileForm) return;
    if (!profileForm.bank_name?.trim() || !profileForm.account_number?.trim() || !profileForm.currency) {
      setError("Bank Name, Account Number, and Settlement Currency are required.");
      return;
    }

    const cur = (profileForm.currency || "USD").toUpperCase();
    const isDefault = Boolean(profileForm.is_default);

    if (profileForm.is_active) {
      const duplicate = currentProfiles.find(
        (p) => p.id !== profileForm.id && p.currency.toUpperCase() === cur && p.is_active
      );
      if (duplicate) {
        setError(`An active profile already exists for currency ${cur} (${duplicate.name}). Please deactivate existing duplicate first.`);
        return;
      }
    }

    const fullProfile: BankProfile = {
      id: profileForm.id || `prof_${Date.now()}`,
      name: profileForm.name?.trim() || `${profileForm.bank_name} (${cur} Account)`,
      currency: cur,
      bank_name: profileForm.bank_name.trim(),
      account_title: profileForm.account_title?.trim() || "M/S AYAAN  CLOTHING",
      account_name: profileForm.account_title?.trim() || "M/S AYAAN  CLOTHING",
      account_number: profileForm.account_number.trim(),
      swift_code: profileForm.swift_code?.trim() || "",
      branch: profileForm.branch?.trim() || "",
      branch_name: profileForm.branch?.trim() || "",
      bank_address: profileForm.bank_address?.trim() || "",
      routing_number: profileForm.routing_number?.trim() || "",
      notes: profileForm.notes?.trim() || "",
      is_active: profileForm.is_active !== false,
      is_default: isDefault,
    };

    let updatedList: BankProfile[];
    if (isCreatingProfile) {
      if (isDefault) {
        updatedList = currentProfiles.map((p) => ({ ...p, is_default: false })).concat([fullProfile]);
      } else {
        updatedList = [...currentProfiles, fullProfile];
      }
    } else {
      updatedList = currentProfiles.map((p) => {
        if (p.id === fullProfile.id) {
          return fullProfile;
        }
        return isDefault ? { ...p, is_default: false } : p;
      });
    }

    updateProfiles(updatedList);
    handleCancelProfileForm();
    onNotify(isCreatingProfile ? "New bank profile added." : "Bank profile updated.");
  };

  const handleResetBanking = () => {
    const defaultProf: BankProfile = {
      id: "profile_usd_default",
      name: "Pubali Bank Limited (USD Account)",
      currency: "USD",
      bank_name: "Pubali Bank Limited",
      account_title: "M/S AYAAN  CLOTHING",
      account_name: "M/S AYAAN  CLOTHING",
      account_number: "1788-901-044316",
      swift_code: "PUBABDDH210",
      branch: "Nawabpur Road Branch",
      branch_name: "Nawabpur Road Branch",
      bank_address: "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh",
      routing_number: "175271894",
      notes: "Primary beneficiary wire instructions for foreign trade settlement.",
      is_active: true,
      is_default: true,
    };
    setData((prev) => ({
      ...prev,
      bank_profiles: [defaultProf],
      banking: {
        bank_name: defaultProf.bank_name,
        branch_name: defaultProf.bank_address || "",
        account_name: defaultProf.account_title,
        account_number: defaultProf.account_number,
        swift_code: defaultProf.swift_code || "",
        routing_number: defaultProf.routing_number || "",
        currency: defaultProf.currency,
      },
    }));
    onNotify("Beneficiary bank credentials reset to official Pubali Bank defaults");
  };

  const handleResetDefaults = () => {
    setData((prev) => ({
      ...prev,
      document_defaults: {
        ...prev.document_defaults,
        country_of_origin: "Bangladesh",
        port_of_loading: "Chattogram Sea Port / Hazrat Shahjalal Int. Airport, Dhaka",
        air_port_of_loading: "Hazrat Shahjalal International Airport (DAC), Dhaka",
        sea_port_of_loading: "Chattogram Sea Port (CGP), Bangladesh",
        place_of_receipt: "Uttara Corporate Office / Dhaka Hub, Bangladesh",
        incoterm_default: "FOB Chattogram",
        payment_terms_default: "100% Irrevocable Confirmed Letter of Credit (L/C) at sight or 30% TT advance, balance upon copy BL",
        declaration_text: "We certify that the goods mentioned in this invoice are of Bangladesh origin and the particulars provided are true and correct.",
      },
    }));
    onNotify("Logistics & document defaults reset to baseline specifications");
  };

  // Derive normalized WhatsApp digits and link for live preview
  const rawWaDigits = (data.contact?.whatsapp || "").replace(/\D+/g, "");
  const canonicalWaDigits = rawWaDigits.startsWith("880")
    ? rawWaDigits
    : rawWaDigits.startsWith("0")
    ? `880${rawWaDigits.slice(1)}`
    : `880${rawWaDigits}`;
  const canonicalWaUrl = `https://wa.me/${canonicalWaDigits || "8801620853502"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!data.company?.name?.trim()) {
      setError("Company Name is required.");
      return;
    }
    if (!data.contact?.email?.trim()) {
      setError("Official Export Email is required.");
      return;
    }

    // Validate bank profiles
    if (!currentProfiles.some((p) => p.is_default && p.is_active)) {
      setError("At least one active beneficiary bank profile must be designated as the default settlement account.");
      return;
    }

    setSaving(true);
    try {
      const payloadToSave: BusinessSettingsPayload = {
        ...data,
        bank_profiles: currentProfiles,
      };
      const updated = await siteSettingsService.updateBusinessSettings(payloadToSave);
      if (updated) {
        setData(updated);
      }
      setLastSaved(new Date());

      // Propagate immediately to client-side runtime cache and trigger cross-tab storage event
      if (typeof window !== "undefined") {
        try {
          const rawNum = (data.contact?.whatsapp || "").replace(/\D+/g, "");
          const canonical = rawNum.startsWith("880")
            ? rawNum
            : rawNum.startsWith("0")
            ? `880${rawNum.slice(1)}`
            : `880${rawNum}`;
          const currentCache = localStorage.getItem("ayaan_site_settings_cache");
          const parsed = currentCache ? JSON.parse(currentCache) : {};
          parsed.whatsapp = {
            display: data.contact?.whatsapp || "+880 1620-853502",
            number: canonical || "8801620853502",
            url: `https://wa.me/${canonical || "8801620853502"}`,
          };
          if (data.company?.name) parsed.site_title = data.company.name;
          localStorage.setItem("ayaan_site_settings_cache", JSON.stringify(parsed));
          localStorage.setItem("ayaan_site_settings_updated", String(Date.now()));
          window.dispatchEvent(new Event("storage"));
        } catch {}
      }

      onNotify("Business & Document information updated successfully.");
    } catch (err: unknown) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to update business settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-card border border-border/80 rounded-2xl">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">
          Loading authoritative business &amp; document settings...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Banner / Notice */}
      <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Business &amp; Document Control Center
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Phase 1 Master Source
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Centralized source of truth for all corporate, exporter, banking, and trade details embedded into
            Commercial Invoices (CI), Proforma Invoices (PI), Offer Sheets, Invoices, and Quotations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastSaved && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1 font-mono">
              <CheckCircle2 size={13} className="text-emerald-500" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? "Saving Changes..." : "Save All Settings"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: COMPANY MASTER DATA */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Company Identity &amp; Exporter Name</h3>
              <p className="text-xs text-muted-foreground">
                Consumed by: CI, PI, Offer Sheet, Sales Invoice, RFQ Quotations.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider font-mono">
            PUBLIC WEBSITE &amp; DOCUMENTS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Official Company / Exporter Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={data.company?.name || ""}
              onChange={(e) => handleChange("company", "name", e.target.value)}
              placeholder="Ayaan Clothing Ltd."
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Legal / Trading Entity Name</label>
            <input
              type="text"
              value={data.company?.legal_name || ""}
              onChange={(e) => handleChange("company", "legal_name", e.target.value)}
              placeholder="M/S Ayaan Clothing Ltd."
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">Corporate Tagline / Description</label>
            <input
              type="text"
              value={data.company?.tagline || ""}
              onChange={(e) => handleChange("company", "tagline", e.target.value)}
              placeholder="Premium Knitwear & Ready-Made Garments Manufacturer & Exporter"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Corporate Website</label>
            <div className="relative">
              <input
                type="text"
                value={data.company?.website || ""}
                onChange={(e) => handleChange("company", "website", e.target.value)}
                placeholder="https://ayaanclothing.com"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Document Logo URL</label>
            <input
              type="text"
              value={data.company?.logo_url || ""}
              onChange={(e) => handleChange("company", "logo_url", e.target.value)}
              placeholder="/images/logo.png"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Tip: Upload brand logo files under the Site Branding &amp; Header tab.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTACT & AUTHORITATIVE WHATSAPP */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Phone size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Document &amp; Corporate Contact Details</h3>
              <p className="text-xs text-muted-foreground">
                Authoritative source for document headers/footers and customer communications.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider font-mono">
            PUBLIC WEBSITE &amp; DOCUMENTS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">Registered Office Address</label>
            <div className="relative">
              <input
                type="text"
                value={data.contact?.office_address || ""}
                onChange={(e) => handleChange("contact", "office_address", e.target.value)}
                placeholder="House #12, Road #4, Sector #3, Uttara, Dhaka-1230, Bangladesh"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">City &amp; Postal Code</label>
            <input
              type="text"
              value={data.contact?.city || ""}
              onChange={(e) => handleChange("contact", "city", e.target.value)}
              placeholder="Dhaka-1230"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Country</label>
            <input
              type="text"
              value={data.contact?.country || ""}
              onChange={(e) => handleChange("contact", "country", e.target.value)}
              placeholder="Bangladesh"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Direct Export Telephone</label>
            <div className="relative">
              <input
                type="text"
                value={data.contact?.phone || ""}
                onChange={(e) => handleChange("contact", "phone", e.target.value)}
                placeholder="+880 1620-853502"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
              />
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Official Export Email <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={data.contact?.email || ""}
                onChange={(e) => handleChange("contact", "email", e.target.value)}
                placeholder="export@ayaanclothing.com"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Authoritative WhatsApp Configuration */}
          <div className="sm:col-span-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-600 dark:text-emerald-400" />
                <label className="text-xs font-bold text-foreground">
                  Authoritative WhatsApp Business Number
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  PUBLIC WEBSITE
                </span>
                <button
                  type="button"
                  onClick={handleResetWhatsApp}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer border border-border"
                  title="Reset to official default (+880 1620-853502)"
                >
                  <RotateCcw size={10} />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <input
                  type="text"
                  value={data.contact?.whatsapp || ""}
                  onChange={(e) => handleChange("contact", "whatsapp", e.target.value)}
                  placeholder="+880 1620-853502"
                  className="w-full px-3.5 py-2 bg-card border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-mono font-bold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Standard format: <code>+880 1620-853502</code>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/80 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Canonical Digits:</span>
                  <span className="font-mono font-bold text-foreground">{canonicalWaDigits || "8801620853502"}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] truncate">
                  <span className="text-muted-foreground">Generated URL:</span>
                  <a
                    href={canonicalWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                  >
                    <span>{canonicalWaUrl}</span>
                    <ExternalLink size={10} className="shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: EXPORT & STATUTORY REGISTRATIONS */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Export &amp; Statutory Business Identifiers</h3>
              <p className="text-xs text-muted-foreground">
                Embedded directly into Commercial Invoices (CI), Proforma Invoices (PI), and Customs declarations.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider font-mono">
            DOCUMENT ONLY
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Trade License Number</label>
            <input
              type="text"
              value={data.legal?.trade_license || ""}
              onChange={(e) => handleChange("legal", "trade_license", e.target.value)}
              placeholder="TRAD/DNCC/012458/2022"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">BIN / VAT Registration</label>
            <input
              type="text"
              value={data.legal?.bin_vat || ""}
              onChange={(e) => handleChange("legal", "bin_vat", e.target.value)}
              placeholder="002345891-0101"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">TIN Number</label>
            <input
              type="text"
              value={data.legal?.tin_number || ""}
              onChange={(e) => handleChange("legal", "tin_number", e.target.value)}
              placeholder="124589632514"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">ERC (Export Registration Certificate)</label>
            <input
              type="text"
              value={data.legal?.erc_number || ""}
              onChange={(e) => handleChange("legal", "erc_number", e.target.value)}
              placeholder="26-024589"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">IRC (Import Registration Certificate)</label>
            <input
              type="text"
              value={data.legal?.irc_number || ""}
              onChange={(e) => handleChange("legal", "irc_number", e.target.value)}
              placeholder="26-015894"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">BGMEA Membership Number</label>
            <input
              type="text"
              value={data.legal?.bgmea_reg || ""}
              onChange={(e) => handleChange("legal", "bgmea_reg", e.target.value)}
              placeholder="BGMEA-REG-8954"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
            <label className="text-xs font-semibold text-foreground">Certificate of Incorporation No.</label>
            <input
              type="text"
              value={data.legal?.incorporation_number || ""}
              onChange={(e) => handleChange("legal", "incorporation_number", e.target.value)}
              placeholder="C-158945/2021"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: BENEFICIARY BANK DETAILS & MULTI-CURRENCY PROFILES */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Landmark size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Beneficiary Bank Wire Instructions</h3>
              <p className="text-xs text-muted-foreground">
                Multi-currency export settlement accounts dynamically matched to Commercial Invoices (CI), Proforma Invoices (PI), and Quotations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider font-mono">
              <ShieldCheck size={12} />
              <span>DOCUMENT ONLY / PRIVATE</span>
            </span>
            <button
              type="button"
              onClick={handleStartAddProfile}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={13} />
              <span>Add Currency Profile</span>
            </button>
            <button
              type="button"
              onClick={handleResetBanking}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer border border-border"
              title="Reset banking credentials to official Pubali Bank defaults"
            >
              <RotateCcw size={10} />
              <span>Reset Bank</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Info size={15} className="shrink-0 mt-0.5" />
          <p>
            <strong>Multi-Currency Routing Notice:</strong> When documents are generated, the system automatically binds wire instructions to the document&apos;s settlement currency (e.g. USD, EUR, GBP, BDT). Unmatched currencies gracefully fall back to the designated primary default profile. Private account credentials are never exposed via the public storefront API.
          </p>
        </div>

        {/* INLINE PROFILE FORM (ADDING OR EDITING) */}
        {profileForm && (
          <div className="p-5 rounded-xl bg-secondary/30 border border-primary/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-primary">
                  {isCreatingProfile ? "New Bank Settlement Profile" : `Edit Profile: ${profileForm.name || "Bank Account"}`}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {profileForm.currency || "USD"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelProfileForm}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Cancel"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Profile Label / Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.name || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="e.g. Pubali Bank - USD Export Settlement"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Settlement Currency <span className="text-destructive">*</span>
                </label>
                <select
                  value={profileForm.currency || "USD"}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, currency: e.target.value.toUpperCase() } : null)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase font-bold"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="BDT">BDT - Bangladeshi Taka</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Bank Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.bank_name || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, bank_name: e.target.value } : null)}
                  placeholder="e.g. Standard Chartered Bank"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Beneficiary Account Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.account_title || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, account_title: e.target.value } : null)}
                  placeholder="M/S AYAAN  CLOTHING"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Account Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.account_number || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, account_number: e.target.value } : null)}
                  placeholder="e.g. 1788-901-044316"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">SWIFT / BIC Code</label>
                <input
                  type="text"
                  value={profileForm.swift_code || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, swift_code: e.target.value } : null)}
                  placeholder="PUBABDDH210"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Branch</label>
                <input
                  type="text"
                  value={profileForm.branch || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, branch: e.target.value } : null)}
                  placeholder="Nawabpur Road Branch"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Routing / Clearing No.</label>
                <input
                  type="text"
                  value={profileForm.routing_number || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, routing_number: e.target.value } : null)}
                  placeholder="175271894"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <label className="text-xs font-semibold text-foreground">Bank Address</label>
                <input
                  type="text"
                  value={profileForm.bank_address || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, bank_address: e.target.value } : null)}
                  placeholder="125 Nawabpur Road, Dhaka-1100, Bangladesh"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 md:col-span-3">
                <label className="text-xs font-semibold text-foreground">Wire Instructions / Notes</label>
                <input
                  type="text"
                  value={profileForm.notes || ""}
                  onChange={(e) => setProfileForm((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="e.g. Please specify invoice number in wire transfer description field."
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3 flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={profileForm.is_active !== false}
                    onChange={(e) => setProfileForm((prev) => prev ? { ...prev, is_active: e.target.checked } : null)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Active Profile</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(profileForm.is_default)}
                    onChange={(e) => setProfileForm((prev) => prev ? { ...prev, is_default: e.target.checked } : null)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Designate as Default Fallback Profile</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={handleCancelProfileForm}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfileForm}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Check size={13} />
                <span>Apply Profile Changes</span>
              </button>
            </div>
          </div>
        )}

        {/* PROFILES LIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Configured Beneficiary Bank Profiles ({currentProfiles.length})</span>
            <span className="text-[11px] font-normal text-muted-foreground/80">
              Matched automatically by document currency
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentProfiles.map((prof) => {
              const cur = prof.currency.toUpperCase();
              const badgeColors =
                cur === "USD"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : cur === "EUR"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : cur === "GBP"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

              return (
                <div
                  key={prof.id}
                  className={`p-4 rounded-xl border transition-all ${
                    prof.is_default
                      ? "bg-primary/5 border-primary/40 shadow-xs"
                      : prof.is_active
                      ? "bg-card border-border/80"
                      : "bg-muted/30 border-dashed border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${badgeColors}`}>
                        {cur}
                      </span>
                      <span className="font-semibold text-sm text-foreground">{prof.name}</span>
                      {prof.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-500/30">
                          <Check size={10} />
                          <span>DEFAULT FALLBACK</span>
                        </span>
                      )}
                      {!prof.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          INACTIVE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!prof.is_default && prof.is_active && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultProfile(prof.id)}
                          className="text-[11px] font-medium px-2 py-0.5 rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEditProfile(prof)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Edit profile"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActiveProfile(prof.id)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                          prof.is_active
                            ? "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                            : "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20"
                        }`}
                        title={prof.is_active ? "Deactivate profile" : "Activate profile"}
                      >
                        {prof.is_active ? "Deactivate" : "Activate"}
                      </button>
                      {!prof.is_default && currentProfiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(prof.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Delete profile"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 pt-2.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Bank Name
                      </span>
                      <span className="font-medium text-foreground">{prof.bank_name}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Account Title
                      </span>
                      <span className="font-medium text-foreground">{prof.account_title}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Account Number
                      </span>
                      <span className="font-mono font-bold text-foreground">{prof.account_number}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        SWIFT / BIC
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {prof.swift_code || "N/A"}
                      </span>
                    </div>

                    {(prof.branch || prof.bank_address) && (
                      <div className="sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          Branch &amp; Address
                        </span>
                        <span className="text-muted-foreground">
                          {[prof.branch, prof.bank_address].filter(Boolean).join(" • ")}
                        </span>
                      </div>
                    )}

                    {prof.routing_number && (
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          Routing Number
                        </span>
                        <span className="font-mono text-muted-foreground">{prof.routing_number}</span>
                      </div>
                    )}

                    {prof.notes && (
                      <div className="sm:col-span-2 md:col-span-4 pt-1 border-t border-border/40 text-[11px] text-muted-foreground italic">
                        Note: {prof.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 5: DOCUMENT & LOGISTICS DEFAULTS */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Ship size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Document Logistics &amp; Legal Defaults</h3>
              <p className="text-xs text-muted-foreground">
                Default fallback values used when individual orders or invoices do not specify custom logistics terms.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider font-mono">
              DOCUMENT ONLY
            </span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer border border-border"
              title="Reset logistics and document defaults"
            >
              <RotateCcw size={10} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Port of Loading (POL)</label>
            <input
              type="text"
              value={data.document_defaults?.port_of_loading || ""}
              onChange={(e) => handleChange("document_defaults", "port_of_loading", e.target.value)}
              placeholder="Chattogram Sea Port / Hazrat Shahjalal Int. Airport, Dhaka"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Country of Origin</label>
            <input
              type="text"
              value={data.document_defaults?.country_of_origin || ""}
              onChange={(e) => handleChange("document_defaults", "country_of_origin", e.target.value)}
              placeholder="Bangladesh"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Default Incoterm</label>
            <input
              type="text"
              value={data.document_defaults?.incoterm_default || ""}
              onChange={(e) => handleChange("document_defaults", "incoterm_default", e.target.value)}
              placeholder="FOB Chattogram"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Default Payment Terms Statement</label>
            <input
              type="text"
              value={data.document_defaults?.payment_terms_default || ""}
              onChange={(e) => handleChange("document_defaults", "payment_terms_default", e.target.value)}
              placeholder="100% Irrevocable Confirmed Letter of Credit (L/C) at sight or 30% TT advance"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">Document Legal Declaration Text</label>
            <textarea
              rows={2}
              value={data.document_defaults?.declaration_text || ""}
              onChange={(e) => handleChange("document_defaults", "declaration_text", e.target.value)}
              placeholder="We certify that the goods mentioned in this invoice are of Bangladesh origin and the particulars provided are true and correct."
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Authorized Signatory Name</label>
            <input
              type="text"
              value={data.document_defaults?.authorized_signatory_name || ""}
              onChange={(e) => handleChange("document_defaults", "authorized_signatory_name", e.target.value)}
              placeholder="Authorized Representative"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Authorized Signatory Title</label>
            <input
              type="text"
              value={data.document_defaults?.authorized_signatory_title || ""}
              onChange={(e) => handleChange("document_defaults", "authorized_signatory_title", e.target.value)}
              placeholder="Managing Director / Commercial Head"
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Bottom Save Button Bar */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground italic">
            Dynamic buyer details (Buyer Name, Order Items, Pricing) remain strictly customer- and order-specific.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? "Saving Changes..." : "Save All Settings"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
