import { test as setup, expect } from "@playwright/test";

import { SELF_PERMISSIONS } from "./user-fixtures";

/**
 * Setup test that authenticates a user once and caches the storage state.
 * Other tests will use this cached state via storageState configuration.
 * This dramatically speeds up test execution since we don't need to login in every test.
 */
setup("authenticate user", async ({ page }) => {
  // The setup only needs to produce a signed-in storage state — the specific
  // locale doesn't matter because specs that consume the state set their own
  // NEXT_LOCALE cookie. Use the default (en) here to avoid coupling the setup
  // to a single UI language.
  const locale = "en";

  // Mock the login API response
  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Set-Cookie": "access_token=fake-jwt-token; Path=/; HttpOnly; SameSite=Lax",
      },
      body: JSON.stringify({
        access_token: "fake-jwt-token",
        token_type: "bearer",
        user: {
          id: "1",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          permissions: SELF_PERMISSIONS,
        },
      }),
    });
  });

  // Mock the me endpoint that fetches current user details
  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        permissions: SELF_PERMISSIONS,
      }),
    });
  });

  await page.goto(`/${locale}/login`);

  await page.fill("input#email", "test@example.com");
  await page.fill("input#password", "Password123!");

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(new RegExp(`.*/${locale}/dashboard`));

  // Save the authentication state (cookies, local storage, session storage)
  // This will be reused by other tests via storageState configuration
  await page.context().storageState({
    path: "playwright/.auth/user.json",
  });
});
