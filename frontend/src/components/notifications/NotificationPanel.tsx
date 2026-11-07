"use client";

import { CheckCheck, Inbox } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { notificationTargetPath } from "@/components/notifications/notification-text";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/api/use-notifications";
import {
  ROUTES,
  getLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  isAdminPath,
} from "@/lib/config/routes";
import { type NotificationItem } from "@/lib/types/notification";

// The panel shows the most recent slice of the inbox; older entries stay
// reachable via the API's pagination if a full inbox page is added later.
const PANEL_LIMIT = 10;

interface NotificationPanelProps {
  // Called before any navigation so the owning dropdown can close itself.
  onNavigate: () => void;
}

export const NotificationPanel = ({ onNavigate }: NotificationPanelProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);

  const { data: unread } = useUnreadCount();
  const { data: list, isLoading } = useNotifications({ limit: PANEL_LIMIT });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unread?.unread_count ?? 0;
  const items = list?.data ?? [];

  // Admins are confined to the admin shell, so their ticket links must use
  // the admin detail route — the user-side one would bounce them straight
  // back to the admin dashboard.
  const isAdmin = isAdminPath(getPathWithoutLocale(pathname));

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read_at) {
      markRead.mutate(item.id);
    }
    const target = notificationTargetPath(item, isAdmin);
    if (target) {
      onNavigate();
      router.push(getLocalizedPath(target, currentLocale));
    }
  };

  let panelBody = (
    <div className="space-y-2 px-3 py-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
  if (!isLoading) {
    panelBody =
      items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-3 py-10 text-muted-foreground">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5" />
          </span>
          <span className="text-sm">{t("notifications:empty")}</span>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onClick={handleItemClick} />
          ))}
        </>
      );
  }

  return (
    <div className="w-[min(21rem,calc(100vw_-_2rem))] overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {t("notifications:title")}
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {unreadCount}
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              markAllRead.mutate();
            }}
            loading={markAllRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications:markAllRead")}
          </Button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">{panelBody}</div>
      <div className="border-t border-border/60 p-1.5">
        {/* Plain button on purpose: the shared Button maps ghost → antd's
            text type, whose hover paints a gray capsule that clashes with
            the panel; this matches the dropdown menu-item language instead. */}
        <button
          type="button"
          onClick={() => {
            onNavigate();
            router.push(
              getLocalizedPath(
                isAdmin ? ROUTES.adminNotifications : ROUTES.notifications,
                currentLocale,
              ),
            );
          }}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {t("notifications:viewAll")}
        </button>
      </div>
    </div>
  );
};
