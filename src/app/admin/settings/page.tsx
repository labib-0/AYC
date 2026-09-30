"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { mockStore } from "@/lib/mock-data/mock-store";
import { adminUserService } from "@/services/admin/admin-user.service";
import { isFrontendOnly } from "@/lib/frontend-mode";
import {
  SettingsHeader,
  SettingsTabs,
  ProfileSettings,
  StorefrontBrandingSettings,
  SocialLinksSettings,
  LegalPagesAdminSettings,
  BusinessSettings,
  AdminUsersSettings,
  SystemPreferencesSettings,
} from "@/components/admin/settings";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabFromQuery || "profile");
  const [adminCount, setAdminCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  // Calculate admin user count for tab badge
  useEffect(() => {
    const updateCount = async () => {
      try {
        const admins = await adminUserService.getAdminUsers();
        setAdminCount(admins.length);
        return;
      } catch {
        // Fallback below
      }
      const allUsers = mockStore.getUsers();
      const count = allUsers.filter((u) => u.role === "admin").length;
      setAdminCount(count);
    };

    updateCount();
    // Listen to local storage changes or tab switches to keep badge updated
    window.addEventListener("storage", updateCount);
    return () => window.removeEventListener("storage", updateCount);
  }, [activeTab]);

  const addToast = (type: "success" | "error", message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNotify = (message: string) => {
    addToast("success", message);
  };

  return (
    <AdminPageGate permission="settings.view" moduleName="System Settings">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <SettingsHeader activeTab={activeTab} />

        {/* Tabs */}
        <SettingsTabs
          activeTab={activeTab}
          onSelectTab={(tab: string) => setActiveTab(tab)}
          adminCount={adminCount}
        />

        {/* Tab Panels */}
        <div className="transition-opacity duration-200">
          {activeTab === "profile" && <ProfileSettings onNotify={handleNotify} />}
          {activeTab === "branding" && <StorefrontBrandingSettings onNotify={handleNotify} />}
          {activeTab === "social" && <SocialLinksSettings onNotify={handleNotify} />}
          {activeTab === "legal" && <LegalPagesAdminSettings onNotify={handleNotify} />}
          {activeTab === "business" && <BusinessSettings onNotify={handleNotify} />}
          {activeTab === "users" && <AdminUsersSettings onNotify={handleNotify} />}
          {activeTab === "preferences" && <SystemPreferencesSettings onNotify={handleNotify} />}
        </div>

        {/* Toasts */}
        <ProductToast toasts={toasts} onDismiss={removeToast} />
      </div>
    </AdminPageGate>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
