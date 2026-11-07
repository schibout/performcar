"use client";

import { useMemo, useState } from "react";

import { Inbox } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { InboxRow } from "@/components/notifications/InboxRow";
import { notificationTargetPath } from "@/components/notifications/notification-text";
import {
  NotificationsToolbar,
  type ReadFilter,
} from "@/components/notifications/NotificationsToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/api/use-notifications";
import {
  getLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  isAdminPath,
} from "@/lib/config/routes";
import type { NotificationItem } from "@/lib/types/notification";

export function NotificationsView() {
  const { t } = useTranslation("notifications");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const isAdmin = isAdminPath(getPathWithoutLocale(pathname));

  const [filter, setFilter] = useState<ReadFilter>("all");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const params = useMemo(
    () => ({
      skip,
      limit: pageSize,
      unread_only: filter === "unread" ? true : undefined,
    }),
    [skip, pageSize, filter],
  );

  const { data, isLoading, isFetching } = useNotifications(params);
  const { data: unread } = useUnreadCount();
  const markRead = useMarkNotificationRead();

  const unreadCount = unread?.unread_count ?? 0;
  const items = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read_at) {
      markRead.mutate(item.id);
    }
    const target = notificationTargetPath(item, isAdmin);
    if (target) {
      router.push(getLocalizedPath(target, currentLocale));
    }
  };

  let body = (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  );
  if (!isLoading || data) {
    body =
      items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-muted-foreground">
          <Inbox className="h-7 w-7" />
          <span className="text-sm">{t("empty")}</span>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <InboxRow key={item.id} item={item} onClick={handleItemClick} />
          ))}
        </>
      );
  }

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="p-0">
        <NotificationsToolbar
          filter={filter}
          onFilterChange={(next) => {
            setFilter(next);
            setSkip(0);
          }}
          unreadCount={unreadCount}
        />

        {body}

        {data && totalPages > 1 ? (
          <div
            className="px-4 pb-4 pt-2"
            aria-live="polite"
            aria-busy={isFetching ? "true" : "false"}
          >
            <AdminPagination
              total={data.total}
              skip={data.skip}
              limit={data.limit}
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
