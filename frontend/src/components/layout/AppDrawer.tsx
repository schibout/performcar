"use client";

import { Drawer } from "antd";
import { Menu, LogOut, Home, Info } from "lucide-react";
import { motion } from "motion/react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { drawerItem, drawerList } from "@/components/layout/app-drawer-motion";
import {
  AuthedNavLinks,
  DrawerTitle,
  NavLink,
  UserProfile,
} from "@/components/layout/AppDrawerNav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import {
  getLocaleFromPath,
  getPathWithoutLocale,
  ROUTES,
  getLocalizedPath,
  matchesRoute,
} from "@/lib/config/routes";
import { useAuthStore } from "@/stores/auth.store";

import { SettingsSection } from "./AppDrawerSettings";

interface AppDrawerProps {
  theme: string;
  toggleTheme: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const AppDrawer = ({
  theme,
  toggleTheme,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: AppDrawerProps) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { changeLanguage } = useLanguage();

  const isActive = (path: string) => {
    const currentPath = getPathWithoutLocale(pathname);
    return matchesRoute(currentPath, path);
  };

  const navigate = (href: string) => {
    setIsMobileMenuOpen(false);
    const currentLocale = getLocaleFromPath(pathname);
    router.push(getLocalizedPath(href, currentLocale));
  };

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng, () => {
      setIsMobileMenuOpen(false);
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        className="h-auto px-0 md:hidden"
        onClick={() => {
          setIsMobileMenuOpen(true);
        }}
      >
        <span className="flex rounded-lg border border-border/50 bg-background p-1.5 shadow-sm">
          <Menu className="h-5 w-5 text-foreground" />
        </span>
        <span className="sr-only">{t("common:ui.toggleMenu")}</span>
      </Button>
      <Drawer
        open={isMobileMenuOpen}
        onClose={() => {
          setIsMobileMenuOpen(false);
        }}
        placement="left"
        closable={false}
        // Remount the body each open so the staggered entrance replays.
        destroyOnHidden
        styles={{
          // 100dvh tracks the *visible* mobile viewport (URL bar collapsed or
          // not); plain 100% resolves against the layout viewport and lets the
          // bottom actions slide off-screen behind the browser chrome.
          wrapper: { width: "85vw", maxWidth: "24rem", height: "100dvh" },
          section: { background: "var(--background)" },
          body: { padding: 0 },
          header: {
            padding: "1.5rem 1.5rem 1.25rem",
            background: "var(--background)",
            borderBottom: "1px solid var(--border)",
          },
        }}
        title={
          <DrawerTitle
            onClose={() => {
              setIsMobileMenuOpen(false);
            }}
          />
        }
        classNames={{ wrapper: "max-w-sm" }}
      >
        <motion.div
          variants={drawerList}
          initial="hidden"
          animate="visible"
          className="flex h-full flex-col gap-6 p-6 overflow-y-auto bg-background text-foreground"
        >
          {user && (
            <motion.div variants={drawerItem}>
              <UserProfile user={user} />
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <NavLink
              href={ROUTES.home}
              icon={Home}
              label={t("common:nav.home")}
              active={isActive(ROUTES.home)}
              onClick={navigate}
            />
            <NavLink
              href={ROUTES.about}
              icon={Info}
              label={t("common:nav.about")}
              active={isActive(ROUTES.about)}
              onClick={navigate}
            />
            {user && <AuthedNavLinks user={user} isActive={isActive} navigate={navigate} />}
          </div>

          <motion.div
            variants={drawerItem}
            className="mt-auto pt-6 border-t flex flex-col gap-6 pb-6"
          >
            <SettingsSection
              theme={theme}
              toggleTheme={toggleTheme}
              changeLanguage={handleLanguageChange}
            />
            {!user ? (
              <div className="flex gap-3 w-full">
                <Button
                  className="flex-1 h-11 text-base rounded-xl shadow-md shadow-primary/25"
                  onClick={() => {
                    navigate(ROUTES.login);
                  }}
                >
                  {t("auth:login.submitButton")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-base rounded-xl"
                  onClick={() => {
                    navigate(ROUTES.register);
                  }}
                >
                  {t("auth:register.submitButton")}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                className="w-full justify-start h-11 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/15 font-medium px-3"
                onClick={() => {
                  navigate(ROUTES.logout);
                }}
              >
                <LogOut className="mr-3 h-4 w-4" />
                {t("auth:logout.logoutButton")}
              </Button>
            )}
          </motion.div>
        </motion.div>
      </Drawer>
    </>
  );
};
