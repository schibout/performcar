"use client";

import { useEffect, useState } from "react";

import { ArrowUp, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { useBranding } from "@/hooks/use-branding";
import { useLanguage } from "@/hooks/use-language";
import { useCanReadOwnSupport } from "@/hooks/use-permissions";
import { useTheme } from "@/hooks/use-theme";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { SPRING_SOFT, fadeIn } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

const LOCALES = ["fr", "en"] as const;
const BACK_TO_TOP_AT = 600;

interface FooterLink {
  labelKey: string;
  route: string;
}

interface FooterColumnProps {
  title: string;
  links: FooterLink[];
  locale: string;
  t: (key: string) => string;
}

function FooterColumn({ title, links, locale, t }: FooterColumnProps) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(({ labelKey, route }) => (
          <li key={labelKey}>
            <Link
              href={getLocalizedPath(route, locale)}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Floating "back to top" pill; appears once the page has been scrolled.
function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > BACK_TO_TOP_AT);
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          whileHover={{ y: -4 }}
          transition={SPRING_SOFT}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label={label}
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-primary shadow-lg shadow-primary/15 backdrop-blur-md"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Landing footer: brand block + titled link columns (adapting to auth state),
// then a rights bar that doubles as a tool strip (theme + language switchers).
// A gradient hairline and grain texture tie it to the rest of the theme.
export function HomeFooter() {
  const { t } = useTranslation(["home", "common", "auth"]);
  const { siteName } = useBranding();
  const { user } = useAuthStore();
  const canReadSupport = useCanReadOwnSupport();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const { changeLanguage } = useLanguage();
  const { setTheme, resolvedTheme } = useTheme();

  // Resolved theme is unknown during SSR; render the icon only after mount to
  // avoid a hydration mismatch (same pattern as AppHeader).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const exploreLinks: FooterLink[] = [
    { labelKey: "common:nav.home", route: ROUTES.home },
    { labelKey: "common:nav.about", route: ROUTES.about },
    ...(user ? [{ labelKey: "common:nav.dashboard", route: ROUTES.dashboard }] : []),
  ];

  const accountLinks: FooterLink[] = user
    ? [
        { labelKey: "common:nav.profile", route: ROUTES.profile },
        ...(canReadSupport ? [{ labelKey: "common:nav.support", route: ROUTES.support }] : []),
      ]
    : [
        { labelKey: "auth:login.submitButton", route: ROUTES.login },
        { labelKey: "auth:register.submitButton", route: ROUTES.register },
      ];

  const year = new Date().getFullYear();

  return (
    <motion.footer
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="texture-grain relative border-t border-border/60 bg-muted/40"
    >
      {/* Gradient hairline: bright at the center, fading to the edges */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 text-center sm:grid-cols-[2fr_1fr_1fr] sm:text-left">
          <div className="col-span-2 mx-auto max-w-sm sm:col-span-1 sm:mx-0 sm:pr-8">
            <p className="font-display text-2xl font-semibold tracking-tight">
              {siteName}
              <span className="text-primary">.</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("home:footer.tagline")}
            </p>
          </div>

          <FooterColumn
            title={t("home:footer.exploreTitle")}
            links={exploreLinks}
            locale={currentLocale}
            t={t}
          />
          <FooterColumn
            title={t("home:footer.accountTitle")}
            links={accountLinks}
            locale={currentLocale}
            t={t}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} {siteName} — {t("home:footer.rights")}
          </p>

          {/* Tool strip: theme + language */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
              }}
              aria-label={t("common:ui.toggleTheme")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:text-primary"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 p-1">
              {LOCALES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => {
                    changeLanguage(locale);
                  }}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold uppercase transition-colors",
                    currentLocale === locale
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {locale}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BackToTop label={t("home:footer.backToTop")} />
    </motion.footer>
  );
}
