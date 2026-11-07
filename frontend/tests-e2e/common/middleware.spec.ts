import { test, expect } from "../base-test";
import { SELF_PERMISSIONS } from "../user-fixtures";

test.describe("Middleware - Locale Redirection", () => {
  test("should redirect root URL to localized default (fr)", async ({ page }) => {
    // Initial navigation to root
    await page.goto("/");
    // Should redirect to /fr based on default locale
    await expect(page).toHaveURL(/.*\/fr/);
  });

  // "fr" is the default locale, so the cookie test uses the non-default "en"
  // to prove the NEXT_LOCALE cookie actually overrides the default.
  test("should redirect to /en when NEXT_LOCALE cookie is set to 'en'", async ({
    context,
    page,
  }) => {
    // Set the locale cookie
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/");
    // Should now redirect to /en
    await expect(page).toHaveURL(/.*\/en/);
  });

  test("should persist locale after navigation", async ({ page }) => {
    await page.goto("/en");
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/en/);
  });
});

test.describe("Middleware - Authentication Guards", () => {
  test("should redirect unauthenticated users from /dashboard to /login", async ({ page }) => {
    // Mock the session check API to return 401
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto("/fr/dashboard");

    // Middleware sees no access_token or session, redirects to login
    await expect(page).toHaveURL(/.*\/fr\/login.*/);
  });

  test("should redirect authenticated users from /login to /dashboard", async ({
    context,
    page,
  }) => {
    // Mock the session check API to return 200 (authenticated)
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "1", email: "test@example.com", permissions: SELF_PERMISSIONS }),
      });
    });

    // Inject the authentication cookie
    await context.addCookies([
      {
        name: "access_token",
        value: "fake-jwt-token",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/fr/login");

    // Should be redirected away from login since already authenticated
    await expect(page).toHaveURL(/.*\/fr\/dashboard/);
  });
});

test.describe("Middleware - Authenticated Access", () => {
  test.beforeEach(async ({ context }) => {
    // Inject the authentication cookie
    await context.addCookies([
      {
        name: "access_token",
        value: "fake-jwt-token",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
  });

  test("should allowing accessing protected /dashboard with valid token", async ({ page }) => {
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "1", email: "test@example.com", permissions: SELF_PERMISSIONS }),
      });
    });

    await page.goto("/fr/dashboard");
    await expect(page).toHaveURL(/.*\/fr\/dashboard/);
  });

  test("should allowing accessing protected /profile with valid token", async ({ page }) => {
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "1", email: "test@example.com", permissions: SELF_PERMISSIONS }),
      });
    });

    await page.goto("/en/profile");
    await expect(page).toHaveURL(/.*\/en\/profile/);
  });
});
