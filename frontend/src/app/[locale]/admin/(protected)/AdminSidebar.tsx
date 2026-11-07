"use client";

import { Tooltip } from "antd";
import { motion } from "motion/react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/common/BrandLogo";
import { useBranding } from "@/hooks/use-branding";
import { getLocalizedPath, matchesRoute } from "@/lib/config/routes";
import { SPRING_SOFT } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";
import type { User } from "@/stores/auth.store";

import { AdminSidebarFooter } from "./AdminSidebarFooter";

import type { AdminNavSection } from "./admin-nav";

interface AdminSidebarProps {
  sections: AdminNavSection[];
  currentLocale: string;
  pathWithoutLocale: string;
  user: NonNullable<User>;
  // Desktop icon-rail: hide all text, show icons only.
  collapsed: boolean;
  // Close the mobile drawer after navigating.
  onNavigate?: () => void;
}

export function AdminSidebar({
  sections,
  currentLocale,
  pathWithoutLocale,
  user,
  collapsed,
  onNavigate,
}: AdminSidebarProps) {
  const { t } = useTranslation("admin");
  const { siteName } = useBranding();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-3 border-b border-border/60 py-4",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <BrandLogo className="h-9 w-9 rounded-xl text-sm" />
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {siteName}
              <span className="text-primary">.</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{t("shell.brandSubtitle")}</p>
          </div>
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {sections.map((section) => (
          <div key={section.key} className="mb-4 last:mb-0">
            {collapsed ? null : (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {t(`shell.section.${section.key}`)}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = matchesRoute(pathWithoutLocale, item.href);
                const label = t(`shell.nav.${item.key}`);
                const link = (
                  <Link
                    href={getLocalizedPath(item.href, currentLocale)}
                    onClick={onNavigate}
                    aria-label={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative isolate flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0" : "gap-2.5 px-3",
                      active
                        ? "font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <>
                        {/* Shared layoutId — the highlight glides between items */}
                        <motion.span
                          layoutId="admin-nav-active"
                          transition={SPRING_SOFT}
                          className="absolute inset-0 -z-10 rounded-lg bg-primary/10"
                        />
                        <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                      </>
                    ) : null}
                    <Icon className="h-4 w-4 shrink-0" />
                    {collapsed ? null : <span className="truncate">{label}</span>}
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.key} title={label} placement="right">
                    {link}
                  </Tooltip>
                ) : (
                  <div key={item.key}>{link}</div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <AdminSidebarFooter user={user} currentLocale={currentLocale} collapsed={collapsed} />
    </div>
  );
}
