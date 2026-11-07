import { injectSession, mockMe, regularUser } from "../admin/admin-helpers";
import { LOCALES } from "../admin/admin-strings";
import { test, expect } from "../base-test";

import type { Page } from "@playwright/test";

// Distinct per-language banner text so each locale asserts on its own copy.
const TITLE = { en: "Heads up everyone", fr: "Annonce à tous" } as const;
const DISMISS = { en: "Dismiss", fr: "Masquer" } as const;

const activeBanner = {
  announcement: {
    id: "banner-1",
    kind: "custom",
    template_key: null,
    variables: {},
    translations: {
      en: { title: TITLE.en, body: "Please read this important notice." },
      fr: { title: TITLE.fr, body: "Merci de lire cette annonce importante." },
    },
    level: "info",
    audience: "all",
    show_banner: true,
    send_email: false,
    created_at: "2026-06-14T00:00:00Z",
  },
};

const mockActive = async (page: Page, banner: unknown): Promise<void> => {
  await page.route(/.*\/api\/v1\/announcements\/active$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(banner),
    });
  });
};

for (const locale of LOCALES) {
  test.describe(`Announcement banner [${locale}]`, () => {
    test("shows the active banner to a signed-in user", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockActive(page, activeBanner);

      await page.goto(`/${locale}/dashboard`);

      await expect(page.getByText(TITLE[locale])).toBeVisible();
    });

    test("hides nothing when there is no active banner", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockActive(page, { announcement: null });

      await page.goto(`/${locale}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/dashboard`));

      await expect(page.getByText(TITLE[locale])).toHaveCount(0);
    });

    test("dismissing the banner hides it and persists across reload", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockActive(page, activeBanner);

      await page.goto(`/${locale}/dashboard`);
      await expect(page.getByText(TITLE[locale])).toBeVisible();

      await page.getByRole("button", { name: DISMISS[locale] }).click();
      await expect(page.getByText(TITLE[locale])).toHaveCount(0);

      // The dismissal is stored in localStorage, so a reload keeps it closed.
      await page.reload();
      await expect(page.getByText(TITLE[locale])).toHaveCount(0);
    });
  });
}
