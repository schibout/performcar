"use client";

import { Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Full-page screen shown to non-admins while maintenance mode is on. */
export function MaintenanceScreen() {
  const { t } = useTranslation("systemSettings");

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Wrench className="size-7 text-muted-foreground" />
      </span>
      <h1 className="text-2xl font-semibold">{t("maintenance.title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("maintenance.description")}</p>
    </div>
  );
}
