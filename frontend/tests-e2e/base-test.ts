import { test as base, expect } from "@playwright/test";

/**
 * Base test fixture that automatically mocks all API requests
 * to ensure no test accidentally hits the real backend.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Global interceptor for all API v1 calls
    // If a specific test mocks the same URL, it will take precedence or we can use route.continue()
    // By default, we block any unmocked API call with a 401 error.
    // Global interceptor for all API calls
    await page.route(
      (url) => url.pathname.includes("/api/v1/"),
      async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        // If we are here, it means no other (later registered) route matched.
        // We block unmocked API calls with a 401.
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Unmocked API Request",
            detail: `[Global Interceptor] [${method}] ${url}`,
          }),
        });
      },
    );

    // The notification bell mounts in the header of every authenticated page,
    // firing GET /notifications and /notifications/unread-count on load. Left
    // unmocked they hit the catch-all 401 above, which trips the axios refresh
    // -> logout cascade and bounces every authenticated spec to /login. Answer
    // them with an empty, quiet inbox by default; specs that assert on
    // notifications register their own routes (which take precedence).
    await page.route(
      (url) => url.pathname.includes("/api/v1/notifications"),
      async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        const body = pathname.endsWith("/notifications/unread-count")
          ? { unread_count: 0 }
          : { data: [], total: 0, skip: 0, limit: 10 };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      },
    );

    // The sessions card mounts on the admin user-detail page and the profile
    // security tab, firing GET .../sessions on load. Like the notification
    // bell above, an unmocked call hits the catch-all 401 and trips the
    // logout cascade, bouncing the page to /login. Answer GETs with an empty
    // session list by default; specs that assert on sessions (or test revoke,
    // which is a DELETE) register their own routes, which take precedence.
    // Non-GET methods fall through so those spec handlers — or the 401 — apply.
    await page.route(
      (url) => url.pathname.includes("/api/v1/") && url.pathname.endsWith("/sessions"),
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [], total: 0, skip: 0, limit: 50 }),
        });
      },
    );

    // The access panel mounts on the admin user-detail page and fires GET
    // /admin/users/:id/access, plus the role and permission-set lists that feed
    // its assignment dialog. Unmocked they hit the catch-all 401 and trip the
    // logout cascade, so answer GETs with an account holding nothing by default.
    // Specs that assert on access register their own routes (precedence).
    await page.route(
      (url) =>
        url.pathname.includes("/api/v1/admin/") &&
        (url.pathname.endsWith("/access") || url.pathname.includes("/admin/rbac/")),
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }
        const pathname = new URL(route.request().url()).pathname;
        const body = pathname.endsWith("/access")
          ? {
              account_role: "user",
              roles: [],
              permission_sets: [],
              direct_permissions: [],
              effective: [],
            }
          : { data: [] };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      },
    );

    // The AnnouncementBanner mounts in the global layout, so EVERY authenticated
    // page fires GET /announcements/active on load. Unmocked, it hits the
    // catch-all 401 and trips the logout cascade, bouncing the page to /login —
    // which would fail authenticated specs suite-wide. Answer GETs with "no
    // active banner" by default; specs that assert on a banner register their
    // own route (which takes precedence). Non-GET methods fall through.
    await page.route(
      (url) => url.pathname.endsWith("/api/v1/announcements/active"),
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ announcement: null }),
        });
      },
    );

    // The MaintenanceGate and branding (useBranding) call GET /settings/public
    // on EVERY page — the gate wraps the whole app and the header/sidebar logo +
    // name read from it. Unmocked it hits the catch-all 401, the gate stalls on
    // its first-load splash, and branding/register-link specs break suite-wide.
    // Answer with a healthy, non-maintenance config (registration on) by default;
    // specs that assert on settings register their own route (precedence).
    await page.route(
      (url) => url.pathname.endsWith("/api/v1/settings/public"),
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              maintenance_mode: false,
              registration_enabled: true,
              support_enabled: true,
              site_name: "Test App",
              logo_url: "",
              support_email: "support@test.com",
              default_locale: "en",
            },
          }),
        });
      },
    );

    // page.route() does not cover WebSockets, so realtime sockets (account
    // events, support feed) would otherwise reach the real backend through the
    // dev proxy. Intercept API WebSockets and answer them locally — the handler
    // never calls connectToServer(), so nothing is forwarded to the backend.
    // Next.js HMR sockets (/_next/...) are intentionally left untouched.
    await page.routeWebSocket(/\/api\/v1\//, () => {
      // No-op mock: tests don't assert on realtime frames.
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };
