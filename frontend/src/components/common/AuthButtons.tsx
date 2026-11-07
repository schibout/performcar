"use client";

import { useState } from "react";

import { Dropdown } from "antd";
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePublicSettings } from "@/hooks/api/use-system-settings";
import { useCanReadOwnSupport } from "@/hooks/use-permissions";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { SystemRole } from "@/lib/types/user";
import { cn } from "@/lib/utils";
import type { User } from "@/stores/auth.store";

interface AuthButtonsProps {
  user: User | null;
  onNavigate?: () => void;
}

interface MenuEntry {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  route: string;
  adminOnly?: boolean;
  // Hidden unless the account holds `self.support:read`.
  supportOnly?: boolean;
}

const MENU_ENTRIES: MenuEntry[] = [
  {
    key: "admin",
    icon: ShieldCheck,
    labelKey: "admin:shell.title",
    route: ROUTES.adminDashboard,
    adminOnly: true,
  },
  {
    key: "dashboard",
    icon: LayoutDashboard,
    labelKey: "common:nav.dashboard",
    route: ROUTES.dashboard,
  },
  { key: "profile", icon: UserIcon, labelKey: "common:nav.profile", route: ROUTES.profile },
  {
    key: "support",
    icon: LifeBuoy,
    labelKey: "common:nav.support",
    route: ROUTES.support,
    supportOnly: true,
  },
];

export const AuthButtons = ({ user, onNavigate }: AuthButtonsProps) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const router = useRouter();
  const { data: publicSettings } = usePublicSettings();
  const canRegister = publicSettings?.data.registration_enabled !== false;
  const [open, setOpen] = useState(false);
  const canReadSupport = useCanReadOwnSupport();

  const navigate = (path: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(getLocalizedPath(path, currentLocale));
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link
            href={getLocalizedPath(ROUTES.login, currentLocale)}
            onClick={() => {
              onNavigate?.();
            }}
          >
            {t("auth:login.submitButton", "Login")}
          </Link>
        </Button>
        {canRegister && (
          <Button asChild className="shadow-md shadow-primary/25">
            <Link
              href={getLocalizedPath(ROUTES.register, currentLocale)}
              onClick={() => {
                onNavigate?.();
              }}
            >
              {t("auth:register.submitButton", "Register")}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const fullName =
    user.first_name || user.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : t("common:ui.userFallback", "User");

  const entries = MENU_ENTRIES.filter(
    (entry) =>
      (!entry.adminOnly || user.role === SystemRole.ADMIN) &&
      (!entry.supportOnly || canReadSupport),
  );

  const panel = (
    <div
      role="menu"
      className="w-64 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl"
    >
      {/* Identity block */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3">
        <Avatar className="h-10 w-10 border border-border/60">
          {user.avatar_file?.url && <AvatarImage src={user.avatar_file.url} alt={user.email} />}
          <AvatarFallback className="bg-primary/10 text-primary">
            {user.first_name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="my-2 h-px bg-border/60" />

      {entries.map(({ key, icon: Icon, labelKey, route, adminOnly }) => (
        <button
          key={key}
          role="menuitem"
          type="button"
          onClick={() => {
            navigate(route);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              adminOnly ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          {t(labelKey)}
        </button>
      ))}

      <div className="my-2 h-px bg-border/60" />

      <button
        role="menuitem"
        type="button"
        onClick={() => {
          navigate(ROUTES.logout);
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <LogOut className="h-4 w-4" />
        </span>
        {t("auth:logout.logoutButton", "Log out")}
      </button>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => panel}
    >
      <span>
        <Button
          variant="ghost"
          aria-label={t("common:ui.userMenu", "User menu")}
          className="relative h-10 w-10 rounded-full p-0 transition-transform duration-200 hover:scale-105"
        >
          {/* Gradient ring around the avatar signals it's interactive */}
          <span className="rounded-full bg-gradient-to-br from-primary to-primary/40 p-0.5">
            <Avatar className="h-9 w-9 border-2 border-background">
              {user.avatar_file?.url && <AvatarImage src={user.avatar_file.url} alt={user.email} />}
              <AvatarFallback>
                {user.first_name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </span>
        </Button>
      </span>
    </Dropdown>
  );
};
