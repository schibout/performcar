"use client";

import { useState, useEffect } from "react";

import { Dropdown } from "antd";
import { Check, Moon, Sun } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthButtons } from "@/components/common/AuthButtons";
import { BrandLogo } from "@/components/common/BrandLogo";
import { AppDrawer } from "@/components/layout/AppDrawer";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useBranding } from "@/hooks/use-branding";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/useMediaQuery";
import {
  ROUTES,
  getLocalizedPath,
  getLocaleFromPath,
  getPathWithoutLocale,
  isAdminPath,
  matchesRoute,
} from "@/lib/config/routes";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

interface HeaderNavLink {
  labelKey: string;
  route: string;
}

const NAV_LINKS: HeaderNavLink[] = [
  { labelKey: "common:nav.home", route: ROUTES.home },
  { labelKey: "common:nav.about", route: ROUTES.about },
];

const LANGUAGE_OPTIONS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

interface LanguageMenuProps {
  currentLocale: string;
  onSelect: (lng: string) => void;
}

// Custom glass panel (matching the avatar/notification dropdowns) with a
// check mark on the active language.
const LanguageMenu = ({ currentLocale, onSelect }: LanguageMenuProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => (
        <div className="w-40 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl">
          {LANGUAGE_OPTIONS.map(({ code, label }) => {
            const active = currentLocale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect(code);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {label}
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    >
      <button
        type="button"
        aria-label={t("common:ui.toggleLanguage", "Toggle language")}
        className="flex h-7 items-center justify-center rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {currentLocale.toUpperCase()}
      </button>
    </Dropdown>
  );
};

interface HeaderNavProps {
  pathWithoutLocale: string;
  currentLocale: string;
}

// Active page gets a pill that *slides* between links (shared layoutId).
const HeaderNav = ({ pathWithoutLocale, currentLocale }: HeaderNavProps) => {
  const { t } = useTranslation();
  return (
    <nav className="ml-6 hidden items-center gap-1 md:flex">
      {NAV_LINKS.map(({ labelKey, route }) => {
        const active = matchesRoute(pathWithoutLocale, route);
        return (
          <Link
            key={route}
            href={getLocalizedPath(route, currentLocale)}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="header-nav-pill"
                transition={SPRING_SOFT}
                className="absolute inset-0 -z-10 rounded-full bg-muted"
              />
            )}
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
};

export const AppHeader = () => {
  const { t } = useTranslation();
  const { siteName } = useBranding();
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { changeLanguage } = useLanguage();

  // Chrome intensifies once the page scrolls: transparent at the very top,
  // blurred + bordered + softly shadowed (and slightly shorter) after.
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // The entire admin area has its own chrome (AdminShell: sidebar + topbar), so
  // the public header must never appear on any /admin/* route — including the
  // admin login, which is a dedicated chrome-free surface.
  // The /account-suspended page is also chrome-free: a suspended user must
  // not have any nav affordance to bounce around the app — only the in-page
  // logout button.
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  if (isAdminPath(pathWithoutLocale) || matchesRoute(pathWithoutLocale, ROUTES.accountSuspended)) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleChangeLanguage = (lng: string) => {
    changeLanguage(lng, () => {
      setIsMobileMenuOpen(false);
    });
  };

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className={cn(
        "sticky top-0 z-50 w-full border-b px-4 transition-all duration-300 sm:px-6 lg:px-8 xl:px-12",
        scrolled
          ? "border-border bg-background/80 shadow-sm backdrop-blur-md"
          : "border-transparent bg-background/60 backdrop-blur-sm",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-480 items-center justify-between transition-all duration-300",
          scrolled ? "h-13" : "h-16",
        )}
      >
        <div className="flex items-center">
          <Link
            href={getLocalizedPath(ROUTES.home, currentLocale)}
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <BrandLogo className="h-8 w-8 rounded-xl text-sm transition-transform duration-300 group-hover:scale-105" />
            <h2 className="text-lg font-semibold tracking-tight cursor-pointer">
              {siteName}
              <span className="inline-block text-primary transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-125">
                .
              </span>
            </h2>
          </Link>

          <HeaderNav pathWithoutLocale={pathWithoutLocale} currentLocale={currentLocale} />
        </div>

        <div className="flex-1" />

        {mounted && isMobile && (
          <AppDrawer
            theme={resolvedTheme || theme || "light"}
            toggleTheme={toggleTheme}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        )}

        <div className="hidden items-center gap-3 md:flex">
          {/* Control capsule: theme, language, notifications in one pill.
              The bell is desktop-only — mobile gets its notification entry in
              the drawer — but stays mounted so the realtime socket keeps the
              drawer badge live. */}
          <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("common:ui.toggleTheme", "Toggle theme")}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-orange-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-primary" />
              )}
            </button>

            <LanguageMenu currentLocale={currentLocale} onSelect={handleChangeLanguage} />

            <NotificationBell />
          </div>

          <AuthButtons user={user} />
        </div>
      </div>
    </motion.header>
  );
};
