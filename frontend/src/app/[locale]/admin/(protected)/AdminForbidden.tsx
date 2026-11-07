"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

// Shown when an admin lands on a section they lack the permission to view. The
// backend independently rejects the underlying API calls with 403; this is the
// user-facing reflection of that gate.
export function AdminForbidden() {
  const { t } = useTranslation("admin");
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t("permissionDenied.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("permissionDenied.description")}</p>
      </div>
    </div>
  );
}
