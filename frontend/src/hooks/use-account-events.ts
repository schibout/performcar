"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { sessionKeys } from "@/hooks/api/use-sessions";
import { authService } from "@/lib/api/endpoints/auth";
import { createAccountSocket } from "@/lib/websocket/account-socket";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Hold a per-user account notification socket while mounted.
 *
 * `permissions_updated`: a superadmin changed the current admin's grants — we
 * refetch `/users/me` so the new permission set takes effect immediately
 * (nav + gates) without a re-login.
 *
 * `sessions_revoked`: one or more of the user's sessions were terminated
 * (remote logout, admin kill, password change). Refetching `/users/me`
 * re-validates THIS device: if its session was the one revoked, the request
 * 401s and the api layer's logout flow drops the tab to the login screen at
 * once. If this device survived, the sessions list cache is refreshed so the
 * UI reflects the kill live.
 */
export const useAccountEvents = (): void => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = createAccountSocket((event) => {
      void (async () => {
        try {
          const me = await authService.getMe();
          setUser(me);
          if (event.type === "sessions_revoked") {
            await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
          }
        } catch {
          // A failed refetch (e.g. this device's session was revoked) is
          // handled by the auth layer's 401 flow; nothing to do here.
        }
      })();
    });

    return () => {
      socket.close();
    };
  }, [isAuthenticated, setUser, queryClient]);
};
