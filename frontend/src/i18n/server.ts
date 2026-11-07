import { locales } from "@/lib/config/routes";

import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enErrors from "./locales/en/errors.json";
import enHome from "./locales/en/home.json";
import enProfile from "./locales/en/profile.json";
import enSeo from "./locales/en/seo.json";
import enSuccess from "./locales/en/success.json";
import enValidation from "./locales/en/validation.json";
import frAuth from "./locales/fr/auth.json";
import frCommon from "./locales/fr/common.json";
import frDashboard from "./locales/fr/dashboard.json";
import frErrors from "./locales/fr/errors.json";
import frHome from "./locales/fr/home.json";
import frProfile from "./locales/fr/profile.json";
import frSeo from "./locales/fr/seo.json";
import frSuccess from "./locales/fr/success.json";
import frValidation from "./locales/fr/validation.json";

export const LANGUAGES = locales;

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    validation: enValidation,
    errors: enErrors,
    success: enSuccess,
    home: enHome,
    dashboard: enDashboard,
    profile: enProfile,
    seo: enSeo,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    validation: frValidation,
    errors: frErrors,
    success: frSuccess,
    home: frHome,
    dashboard: frDashboard,
    profile: frProfile,
    seo: frSeo,
  },
} as const;

type Locale = keyof typeof resources;
type Namespace = keyof (typeof resources)["en"];

/**
 * Simple server-side translation helper for Edge/Server components
 * avoids i18next overhead for simple lookups.
 */
export function getServerTranslations(locale = "en", ns: Namespace = "common") {
  const activeLocale = (resources[locale as Locale] ? locale : "en") as Locale;
  const translations = resources[activeLocale][ns];

  return {
    t: (key: string, defaultValue?: string): string => {
      const keys = key.split(".");
      let result: unknown = translations;

      for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
          result = (result as Record<string, unknown>)[k];
        } else {
          result = undefined;
          break;
        }
      }

      return typeof result === "string" ? result : defaultValue || key;
    },
  };
}
