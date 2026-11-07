"use client";

import { Segmented } from "antd";
import { CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useMarkAllNotificationsRead } from "@/hooks/api/use-notifications";

export type ReadFilter = "all" | "unread";

interface NotificationsToolbarProps {
  filter: ReadFilter;
  onFilterChange: (next: ReadFilter) => void;
  unreadCount: number;
}

// Toolbar: read filter left, bulk action right; stacked on mobile.
export const NotificationsToolbar = ({
  filter,
  onFilterChange,
  unreadCount,
}: NotificationsToolbarProps) => {
  const { t } = useTranslation("notifications");
  const markAllRead = useMarkAllNotificationsRead();

  const filterOptions = [
    { label: t("page.filterAll"), value: "all" },
    { label: t("page.filterUnread"), value: "unread" },
  ];

  return (
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      <Segmented
        className="self-start"
        options={filterOptions}
        value={filter}
        onChange={(value) => {
          onFilterChange(value as ReadFilter);
        }}
      />
      {unreadCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            markAllRead.mutate();
          }}
          loading={markAllRead.isPending}
        >
          <CheckCheck className="h-4 w-4" />
          {t("markAllRead")}
        </Button>
      )}
    </div>
  );
};
