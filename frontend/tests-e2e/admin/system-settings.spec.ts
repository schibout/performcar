import { test, expect } from "../base-test";
import { adminUser, injectSession, makeAdmin, mockMe } from "./admin-helpers";
import { LOCALES } from "./admin-strings";

import type { Page } from "@playwright/test";

// Page text specific to the system-settings page, keyed by locale so the spec
// runs in both languages. Field/category labels come from the systemSettings ns.
const STRINGS = {
  en: {
    pageTitle: "System Settings",
    maintenanceLabel: "Maintenance mode",
    siteNameLabel: "Site name",
    save: "Save changes",
    savedToast: "Settings saved.",
    forbidden: "Permission required",
  },
  fr: {
    pageTitle: "Paramètres système",
    maintenanceLabel: "Mode maintenance",
    siteNameLabel: "Nom du site",
    save: "Enregistrer les modifications",
    savedToast: "Paramètres enregistrés.",
    forbidden: "Permission requise",
  },
} as const;

// A realistic admin settings list (mirrors the backend registry shape).
const SETTINGS_LIST = {
  data: [
    {
      key: "maintenance_mode",
      value: false,
      value_type: "bool",
      category: "system",
      is_public: true,
      description: "When on, only admins can reach the app.",
      updated_at: null,
      updated_by: null,
    },
    {
      key: "registration_enabled",
      value: true,
      value_type: "bool",
      category: "auth",
      is_public: true,
      description: "When off, new account registration is rejected.",
      updated_at: null,
      updated_by: null,
    },
    {
      key: "max_upload_size_mb",
      value: 5,
      value_type: "int",
      category: "uploads",
      is_public: false,
      description: "Maximum allowed file upload size in megabytes.",
      updated_at: null,
      updated_by: null,
    },
    {
      key: "site_name",
      value: "Test App",
      value_type: "string",
      category: "branding",
      is_public: true,
      description: "Product name shown across the app and emails.",
      updated_at: null,
      updated_by: null,
    },
  ],
};

// GET serves the settings list; PATCH /{key} captures the body and echoes back
// the success message the interceptor turns into a toast.
const mockSystemSettings = async (
  page: Page,
  captured: { key: string | null; body: unknown },
): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/system-settings$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SETTINGS_LIST),
    });
  });
  await page.route(/.*\/api\/v1\/admin\/system-settings\/([^/?]+)$/, async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.fallback();
      return;
    }
    const match = /system-settings\/([^/?]+)$/.exec(route.request().url());
    captured.key = match ? match[1] : null;
    captured.body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        setting: { ...SETTINGS_LIST.data[0], value: true },
        message: "success.settings.updated",
      }),
    });
  });
};

for (const locale of LOCALES) {
  const s = STRINGS[locale];

  test.describe(`Admin system settings [${locale}]`, () => {
    test("renders the settings grouped by category for a permitted admin", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockSystemSettings(page, { key: null, body: null });

      await page.goto(`/${locale}/admin/system-settings`);

      await expect(page.getByRole("heading", { name: s.pageTitle, exact: true })).toBeVisible();
      await expect(page.getByText(s.maintenanceLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(s.siteNameLabel, { exact: true })).toBeVisible();
    });

    test("toggles a setting, saves, and shows the success toast", async ({ page }) => {
      const captured: { key: string | null; body: unknown } = { key: null, body: null };
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockSystemSettings(page, captured);

      await page.goto(`/${locale}/admin/system-settings`);
      await expect(page.getByRole("heading", { name: s.pageTitle, exact: true })).toBeVisible();

      // Flip the first switch (maintenance_mode) — Save enables once dirty.
      await page.getByRole("switch").first().click();
      await page.getByRole("button", { name: s.save }).click();

      await expect(page.getByText(s.savedToast)).toBeVisible();
      expect(captured.key).toBe("maintenance_mode");
      expect(captured.body).toMatchObject({ value: true });
    });

    test("blocks an admin without the system_settings:read permission", async ({ page }) => {
      const limited = makeAdmin([]);
      await injectSession(page, limited, locale);
      await mockMe(page, limited);

      await page.goto(`/${locale}/admin/system-settings`);

      await expect(page.getByText(s.forbidden)).toBeVisible();
    });
  });
}
