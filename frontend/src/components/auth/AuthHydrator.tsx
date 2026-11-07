"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { authService } from "@/lib/api/endpoints/auth";
import {
  getLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  isAdminPath,
  matchesRoute,
  pendingDeletionRoutes,
  protectedRoutes,
  ROUTES,
  suspendedRoutes,
} from "@/lib/config/routes";
import { isAdminTierRole, type SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

// Module-level guard — survives any React remount, including the one the root
// [locale] layout performs when the URL locale segment changes. A component
// ref resets on each mount, but this module is loaded exactly once per page
// load, so /users/me fires at most once per browser session until a hard
// reload. React 19 Strict Mode double-invokes are also naturally absorbed.
let sessionRequestInFlight = false;

// Admin-tier users belong in the admin shell. Returns the admin dashboard path
// when an (active) admin/superadmin is on any non-admin route, else null. Kept
// out of the effect to keep its cyclomatic complexity within budget.
//
// ``/logout`` is exempted: it is a transient, chrome-free screen that clears the
// session, so admins must be allowed to land on it. Without this, the bounce
// would fire before the logout mutation's signing-out screen can show.
const adminRedirectTarget = (
  role: SystemRole | undefined,
  pathWithoutLocale: string,
  currentLocale: string,
): string | null => {
  const isExempt = isAdminPath(pathWithoutLocale) || matchesRoute(pathWithoutLocale, ROUTES.logout);
  if (isAdminTierRole(role) && !isExempt) {
    return getLocalizedPath(ROUTES.adminDashboard, currentLocale);
  }
  return null;
};

export function AuthHydrator({ children }: { children: React.ReactNode }) {
  const { user, setUser, setSessionInitialized, isSessionInitialized, isAuthenticated } =
    useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (sessionRequestInFlight || isSessionInitialized) return;
    sessionRequestInFlight = true;

    const hydrate = async () => {
      try {
        const fetched = await authService.getMe();
        setUser(fetched);
      } catch {
        // Not logged in or error
        setUser(null);
      } finally {
        setSessionInitialized(true);
        // Tie the in-flight flag's lifetime to the request, not the module:
        // future code that flips ``isSessionInitialized`` back to false (e.g.
        // forced re-hydrate after impersonation) could otherwise be wedged
        // permanently because this flag would still read true.
        sessionRequestInFlight = false;
      }
    };

    void hydrate();
  }, [setUser, setSessionInitialized, isSessionInitialized]);

  // Check for redirects after initialization
  useEffect(() => {
    if (!isSessionInitialized) return;

    const pathWithoutLocale = getPathWithoutLocale(pathname);
    const currentLocale = getLocaleFromPath(pathname);
    const isProtectedRoute = protectedRoutes.some((route) =>
      matchesRoute(pathWithoutLocale, route),
    );
    const isPendingDeletionRoute = pendingDeletionRoutes.some((route) =>
      matchesRoute(pathWithoutLocale, route),
    );
    const isSuspendedRoute = suspendedRoutes.some((route) =>
      matchesRoute(pathWithoutLocale, route),
    );

    if (!isAuthenticated) {
      if (isProtectedRoute || isPendingDeletionRoute || isSuspendedRoute) {
        const target = isAdminPath(pathWithoutLocale) ? ROUTES.adminLogin : ROUTES.login;
        router.replace(`${getLocalizedPath(target, currentLocale)}?session_expired=true`);
      }
      return;
    }

    // Admin-suspended sessions route to the suspended landing and nowhere
    // else. Checked before the deletion-grace flow because suspension wins.
    const isSuspended = Boolean(user?.suspended_at);
    if (isSuspended && !isSuspendedRoute) {
      router.replace(getLocalizedPath(ROUTES.accountSuspended, currentLocale));
      return;
    }
    if (!isSuspended && isSuspendedRoute) {
      router.replace(getLocalizedPath(ROUTES.dashboard, currentLocale));
      return;
    }

    // Route deactivated users to the cancel-deletion screen; keep active users
    // out of it. The proxy can't make this decision because it only sees the
    // JWT, not the user's deletion_scheduled_at field.
    const isPendingDeletion = Boolean(user?.deletion_scheduled_at);
    if (isPendingDeletion && !isPendingDeletionRoute) {
      router.replace(getLocalizedPath(ROUTES.accountDeactivated, currentLocale));
      return;
    }
    if (!isPendingDeletion && isPendingDeletionRoute) {
      router.replace(getLocalizedPath(ROUTES.dashboard, currentLocale));
      return;
    }

    // Admins/superadmins live entirely in the admin shell (its own sidebar +
    // topbar). Once active, bounce them out of every non-admin route —
    // including the public home — into the admin dashboard. The proxy can't do
    // this: it only sees the JWT cookie, not the user's role.
    const adminTarget = adminRedirectTarget(user?.role, pathWithoutLocale, currentLocale);
    if (adminTarget) {
      router.replace(adminTarget);
    }
  }, [isSessionInitialized, isAuthenticated, user, pathname, router]);

  // While hydrating, don't show children for protected routes. This gate
  // also covers pendingDeletionRoutes and suspendedRoutes so deactivated /
  // suspended users aren't flashed a forbidden page before the guarding
  // effect redirects them.
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const currentLocale = getLocaleFromPath(pathname);
  const requiresAuthSession =
    protectedRoutes.some((route) => matchesRoute(pathWithoutLocale, route)) ||
    pendingDeletionRoutes.some((route) => matchesRoute(pathWithoutLocale, route)) ||
    suspendedRoutes.some((route) => matchesRoute(pathWithoutLocale, route));

  // Hard-block suspended users from seeing any protected page (including the
  // shared header / nav drawer that sits in the layout). The redirect effect
  // above will land them on /account-suspended; until that runs, render only
  // the loader so they can't click anything.
  const isOnSuspendedRoute = suspendedRoutes.some((route) =>
    matchesRoute(pathWithoutLocale, route),
  );
  const isLockedSuspended = isAuthenticated && Boolean(user?.suspended_at) && !isOnSuspendedRoute;

  // A returning visitor (persisted isAuthenticated flag) may turn out to be an
  // admin, suspended, or pending-deletion — all of which redirect away from
  // whatever rendered first. Until /users/me settles, hold EVERY route (public
  // home included) on the loader so the page can't flash before the bounce.
  // Anonymous visitors (flag false) never wait.
  const isHydratingKnownSession = !isSessionInitialized && isAuthenticated;

  // After hydration, an admin-tier user on a non-admin route is about to be
  // bounced to the admin dashboard by the redirect effect; keep the loader up
  // while router.replace lands instead of flashing the underlying page.
  const isAwaitingAdminBounce =
    isSessionInitialized &&
    adminRedirectTarget(user?.role, pathWithoutLocale, currentLocale) !== null;

  if (
    isHydratingKnownSession ||
    isAwaitingAdminBounce ||
    (requiresAuthSession && (!isSessionInitialized || !isAuthenticated || isLockedSuspended))
  ) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
