"use client";

import React from "react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: React.ReactNode;
}

/**
 * Action-level UI Permission Gate.
 * Conditionally renders children if the current authenticated administrator
 * possesses the required granular permission(s).
 */
export function PermissionGate({
  children,
  permission,
  anyOf,
  allOf,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll, isSuperAdmin, loading } = useAdminAuth();

  if (loading) {
    return null;
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  if (anyOf && anyOf.length > 0 && !canAny(anyOf)) {
    return <>{fallback}</>;
  }

  if (allOf && allOf.length > 0 && !canAll(allOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGate;
