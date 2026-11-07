import enAccount from "../src/i18n/locales/en/account.json";
import enAdmin from "../src/i18n/locales/en/admin.json";
import enAuth from "../src/i18n/locales/en/auth.json";
import enCommon from "../src/i18n/locales/en/common.json";
import enDashboard from "../src/i18n/locales/en/dashboard.json";
import enHome from "../src/i18n/locales/en/home.json";
import enNotifications from "../src/i18n/locales/en/notifications.json";
import enProfile from "../src/i18n/locales/en/profile.json";
import enSeo from "../src/i18n/locales/en/seo.json";
import enSupport from "../src/i18n/locales/en/support.json";
import enUpload from "../src/i18n/locales/en/upload.json";
import frAccount from "../src/i18n/locales/fr/account.json";
import frAdmin from "../src/i18n/locales/fr/admin.json";
import frAuth from "../src/i18n/locales/fr/auth.json";
import frCommon from "../src/i18n/locales/fr/common.json";
import frDashboard from "../src/i18n/locales/fr/dashboard.json";
import frHome from "../src/i18n/locales/fr/home.json";
import frNotifications from "../src/i18n/locales/fr/notifications.json";
import frProfile from "../src/i18n/locales/fr/profile.json";
import frSeo from "../src/i18n/locales/fr/seo.json";
import frSupport from "../src/i18n/locales/fr/support.json";
import frUpload from "../src/i18n/locales/fr/upload.json";

// Locales in E2E coverage. Keep the list explicit so reports pair 1:1 with
// the iteration and it's obvious when a locale regresses.
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const bundles = {
  fr: {
    account: frAccount,
    admin: frAdmin,
    auth: frAuth,
    common: frCommon,
    dashboard: frDashboard,
    home: frHome,
    notifications: frNotifications,
    profile: frProfile,
    seo: frSeo,
    support: frSupport,
    upload: frUpload,
  },
  en: {
    account: enAccount,
    admin: enAdmin,
    auth: enAuth,
    common: enCommon,
    dashboard: enDashboard,
    home: enHome,
    notifications: enNotifications,
    profile: enProfile,
    seo: enSeo,
    support: enSupport,
    upload: enUpload,
  },
} as const;

export const getStrings = (locale: Locale) => bundles[locale];

// Escape regex metacharacters so translated copy can be embedded in
// `new RegExp(...)` locators without tripping on punctuation like "?".
export const reEscape = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
