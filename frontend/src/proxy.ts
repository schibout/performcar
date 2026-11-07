import { NextResponse } from "next/server";

import { env } from "@/env";
import {
  locales,
  defaultLocale,
  protectedRoutes,
  authRoutes,
  publicAuthRoutes,
  matchesRoute,
  getLocaleFromPath,
  getPathWithoutLocale,
  isAdminPath,
  ROUTES,
  getLocalizedPath,
  type Locale,
} from "@/lib/config/routes";

import type { NextRequest } from "next/server";

interface RedirectDecisionInput {
  isProtectedRoute: boolean;
  isAuthRoute: boolean;
  hasToken: boolean;
  sessionExpired: boolean;
  underAdmin: boolean;
}

function resolveRedirectTarget({
  isProtectedRoute,
  isAuthRoute,
  hasToken,
  sessionExpired,
  underAdmin,
}: RedirectDecisionInput): string | null {
  if (isProtectedRoute && !hasToken) {
    return underAdmin ? ROUTES.adminLogin : ROUTES.login;
  }
  if (isAuthRoute && hasToken && !sessionExpired) {
    return underAdmin ? ROUTES.adminDashboard : ROUTES.dashboard;
  }
  return null;
}

function handleLocaleRedirect(request: NextRequest, pathname: string, search: string) {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  // IMPORTANT: Preserve search parameters (query string)
  const targetPath = `/${locale}${pathname === "/" ? "" : pathname}${search}`;
  const response = NextResponse.redirect(new URL(targetPath, request.url));

  // Save the locale to cookie for future requests
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 31536000 }); // 1 year
  return response;
}

function handleAuthGuard(
  request: NextRequest,
  pathname: string,
  token: string | undefined,
  requestHeaders: Headers,
) {
  const currentLocale = getLocaleFromPath(pathname);
  const pathWithoutLocale = getPathWithoutLocale(pathname);

  // Home path is always public - explicit early return to avoid any redirect logic
  if (pathWithoutLocale === "/") {
    const localeFromCookie = request.cookies.get("NEXT_LOCALE")?.value;
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (localeFromCookie !== currentLocale) {
      response.cookies.set("NEXT_LOCALE", currentLocale, { path: "/", maxAge: 31536000 });
    }
    return response;
  }

  const isProtectedRoute = protectedRoutes.some((route) => matchesRoute(pathWithoutLocale, route));
  const isAuthRoute = authRoutes.some((route) => matchesRoute(pathWithoutLocale, route));
  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    matchesRoute(pathWithoutLocale, route),
  );

  // If it's a public auth route, always allow
  if (isPublicAuthRoute) {
    const localeFromCookie = request.cookies.get("NEXT_LOCALE")?.value;
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (localeFromCookie !== currentLocale) {
      response.cookies.set("NEXT_LOCALE", currentLocale, { path: "/", maxAge: 31536000 });
    }
    return response;
  }

  const sessionExpired = request.nextUrl.searchParams.get("session_expired") === "true";
  const underAdmin = isAdminPath(pathWithoutLocale);
  const redirectTarget = resolveRedirectTarget({
    isProtectedRoute,
    isAuthRoute,
    hasToken: Boolean(token),
    sessionExpired,
    underAdmin,
  });

  // Admin routes send the user to /admin/login so the two login surfaces stay
  // separate (future-proof for an admin.<domain> split). Visitors of
  // /admin/login are sent to /admin/dashboard; the admin layout then verifies
  // the role and kicks non-admins back to /dashboard.
  const response = redirectTarget
    ? NextResponse.redirect(new URL(getLocalizedPath(redirectTarget, currentLocale), request.url))
    : NextResponse.next({ request: { headers: requestHeaders } });

  // Ensure cookie is set correctly to persist locale choice
  const localeFromCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (localeFromCookie !== currentLocale) {
    response.cookies.set("NEXT_LOCALE", currentLocale, { path: "/", maxAge: 31536000 });
  }

  return response;
}

// Per-request Content-Security-Policy. The script policy is nonce-based rather
// than 'unsafe-inline': Next reads this nonce from the request CSP header and
// stamps it on its own inline/bootstrap scripts, and next-themes receives it via
// the ThemeProvider `nonce` prop. Styles stay 'unsafe-inline' (Tailwind/AntD
// emit inline styles that are far costlier to nonce). 'unsafe-eval' is dev-only
// for Turbopack HMR. The static security headers live in next.config.ts.
function buildContentSecurityPolicy(nonce: string): string {
  // NODE_ENV is a Next/runtime built-in (not an app env var), so it's read from
  // process.env directly — same as instrumentation.ts. Everything else goes
  // through @/env so the Zod default for NEXT_PUBLIC_API_URL always applies and
  // connect-src can never silently collapse to 'self'.
  const isProd = process.env.NODE_ENV === "production";
  const apiUrl = env.NEXT_PUBLIC_API_URL;
  const wsUrl = env.NEXT_PUBLIC_WS_URL ?? apiUrl.replace(/^http/, "ws");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    `connect-src 'self' ${apiUrl} ${wsUrl}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
    .join("; ")
    .trim();
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // A fresh, unguessable nonce per request. It rides on the request headers so
  // Next applies it to its scripts during render, and on the response CSP so the
  // browser only executes scripts carrying it — neutralising any injected inline
  // <script>, which cannot know the value.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // 1. Locale Routing Logic
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // Redirect to localized path if needed, otherwise run the auth guard. Either
  // branch carries the CSP response header set below.
  const response = pathnameHasLocale
    ? handleAuthGuard(request, pathname, token, requestHeaders)
    : handleLocaleRedirect(request, pathname, search);

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - assets (public folders like images)
     * - favicon.ico, icon.png, apple-icon.png (app icons)
     */
    "/((?!api|_next/static|_next/image|assets|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
