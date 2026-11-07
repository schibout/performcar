"use client";

import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { NotificationsView } from "@/components/notifications/NotificationsView";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { Permission } from "@/lib/types/permissions";

export function NotificationsContent() {
  const { t } = useTranslation("notifications");
  const { isReady, has } = usePermissions();
  const canRead = has(Permission.SelfNotificationsRead);

  return (
    <div className="mx-auto w-full max-w-480 space-y-6 p-4 sm:p-6 lg:p-8 xl:p-12">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("page.subtitle")}</p>
      </div>
      {!isReady && <Skeleton className="h-40 w-full" />}
      {isReady && canRead && <NotificationsView />}
      {isReady && !canRead && <PermissionNote text={t("restricted")} />}
    </div>
  );
}
