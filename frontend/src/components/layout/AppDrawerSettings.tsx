"use client";

import { useState, useEffect } from "react";

import { Moon, Sun, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface SettingsSectionProps {
  theme: string;
  toggleTheme: () => void;
  changeLanguage: (lng: string) => void;
}

export const SettingsSection = ({ theme, toggleTheme, changeLanguage }: SettingsSectionProps) => {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let current = true;
    requestAnimationFrame(() => {
      if (current) setMounted(true);
    });
    return () => {
      current = false;
    };
  }, []);

  const currentLang = i18n.language.split("-")[0];

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
        {t("common:ui.settings", "Settings")}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          onClick={toggleTheme}
          aria-label={
            mounted && theme === "dark"
              ? t("common:ui.light", "Light")
              : t("common:ui.dark", "Dark")
          }
          className="flex h-auto items-center justify-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/60 hover:border-border/60 transition-all text-left"
        >
          <div className="shrink-0 p-1.5 rounded-lg bg-background shadow-sm border border-border/50">
            {mounted && theme === "dark" ? (
              <Sun className="h-3.5 w-3.5 text-orange-500" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-muted-foreground leading-none mb-1">
              {t("common:ui.theme", "Theme")}
            </span>
            <span className="text-xs font-bold truncate">
              {mounted && theme === "dark"
                ? t("common:ui.light", "Light")
                : t("common:ui.dark", "Dark")}
            </span>
          </div>
        </Button>

        {/* Language Toggle */}
        <Button
          variant="ghost"
          onClick={() => {
            const nextLang = currentLang === "fr" ? "en" : "fr";
            changeLanguage(nextLang);
          }}
          aria-label={t("common:ui.language", "Language")}
          className="flex h-auto items-center justify-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40 hover:bg-muted/60 hover:border-border/60 transition-all text-left"
        >
          <div className="shrink-0 p-1.5 rounded-lg bg-background shadow-sm border border-border/50">
            <Globe className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-muted-foreground leading-none mb-1">
              {t("common:ui.language", "Language")}
            </span>
            <span className="text-xs font-bold truncate">
              {currentLang === "en" ? "English" : "Français"}
            </span>
          </div>
        </Button>
      </div>
    </div>
  );
};
