"use client";

import React from "react";
import Link from "next/link";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

export interface AdminPageGateProps {
  children: React.ReactNode;
  permission?: string;
  anyOf?: string[];
  moduleName?: string;
}

/**
 * Page-level Direct URL Protection Gate.
 * Prevents unauthorized administrators from viewing or interacting with
 * restricted modules via manually entered browser URLs.
 */
export function AdminPageGate({
  children,
  permission,
  anyOf,
  moduleName,
}: AdminPageGateProps) {
  const { can, canAny, isSuperAdmin, loading, adminUser } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Verifying RBAC permissions…</p>
      </div>
    );
  }

  // Not logged in or not admin
  if (!adminUser || adminUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
        <p className="text-gray-600 max-w-md mb-8">
          You must be logged in as an authorized Ayaan Clothing administrator to view this page.
        </p>
        <Link
          href="/ayc"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-black transition-colors"
        >
          <ArrowLeft size={16} /> Return to Admin Portal
        </Link>
      </div>
    );
  }

  // Check permission
  const isAuthorized =
    isSuperAdmin ||
    (permission ? can(permission) : true) &&
    (anyOf && anyOf.length > 0 ? canAny(anyOf) : true);

  if (!isAuthorized) {
    const requiredStr = permission || anyOf?.join(" or ") || "restricted";

    return (
      <div className="flex flex-col items-center justify-center min-h-[550px] px-4 text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6 border border-amber-200 shadow-sm">
          <ShieldAlert size={32} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold uppercase tracking-wider mb-4">
          HTTP 403 Forbidden
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {moduleName ? `Access to ${moduleName} Restricted` : "Access Restricted"}
        </h1>
        <p className="text-gray-600 max-w-md mb-4 text-sm leading-relaxed">
          Your administrator account (<span className="font-semibold text-gray-800">{adminUser.email}</span>) does not possess the effective permission required to access this module.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-600 font-mono mb-8 max-w-md">
          Required Permission: <span className="font-semibold text-red-600">{requiredStr}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/ayc/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-black transition-colors shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AdminPageGate;
