"use client";

import { useTranslation } from "react-i18next";

import { NotificationsView } from "@/components/notifications/NotificationsView";

export function AdminNotificationsContent() {
  const { t } = useTranslation("notifications");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("page.subtitle")}</p>
      </div>
      <NotificationsView />
    </div>
  );
}
