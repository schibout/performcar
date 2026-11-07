"use client";

import { PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";

interface AdminTopbarProps {
  onToggleSidebar: () => void;
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const { t } = useTranslation("admin");

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        aria-label={t("shell.toggleSidebar")}
      >
        <PanelLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1" />
      <NotificationBell />
    </header>
  );
}
