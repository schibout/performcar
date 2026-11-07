"use client";

import { useState } from "react";

import { Badge, Dropdown } from "antd";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/hooks/api/use-notifications";
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";
import { useCanReadOwnNotifications } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth.store";

const NotificationBellInner = () => {
  useNotificationRealtime();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.unread_count ?? 0;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => (
        <NotificationPanel
          onNavigate={() => {
            setOpen(false);
          }}
        />
      )}
    >
      <span>
        <Button
          variant="ghost"
          className="h-7 w-7 rounded-full px-0"
          aria-label={t("notifications:bell")}
        >
          <Badge count={unreadCount} size="small" offset={[2, -2]}>
            <Bell className="h-4 w-4" />
          </Badge>
        </Button>
      </span>
    </Dropdown>
  );
};

// Outer gate: render nothing (and run no notification queries or socket) for
// guests. The inner component only mounts once the user is authenticated.
export const NotificationBell = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canRead = useCanReadOwnNotifications();
  if (!isAuthenticated || !canRead) return null;
  return <NotificationBellInner />;
};
