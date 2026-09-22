"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { mockStore } from "@/lib/mock-data/mock-store";
import {
  SettingsHeader,
  SettingsTabs,
  ProfileSettings,
  BusinessSettings,
  AdminUsersSettings,
  SystemPreferencesSettings,
} from "@/components/admin/settings";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Calculate admin user count for tab badge
  useEffect(() => {
    const updateCount = () => {
      const allUsers = mockStore.getUsers();
      const count = allUsers.filter((u) => u.role === "admin" || u.role === "sales").length;
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
        {activeTab === "business" && <BusinessSettings onNotify={handleNotify} />}
        {activeTab === "users" && <AdminUsersSettings onNotify={handleNotify} />}
        {activeTab === "preferences" && <SystemPreferencesSettings onNotify={handleNotify} />}
      </div>

      {/* Toasts */}
      <ProductToast toasts={toasts} onDismiss={removeToast} />
    </div>
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
