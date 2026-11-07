import { env } from "@/env";
// Import SEO translations directly (server-side, no i18n client needed)
import enSeo from "@/i18n/locales/en/seo.json";
import frSeo from "@/i18n/locales/fr/seo.json";
import { defaultLocale, locales } from "@/lib/config/routes";

import type { BuildMetadataOptions, SeoLocale, SeoPageKey } from "./types";
import type { Metadata } from "next";

/**
 * Validates and normalizes locale string to SeoLocale type.
 * Falls back to the default locale for unsupported values.
 */
export function validateLocale(locale: string): SeoLocale {
  return (locales.includes(locale as SeoLocale) ? locale : defaultLocale) as SeoLocale;
}

const seoTranslations: Record<SeoLocale, Record<string, { title: string; description: string }>> = {
  en: enSeo,
  fr: frSeo,
};

// Base URL for canonical and OG URLs — defaults to localhost in dev
const BASE_URL = env.NEXT_PUBLIC_APP_URL;

// Supported locales for hreflang alternate links — kept in sync with routes.ts
const SUPPORTED_LOCALES: readonly SeoLocale[] = locales;

/**
 * Resolves the page meta (title + description) for the given locale and page key.
 * Falls back to the "en" locale if the key is missing in the requested locale.
 */
function resolvePageMeta(
  locale: SeoLocale,
  pageKey: SeoPageKey,
  overrides?: Partial<{ title: string; description: string }>,
): { title: string; description: string } {
  const translations = seoTranslations[locale] ?? seoTranslations.en;
  const fallback = seoTranslations.en[pageKey] ?? { title: "PerformCar EasyDevis", description: "" };
  const base = translations[pageKey] ?? fallback;

  return {
    title: overrides?.title ?? base.title,
    description: overrides?.description ?? base.description,
  };
}

/**
 * Builds a full Next.js Metadata object for a given locale and page.
 * Includes title, description, canonical URL, hreflang alternates,
 * OpenGraph and Twitter Card tags.
 */
export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const { locale, pageKey, pathname = "", overrides } = options;

  const { title, description } = resolvePageMeta(locale, pageKey, overrides);

  // Normalize the home path ("/") to "" so the canonical URL is .../en
  // (no trailing slash), matching the sitemap entry produced by
  // getLocalizedPath(ROUTES.home, locale). Without this the home page would
  // advertise .../en/ as canonical while the sitemap lists .../en.
  const normalizedPath = pathname === "/" ? "" : pathname;

  // Canonical URL for this locale
  const canonicalUrl = `${BASE_URL}/${locale}${normalizedPath}`;

  // Build alternate language URLs for hreflang
  const alternateLanguages = SUPPORTED_LOCALES.reduce<Record<string, string>>((acc, lang) => {
    acc[lang] = `${BASE_URL}/${lang}${normalizedPath}`;
    return acc;
  }, {});

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "PERFORM'CAR",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/opengraph-image`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
