"use client";

import { useTranslation } from "react-i18next";

import { BroadcastComposer } from "@/components/admin/broadcasts/BroadcastComposer";
import { BroadcastHistory } from "@/components/admin/broadcasts/BroadcastHistory";
import { useCanReadBroadcasts, useCanWriteBroadcasts } from "@/hooks/use-permissions";

import { AdminForbidden } from "../AdminForbidden";

export function BroadcastsContent() {
  const { t } = useTranslation("broadcasts");
  const canRead = useCanReadBroadcasts();
  const canWrite = useCanWriteBroadcasts();

  if (!canRead) return <AdminForbidden />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>
      {canWrite ? <BroadcastComposer /> : null}
      <BroadcastHistory />
    </div>
  );
}
