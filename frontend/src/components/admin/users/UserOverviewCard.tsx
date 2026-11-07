"use client";

import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format-date";
import type { AdminUser } from "@/lib/types/admin";

export function UserOverviewCard({ user }: { user: AdminUser }) {
  const { t } = useTranslation("admin");

  const rows: { label: string; value: string }[] = [
    { label: t("userDetail.overview.id"), value: user.id.slice(0, 12) },
    { label: t("userDetail.overview.created"), value: formatDateTime(user.created_at) },
    { label: t("userDetail.overview.updated"), value: formatDateTime(user.updated_at) },
    { label: t("userDetail.overview.deactivated"), value: formatDateTime(user.deactivated_at) },
    {
      label: t("userDetail.overview.scheduledDeletion"),
      value: formatDateTime(user.deletion_scheduled_at),
    },
  ];

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("userDetail.overviewTitle")}</CardTitle>
        <CardDescription>{t("userDetail.overviewDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-mono text-xs">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
