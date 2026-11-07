"use client";

import { useTranslation } from "react-i18next";

import { notificationText } from "@/components/notifications/notification-text";
import { formatDateTime } from "@/lib/format-date";
import type { NotificationItem } from "@/lib/types/notification";
import { cn } from "@/lib/utils";

interface InboxRowProps {
  item: NotificationItem;
  onClick: (item: NotificationItem) => void;
}

export const InboxRow = ({ item, onClick }: InboxRowProps) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => {
        onClick(item);
      }}
      className="flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted last:border-b-0"
    >
      <span
        className={cn(
          "mt-2 h-2 w-2 shrink-0 rounded-full",
          item.read_at ? "bg-transparent" : "bg-primary",
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn("block text-sm leading-snug line-clamp-3", !item.read_at && "font-medium")}
        >
          {notificationText(t, item)}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatDateTime(item.created_at)}
        </span>
      </span>
    </button>
  );
};
