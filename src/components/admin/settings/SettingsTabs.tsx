import React from "react";
import { User, Building2, ShieldCheck, Sliders, Palette, Share2, FileText } from "lucide-react";

export interface SettingsTabsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  adminCount?: number;
}

export default function SettingsTabs({
  activeTab,
  onSelectTab,
  adminCount,
}: SettingsTabsProps) {
  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "branding", label: "Site Branding & Header", icon: Palette },
    { id: "social", label: "Social Links & WhatsApp", icon: Share2 },
    { id: "legal", label: "Legal Pages", icon: FileText },
    { id: "business", label: "Business & Documents", icon: Building2 },
    { id: "users", label: "Admin Management", icon: ShieldCheck, badge: adminCount },
    { id: "preferences", label: "System Preferences", icon: Sliders },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-2xl border border-border/60 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Icon size={15} className={isActive ? "text-primary" : ""} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
