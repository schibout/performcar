import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { defaultLocale, locales } from "@/lib/config/routes";

import enAbout from "./locales/en/about.json";
import enAccount from "./locales/en/account.json";
import enAdmin from "./locales/en/admin.json";
import enAssistant from "./locales/en/assistant.json";
import enAuth from "./locales/en/auth.json";
import enBroadcasts from "./locales/en/broadcasts.json";
import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enErrors from "./locales/en/errors.json";
import enHome from "./locales/en/home.json";
import enNotifications from "./locales/en/notifications.json";
import enProfile from "./locales/en/profile.json";
import enQuotes from "./locales/en/quotes.json";
import enSeo from "./locales/en/seo.json";
import enSuccess from "./locales/en/success.json";
import enSupport from "./locales/en/support.json";
import enSystemSettings from "./locales/en/system-settings.json";
import enUpload from "./locales/en/upload.json";
import enValidation from "./locales/en/validation.json";
import frAbout from "./locales/fr/about.json";
import frAccount from "./locales/fr/account.json";
import frAdmin from "./locales/fr/admin.json";
import frAssistant from "./locales/fr/assistant.json";
import frAuth from "./locales/fr/auth.json";
import frBroadcasts from "./locales/fr/broadcasts.json";
import frCommon from "./locales/fr/common.json";
import frDashboard from "./locales/fr/dashboard.json";
import frErrors from "./locales/fr/errors.json";
import frHome from "./locales/fr/home.json";
import frNotifications from "./locales/fr/notifications.json";
import frProfile from "./locales/fr/profile.json";
import frQuotes from "./locales/fr/quotes.json";
import frSeo from "./locales/fr/seo.json";
import frSuccess from "./locales/fr/success.json";
import frSupport from "./locales/fr/support.json";
import frSystemSettings from "./locales/fr/system-settings.json";
import frUpload from "./locales/fr/upload.json";
import frValidation from "./locales/fr/validation.json";

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    validation: enValidation,
    errors: enErrors,
    success: enSuccess,
    home: enHome,
    about: enAbout,
    dashboard: enDashboard,
    profile: enProfile,
    seo: enSeo,
    account: enAccount,
    admin: enAdmin,
    notifications: enNotifications,
    support: enSupport,
    upload: enUpload,
    broadcasts: enBroadcasts,
    systemSettings: enSystemSettings,
    quotes: enQuotes,
    assistant: enAssistant,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    validation: frValidation,
    errors: frErrors,
    success: frSuccess,
    home: frHome,
    about: frAbout,
    dashboard: frDashboard,
    profile: frProfile,
    seo: frSeo,
    account: frAccount,
    admin: frAdmin,
    notifications: frNotifications,
    support: frSupport,
    upload: frUpload,
    broadcasts: frBroadcasts,
    systemSettings: frSystemSettings,
    quotes: frQuotes,
    assistant: frAssistant,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...locales],

    fallbackLng: defaultLocale,
    defaultNS: "common",
    ns: [
      "common",
      "auth",
      "validation",
      "errors",
      "success",
      "home",
      "about",
      "dashboard",
      "profile",
      "seo",
      "account",
      "admin",
      "notifications",
      "support",
      "upload",
      "broadcasts",
      "systemSettings",
      "quotes",
      "assistant",
    ],

    interpolation: {
      // React escapes every interpolated value at render time, so i18next's own
      // escaping is redundant — this is the i18next-recommended setting for React.
      // RULE: never render a t() result as raw HTML (no dangerouslySetInnerHTML,
      // no non-React DOM sink). Otherwise user input interpolated into a
      // translation would bypass React's escaping and become XSS.
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  })
  .catch((error: unknown) => {
    console.error("i18n initialized failed:", error);
  });

export default i18n;
