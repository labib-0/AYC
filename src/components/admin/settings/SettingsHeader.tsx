import React from "react";
import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";

export interface SettingsHeaderProps {
  activeTab: string;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  profile: {
    title: "Admin Profile & Security",
    subtitle: "Manage your administrator account credentials, contact information, and security preferences.",
  },
  business: {
    title: "Business & Company Profile",
    subtitle: "Configure official corporate identity, export warehouse addresses, and commercial document settings.",
  },
  users: {
    title: "Admin User Management",
    subtitle: "Oversee internal administrative personnel, sales desks, and access roles.",
  },
  preferences: {
    title: "System & Export Preferences",
    subtitle: "Manage default export trade terms, packaging carton specifications, and UI preferences.",
  },
};

export default function SettingsHeader({ activeTab }: SettingsHeaderProps) {
  const current = TAB_TITLES[activeTab] || {
    title: "Settings & Administration",
    subtitle: "Configure administrative controls and export system defaults.",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <SettingsIcon size={16} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {current.title}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={12} />
            <span>Admin Mode</span>
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {current.subtitle}
        </p>
      </div>
    </div>
  );
}
