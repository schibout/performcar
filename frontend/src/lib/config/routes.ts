export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const ROUTES = {
  home: "/",
  about: "/about",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  verifyEmailNotice: "/verify-email-notice",
  accountDeactivated: "/account-deactivated",
  accountSuspended: "/account-suspended",
  dashboard: "/dashboard",
  profile: "/profile",
  support: "/support",
  notifications: "/notifications",
  quotes: "/quotes",
  quotesHistory: "/quotes/history",
  quotesNew: "/quotes/new",
  customers: "/customers",
  dealership: "/dealership",
  logout: "/logout",
  adminLogin: "/admin/login",
  adminDashboard: "/admin/dashboard",
  adminUsers: "/admin/users",
  adminAdmins: "/admin/admins",
  adminRoles: "/admin/roles",
  adminPermissionSets: "/admin/permission-sets",
  adminFiles: "/admin/files",
  adminActivities: "/admin/activities",
  adminSupport: "/admin/support",
  adminNotifications: "/admin/notifications",
  adminBroadcasts: "/admin/broadcasts",
  adminSystemSettings: "/admin/system-settings",
  adminProfile: "/admin/profile",
  adminQuotes: "/admin/quotes",
  adminCustomers: "/admin/customers",
  adminCatalog: "/admin/catalog",
  adminDealerships: "/admin/dealerships",
} as const;

/**
 * Returns a localized path for a given route.
 * Example: getLocalizedPath(ROUTES.login, "en") -> "/en/login"
 */
export const getLocalizedPath = (path: string, locale: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${cleanPath === "/" ? "" : cleanPath}`;
};

// Routes that require authentication (without locale prefix)
export const protectedRoutes = [
  ROUTES.dashboard,
  ROUTES.profile,
  ROUTES.support,
  ROUTES.notifications,
  ROUTES.quotes,
  ROUTES.customers,
  ROUTES.dealership,
  ROUTES.adminDashboard,
  ROUTES.adminUsers,
  ROUTES.adminAdmins,
  ROUTES.adminRoles,
  ROUTES.adminPermissionSets,
  ROUTES.adminFiles,
  ROUTES.adminActivities,
  ROUTES.adminSupport,
  ROUTES.adminNotifications,
  ROUTES.adminBroadcasts,
  ROUTES.adminSystemSettings,
  ROUTES.adminProfile,
  ROUTES.adminQuotes,
  ROUTES.adminCustomers,
  ROUTES.adminCatalog,
  ROUTES.adminDealerships,
  ROUTES.accountSuspended,
];

// Routes that should NOT be accessible when logged in (without locale prefix)
export const authRoutes = [
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.verifyEmail,
  ROUTES.adminLogin,
];

// Public routes that should always be accessible (without locale prefix)
export const publicAuthRoutes = [ROUTES.verifyEmailNotice];

// Routes that require a valid session but MUST remain reachable when the
// account is in the deletion grace window. The protected-layout guard
// redirects deactivated users to these instead of the dashboard.
export const pendingDeletionRoutes = [ROUTES.accountDeactivated];

// Routes reachable only when the session belongs to an admin-suspended user.
// Mirrors ``pendingDeletionRoutes`` — the protected-layout guard sends
// suspended users here and bounces active users away.
export const suspendedRoutes = [ROUTES.accountSuspended];

/**
 * Checks if a given path matches any of the routes in the list.
 * Matches exact paths or sub-paths (e.g., /dashboard matches /dashboard/profile).
 */
export const matchesRoute = (path: string, route: string) =>
  path === route || path.startsWith(`${route}/`);

// Routes that belong to the admin shell. The proxy uses this to redirect
// logged-in visitors of /admin/login to /admin/dashboard instead of the
// regular dashboard, and to send unauthenticated admin visitors back to
// /admin/login instead of the public login page.
export const adminRoutes = [
  ROUTES.adminLogin,
  ROUTES.adminDashboard,
  ROUTES.adminUsers,
  ROUTES.adminAdmins,
  ROUTES.adminRoles,
  ROUTES.adminPermissionSets,
  ROUTES.adminFiles,
  ROUTES.adminActivities,
  ROUTES.adminSupport,
  ROUTES.adminNotifications,
  ROUTES.adminBroadcasts,
  ROUTES.adminSystemSettings,
  ROUTES.adminProfile,
  ROUTES.adminQuotes,
  ROUTES.adminCustomers,
  ROUTES.adminCatalog,
  ROUTES.adminDealerships,
];

export const isAdminPath = (path: string) => adminRoutes.some((route) => matchesRoute(path, route));

/**
 * Removes the locale prefix from a path if it exists.
 */
export const getPathWithoutLocale = (path: string): string => {
  const localePattern = new RegExp(`^/(${locales.join("|")})($|/)`);
  return path.replace(localePattern, "$2") || "/";
};

/**
 * Extracts the locale from a path if it exists, otherwise returns the default locale.
 */
export const getLocaleFromPath = (path: string): string => {
  const localePattern = new RegExp(`^/(${locales.join("|")})($|/)`);
  const match = localePattern.exec(path);
  return match ? match[1] : defaultLocale;
};
