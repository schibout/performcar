"use client";

import { useEffect, useState } from "react";

import { ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/button";
import { useAccountEvents } from "@/hooks/use-account-events";
import {
  useCanReadActivities,
  useCanReadAdmins,
  useCanReadBroadcasts,
  useCanReadFiles,
  useCanReadPermissionSets,
  usePermissions,
  useCanReadRoles,
  useCanReadSupport,
  useCanReadSystemSettings,
  useCanReadUsers,
} from "@/hooks/use-permissions";
import { useIsMobile } from "@/hooks/useMediaQuery";
import {
  ROUTES,
  getLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
} from "@/lib/config/routes";
import { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

import { buildAdminNav } from "./admin-nav";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const { t } = useTranslation("admin");
  // Fine-grained selectors so unrelated store fields (e.g. isLoading) don't
  // re-render the admin shell on every auth-tick.
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSessionInitialized = useAuthStore((state) => state.isSessionInitialized);
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  // Live RBAC: refetch /users/me when a superadmin changes this admin's grants.
  useAccountEvents();

  // Per-section visibility. Superadmins pass every check via their role.
  const canReadUsers = useCanReadUsers();
  const canReadFiles = useCanReadFiles();
  const canReadActivities = useCanReadActivities();
  const canReadSupport = useCanReadSupport();
  const canReadBroadcasts = useCanReadBroadcasts();
  const canReadSystemSettings = useCanReadSystemSettings();
  const canReadAdmins = useCanReadAdmins();
  const canReadRoles = useCanReadRoles();
  const canReadPermissionSets = useCanReadPermissionSets();
  const { has } = usePermissions();
  const currentLocale = getLocaleFromPath(pathname);
  const pathWithoutLocale = getPathWithoutLocale(pathname);

  // Desktop: expanded (w-64) ⇄ collapsed icon-rail (w-16). Mobile: full drawer
  // (expanded) ⇄ off-canvas (collapsed). Derive the default from the viewport
  // (collapsed on mobile) and let a manual toggle override it — deriving instead
  // of syncing state in an effect avoids cascading re-renders.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const collapsed = userCollapsed ?? isMobile;

  // Kick non-admin users back to the regular dashboard. We can only run this
  // check once AuthHydrator has populated the store with /users/me — the
  // server-side cookie check in layout.tsx does not include the role.
  useEffect(() => {
    if (!isSessionInitialized) return;
    if (!isAuthenticated) return;
    if (user && user.role !== SystemRole.ADMIN && user.role !== SystemRole.SUPERADMIN) {
      router.replace(getLocalizedPath(ROUTES.dashboard, currentLocale));
    }
  }, [isSessionInitialized, isAuthenticated, user, router, currentLocale]);

  if (!isSessionInitialized || !isAuthenticated || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== SystemRole.ADMIN && user.role !== SystemRole.SUPERADMIN) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{t("shell.forbiddenTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("shell.forbiddenDescription")}</p>
          <Button
            className="mt-4"
            onClick={() => {
              router.replace(getLocalizedPath(ROUTES.dashboard, currentLocale));
            }}
          >
            {t("shell.forbiddenCta")}
          </Button>
        </div>
      </div>
    );
  }

  const sections = buildAdminNav({
    canReadUsers,
    canReadFiles,
    canReadActivities,
    canReadSupport,
    canReadBroadcasts,
    canReadSystemSettings,
    canReadAdmins,
    canReadRoles,
    canReadPermissionSets,
    canReadQuotes: has(Permission.QuotesRead),
    canReadCustomers: has(Permission.CustomersRead),
    canReadCatalog: has(Permission.CatalogRead),
    canReadDealerships: has(Permission.DealershipsRead),
  });

  const closeOnMobile = () => {
    if (isMobile) setUserCollapsed(true);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card shadow-xl transition-all md:sticky md:top-0 md:h-screen md:bg-card/40 md:shadow-none",
          collapsed ? "w-64 -translate-x-full md:w-16 md:translate-x-0" : "w-64 translate-x-0",
        )}
      >
        <AdminSidebar
          sections={sections}
          currentLocale={currentLocale}
          pathWithoutLocale={pathWithoutLocale}
          user={user}
          collapsed={collapsed}
          onNavigate={closeOnMobile}
        />
      </aside>

      {!collapsed ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeOnMobile}
          aria-hidden="true"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          onToggleSidebar={() => {
            setUserCollapsed(!collapsed);
          }}
        />
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
