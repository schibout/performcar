"use client";

import { useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { useLogoutMutation } from "@/hooks/api/use-auth";

export default function Logout() {
  const { t } = useTranslation("auth");
  const { mutateAsync: logout } = useLogoutMutation();
  // Fire the logout mutation exactly once per mount. React 19 + strict mode
  // remounts effects, so without this guard the backend sees two calls.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    void logout().catch(() => {
      // Redirection is handled by the mutation hook's onError
    });
  }, [logout]);

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center p-4 gap-4">
      <LoadingScreen message={t("logout.signingOut")} fullScreen={false} />
    </div>
  );
}
