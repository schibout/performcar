import { type Page } from "@playwright/test";

import { test, expect } from "./base-test";
import { SELF_PERMISSIONS } from "./user-fixtures";

// Helper to inject authenticated state into both the API and cookies
const setupAuthenticatedState = async (page: Page) => {
  const mockUser = {
    id: "user-123",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    permissions: SELF_PERMISSIONS,
  };

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockUser),
    });
  });

  await page.context().addCookies([
    {
      name: "access_token",
      value: "fake-jwt-token",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.addInitScript(
    (storageData) => {
      window.localStorage.setItem("auth-storage", storageData);
    },
    JSON.stringify({
      state: { user: mockUser, isAuthenticated: true },
      version: 0,
    }),
  );
};

test.describe("SEO and Metadata Validation", () => {
  const locales = ["en", "fr"];
  const pages = [
    { key: "home", route: "/" },
    { key: "login", route: "/login" },
    { key: "register", route: "/register" },
    { key: "forgot-password", route: "/forgot-password" },
    {
      key: "reset-password",
      route: "/reset-password?token=fake",
    },
    { key: "verify-email", route: "/verify-email?token=fake" },
    {
      key: "verify-email-notice",
      route: "/verify-email-notice",
      // Pending email lives in sessionStorage now, not the URL — seed it so
      // the page renders instead of redirecting to /login.
      setup: async (page: Page) => {
        await page.addInitScript(() => {
          window.sessionStorage.setItem("pendingVerifyEmail", "test@example.com");
        });
      },
    },
    { key: "dashboard", route: "/dashboard", protected: true },
    { key: "profile", route: "/profile", protected: true },
  ];

  for (const locale of locales) {
    for (const pageInfo of pages) {
      test(`should have correct SEO tags for ${locale.toUpperCase()} ${pageInfo.key} page`, async ({
        page,
      }) => {
        if (pageInfo.protected) {
          await setupAuthenticatedState(page);
        }
        if (pageInfo.setup) {
          await pageInfo.setup(page);
        }

        const fullRoute = `/${locale}${pageInfo.route === "/" ? "" : pageInfo.route}`;
        // The pathname used in generateMetadata code (route groups like
        // (auth) are not part of the URL, so the canonical path equals the
        // route without its query string).
        const seoPathname = pageInfo.route.split("?")[0];
        const canonicalPath = `/${locale}${seoPathname === "/" ? "" : seoPathname}`;

        await page.goto(fullRoute);

        // 1. Basic Title & Description
        const title = await page.title();
        expect(title).not.toBe("");

        const description = page.locator('meta[name="description"]');
        await expect(description).toHaveAttribute("content", /.+/);

        // 2. Canonical URL
        const canonical = page.locator('link[rel="canonical"]');
        const escapedCanonicalPath = canonicalPath.replace(/\//g, "\\/");
        // Appends optional trailing slash matching
        await expect(canonical).toHaveAttribute(
          "href",
          new RegExp(`.*${escapedCanonicalPath}(\\/)?$`),
        );

        // 3. Hreflang Alternates
        for (const targetLocale of locales) {
          const alternate = page.locator(`link[rel="alternate"][hreflang="${targetLocale}"]`);
          await expect(alternate).toBeAttached();

          const targetCanonicalPath = `/${targetLocale}${seoPathname === "/" ? "" : seoPathname}`;
          const escapedTargetCanonicalPath = targetCanonicalPath.replace(/\//g, "\\/");

          await expect(alternate).toHaveAttribute(
            "href",
            new RegExp(`.*${escapedTargetCanonicalPath}(\\/)?$`),
          );
        }

        // 4. OpenGraph Tags
        const ogTitle = page.locator('meta[property="og:title"]');
        // OG Title may match either raw title or template version.
        // We fetch the title content and just ensure it's not empty and represents the page.
        const ogTitleContent = await ogTitle.getAttribute("content");
        expect(ogTitleContent).not.toBeNull();
        expect(ogTitleContent?.length).toBeGreaterThan(0);

        const ogUrl = page.locator('meta[property="og:url"]');
        await expect(ogUrl).toHaveAttribute("content", /http.*/);

        const ogType = page.locator('meta[property="og:type"]');
        await expect(ogType).toHaveAttribute("content", "website");

        // 5. Robots
        const robots = page.locator('meta[name="robots"]');
        await expect(robots).toHaveAttribute("content", /index,.*follow/);
      });
    }
  }
});
