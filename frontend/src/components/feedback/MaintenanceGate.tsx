"use client";

import { usePathname } from "next/navigation";

import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { MaintenanceScreen } from "@/components/feedback/MaintenanceScreen";
import { usePublicSettings } from "@/hooks/api/use-system-settings";
import { authRoutes, getPathWithoutLocale, matchesRoute } from "@/lib/config/routes";
import { isAdminTierRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Blocks non-admins behind a maintenance screen while maintenance mode is on.
 *
 * Auth routes (login/register/...) always render so admins can sign in. On the
 * very first load it shows a splash until the public settings resolve (the query
 * is cached for 5 min, so navigation never re-splashes). Fails open: if the
 * settings cannot be read, the app renders normally — the backend still enforces
 * the real lock.
 */
interface MaintenanceGateProps {
  children: React.ReactNode;
}

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const pathname = usePathname();
  const { data, isLoading } = usePublicSettings();
  const user = useAuthStore((state) => state.user);

  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const onAuthRoute = authRoutes.some((route) => matchesRoute(pathWithoutLocale, route));
  if (onAuthRoute) return <>{children}</>;

  if (isLoading && !data) return <LoadingScreen fullScreen />;

  const maintenanceOn = data?.data.maintenance_mode === true;
  if (maintenanceOn && !isAdminTierRole(user?.role)) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
