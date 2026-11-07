"use client";

import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/lib/types/permissions";

import { AdminForbidden } from "./AdminForbidden";

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
}

// Route-level RBAC gate for an admin section. Renders the section only when the
// current user holds `permission` (superadmins always pass via usePermissions);
// otherwise shows the forbidden state. AdminShell guarantees the user is loaded
// and admin-tier before this renders, so no loading branch is needed here.
export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { has } = usePermissions();
  if (!has(permission)) return <AdminForbidden />;
  return <>{children}</>;
}
