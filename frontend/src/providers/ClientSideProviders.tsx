"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { AuthHydrator } from "@/components/auth/AuthHydrator";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { MaintenanceGate } from "@/components/feedback/MaintenanceGate";
import i18n from "@/i18n/config";
import { getLocaleFromPath } from "@/lib/config/routes";

import { AntdProvider } from "./AntdProvider";
import { QueryProvider } from "./QueryProvider";
import { SupportRealtimeBridge } from "./SupportRealtimeBridge";
import { ThemeProvider } from "./ThemeProvider";

const loadingMessages: Record<string, string> = {
  en: "Loading...",
  fr: "Chargement...",
};

interface ClientSideProvidersProps {
  children: React.ReactNode;
  locale: string;
  nonce?: string;
}

export function ClientSideProviders({ children, locale, nonce }: ClientSideProvidersProps) {
  // Initial state MUST match on server and client to avoid a hydration
  // mismatch. `i18n.language` diverges across the two (server uses the static
  // fallback, client's LanguageDetector may read a cookie), so we always start
  // `false` and let the effect below flip it once i18n is in sync with the URL
  // locale. This costs one frame of LoadingScreen flash; any alternative
  // reading i18n.language during render would flicker hydration warnings.
  const [initialSync, setInitialSync] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (i18n.language === locale) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialSync(true);
      return;
    }
    let cancelled = false;
    void i18n.changeLanguage(locale).finally(() => {
      if (!cancelled) setInitialSync(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Keep i18n and the <html lang> attribute in sync with the URL locale on
  // every client-side navigation. The locale switch uses the History API
  // (no RSC re-render), and browser back/forward only changes the URL â€” so
  // neither i18n.language nor the server-rendered `lang` attribute would
  // update without this effect. Deriving from usePathname() (which Next.js
  // keeps in sync with pushState/replaceState) covers all three cases.
  useEffect(() => {
    const urlLocale = getLocaleFromPath(pathname);
    if (i18n.language !== urlLocale) {
      void i18n.changeLanguage(urlLocale);
    }
    document.documentElement.lang = urlLocale;
  }, [pathname]);

  const loadingMessage = loadingMessages[locale] || loadingMessages.en;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}>
      <AntdProvider locale={locale}>
        {!initialSync ? (
          <LoadingScreen fullScreen message={loadingMessage} />
        ) : (
          <QueryProvider>
            <AuthHydrator>
              <SupportRealtimeBridge />
              <ErrorBoundary>
                <MaintenanceGate>{children}</MaintenanceGate>
              </ErrorBoundary>
            </AuthHydrator>
          </QueryProvider>
        )}
      </AntdProvider>
    </ThemeProvider>
  );
}
