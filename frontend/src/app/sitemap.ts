import { env } from "@/env";
import { LANGUAGES } from "@/i18n/server";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  // Only include public, crawlable routes (pulled from ROUTES so they stay in
  // sync with the actual app router paths).
  // Excluded: token-based auth flows (reset-password, verify-email, verify-email-notice)
  // Excluded: protected pages (dashboard, profile, admin) - handled by robots.txt
  const staticRoutes = [
    ROUTES.home,
    ROUTES.about,
    ROUTES.login,
    ROUTES.register,
    ROUTES.forgotPassword,
  ];

  const locales = LANGUAGES; // ["fr", "en"]

  const sitemapEntries: MetadataRoute.Sitemap = [];

  staticRoutes.forEach((route) => {
    const isHome = route === ROUTES.home;

    // Add entry for each locale
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}${getLocalizedPath(route, locale)}`,
        lastModified: new Date(),
        changeFrequency: isHome ? "daily" : "monthly",
        priority: isHome ? 1.0 : 0.8,
      });
    });
  });

  return sitemapEntries;
}
