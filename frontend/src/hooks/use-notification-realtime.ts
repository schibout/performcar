"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { broadcastKeys } from "@/hooks/api/use-broadcasts";
import { notificationKeys } from "@/hooks/api/use-notifications";
import { useCanReadOwnNotifications } from "@/hooks/use-permissions";
import { createNotificationSocket } from "@/lib/websocket/notification-socket";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Hold a per-user notification socket while mounted.
 *
 * When the backend pushes a `notification_created` event, every notification
 * surface (bell badge, inbox list) is invalidated so it refetches and shows
 * the new entry immediately. The socket lives and dies with authentication.
 */
export const useNotificationRealtime = (): void => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canRead = useCanReadOwnNotifications();
  const queryClient = useQueryClient();

  useEffect(() => {
    // No socket without `self.notifications:read`; it opens as soon as the
    // permission is granted (the effect re-runs when the user refreshes).
    if (!isAuthenticated || !canRead) return;

    const socket = createNotificationSocket((event) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      // A broadcast also refreshes the active banner so it appears live.
      if (event.notification.type === "admin_announcement") {
        void queryClient.invalidateQueries({ queryKey: broadcastKeys.activeAnnouncement });
      }
    });

    return () => {
      socket.close();
    };
  }, [isAuthenticated, canRead, queryClient]);
};
