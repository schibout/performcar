"use client";

import { useState } from "react";

import { useTranslation } from "react-i18next";

import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { useBroadcasts } from "@/hooks/api/use-broadcasts";
import { announcementTitle } from "@/lib/announcement-render";
import { formatDateTime } from "@/lib/format-date";
import type {
  AnnouncementLanguage,
  AnnouncementLevel,
  AnnouncementRead,
} from "@/lib/types/announcement";

const LEVEL_TONE: Record<AnnouncementLevel, "info" | "warning" | "danger"> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

function creatorName(item: AnnouncementRead): string | null {
  if (!item.creator) return null;
  const full = `${item.creator.first_name ?? ""} ${item.creator.last_name ?? ""}`.trim();
  return full || item.creator.email;
}

export function BroadcastHistory() {
  const { t, i18n } = useTranslation("broadcasts");
  const lang = (i18n.language.split("-")[0] ?? "en") as AnnouncementLanguage;
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const { data, isLoading, isFetching } = useBroadcasts({ skip, limit: pageSize });

  const rows = data?.data ?? [];

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="p-0">
        <div className="border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("admin.history.title")}</h2>
        </div>

        {!isLoading && rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{t("admin.history.empty")}</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {rows.map((item) => {
              const sender = creatorName(item);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <StatusBadge tone={LEVEL_TONE[item.level]}>
                    {t(`admin.form.level.${item.level}`)}
                  </StatusBadge>
                  <span className="font-medium">{announcementTitle(t, lang, item)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`admin.form.audience.${item.audience}`)}
                  </span>
                  {sender ? (
                    <span className="text-xs text-muted-foreground">
                      {t("admin.history.sentBy", { name: sender })}
                    </span>
                  ) : null}
                  {item.send_email ? (
                    <StatusBadge tone="muted">{t("admin.history.emailed")}</StatusBadge>
                  ) : null}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(item.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {data ? (
          <div
            className="px-4 pb-4 pt-2"
            aria-live="polite"
            aria-busy={isFetching ? "true" : "false"}
          >
            <AdminPagination
              total={data.total}
              skip={skip}
              limit={pageSize}
              onChange={setSkip}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setSkip(0);
              }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
