import { test, expect } from "./base-test";
import { LOCALES, getStrings, reEscape } from "./i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Basic Navigation [${locale}]`, () => {
    test("should render SEO tags on the home page", async ({ page }) => {
      await page.goto(`/${locale}`);

      // Title template from the layout appends " — NextJS Template".
      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.home.title)));

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.home.description);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute("href", new RegExp(`.*/${locale}/?$`));

      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute("content", s.seo.home.title);
    });

    test("should show 404 page for non-existent routes", async ({ page }) => {
      await page.goto(`/${locale}/non-existent-page`);
      await expect(page.getByText(s.seo.notFound.title).first()).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/non-existent-page`));
    });
  });
}

test.describe("Locale cookie persistence", () => {
  test("should persist language via cookie", async ({ context, page }) => {
    await context.addCookies([
      // "fr" is the default locale; use "en" so the cookie is what drives the redirect.
      { name: "NEXT_LOCALE", value: "en", domain: "127.0.0.1", path: "/" },
    ]);

    await page.goto("/");
    await expect(page).toHaveURL(/.*\/en/);
  });
});
