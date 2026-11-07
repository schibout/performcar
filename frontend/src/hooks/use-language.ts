"use client";

import { useTranslation } from "react-i18next";

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string, callback?: () => void) => {
    void i18n.changeLanguage(lng);
    document.cookie = `NEXT_LOCALE=${lng}; path=/; max-age=31536000; SameSite=Lax`;

    if (callback) {
      callback();
    }

    // Update the URL's locale segment via the native History API so Next.js
    // does NOT run a route transition. This avoids the `[locale]/loading.tsx`
    // Suspense fallback; the text already switched instantly via i18n above.
    // pushState (not replaceState) preserves a history entry so the browser
    // back button returns to the previous locale; ClientSideProviders re-syncs
    // i18n + <html lang> from the URL on that popstate navigation.
    const currentPath = window.location.pathname;
    let newPath: string;

    if (currentPath.startsWith("/en/") || currentPath === "/en") {
      newPath = currentPath.replace(/^\/en/, `/${lng}`);
    } else if (currentPath.startsWith("/fr/") || currentPath === "/fr") {
      newPath = currentPath.replace(/^\/fr/, `/${lng}`);
    } else {
      newPath = `/${lng}${currentPath}`;
    }

    window.history.pushState(null, "", newPath || `/${lng}`);
  };

  return { language: i18n.language, changeLanguage };
};
