import { test, expect } from "../base-test";
import { adminUser, injectSession, makeAdmin, mockMe } from "./admin-helpers";
import { LOCALES } from "./admin-strings";

import type { Page } from "@playwright/test";

// Page text that is broadcast-specific and not part of the shared admin-strings
// bundle. Keyed by locale so the spec runs in both languages.
const STRINGS = {
  en: {
    pageTitle: "Announcements",
    historyTitle: "Sent announcements",
    forbidden: "Permission required",
    sentToast: "Announcement sent.",
    templateMode: "Template",
    templateLabel: "Template",
    templateOption: "Welcome",
  },
  fr: {
    pageTitle: "Annonces",
    historyTitle: "Annonces envoyées",
    forbidden: "Permission requise",
    sentToast: "Annonce envoyée.",
    templateMode: "Modèle",
    templateLabel: "Modèle",
    templateOption: "Bienvenue",
  },
} as const;

const TEMPLATE_CATALOG = {
  templates: [
    { key: "welcome", variables: [], translations: {} },
    {
      key: "maintenance",
      variables: [
        { name: "starts_at", type: "datetime" },
        { name: "ends_at", type: "datetime" },
      ],
      translations: {},
    },
  ],
};

const mockBroadcastTemplates = async (page: Page): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/broadcast-templates$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEMPLATE_CATALOG),
    });
  });
};

// One handler for /admin/broadcasts: GET serves history, POST captures the body
// and answers 201 with the success message the interceptor turns into a toast.
const mockBroadcastsEndpoint = async (page: Page, captured: { body: unknown }): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/broadcasts(\?.*)?$/, async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, skip: 0, limit: 25 }),
      });
      return;
    }
    if (method === "POST") {
      captured.body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          announcement: {
            id: "ann-1",
            kind: "template",
            template_key: "welcome",
            variables: {},
            translations: {},
            level: "info",
            audience: "all",
            show_banner: false,
            send_email: false,
            created_at: "2026-06-14T00:00:00Z",
          },
          recipients: 3,
          message: "success.announcement.sent",
        }),
      });
      return;
    }
    await route.fallback();
  });
};

for (const locale of LOCALES) {
  const s = STRINGS[locale];

  test.describe(`Admin broadcasts [${locale}]`, () => {
    test("renders the compose form and history for a permitted admin", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockBroadcastTemplates(page);
      await mockBroadcastsEndpoint(page, { body: null });

      await page.goto(`/${locale}/admin/broadcasts`);

      await expect(page.getByRole("heading", { name: s.pageTitle, exact: true })).toBeVisible();
      await expect(page.getByText(s.historyTitle)).toBeVisible();
    });

    test("sends a template broadcast and shows the success toast", async ({ page }) => {
      const captured: { body: unknown } = { body: null };
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockBroadcastTemplates(page);
      await mockBroadcastsEndpoint(page, captured);

      await page.goto(`/${locale}/admin/broadcasts`);
      await expect(page.getByRole("heading", { name: s.pageTitle, exact: true })).toBeVisible();

      // Switch to template mode (the Segmented radio input is visually hidden, so
      // click its label), then open the template Select by its ARIA combobox role.
      await page.getByText(s.templateMode, { exact: true }).click();
      await page.getByRole("combobox", { name: s.templateLabel }).click();
      await page.getByText(s.templateOption, { exact: true }).click();

      await page.locator('button[type="submit"]').click();

      await expect(page.getByText(s.sentToast)).toBeVisible();
      expect(captured.body).toMatchObject({ kind: "template", template_key: "welcome" });
    });

    test("blocks an admin without the broadcast:read permission", async ({ page }) => {
      const limited = makeAdmin([]);
      await injectSession(page, limited, locale);
      await mockMe(page, limited);

      await page.goto(`/${locale}/admin/broadcasts`);

      await expect(page.getByText(s.forbidden)).toBeVisible();
    });
  });
}
