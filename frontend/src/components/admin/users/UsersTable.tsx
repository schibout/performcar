"use client";

import { Dropdown, type MenuProps } from "antd";
import {
  Ban,
  ChevronRight,
  KeyRound,
  LockOpen,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import {
  AdminTable,
  AdminTableStateRow,
  AdminTbody,
  AdminTd,
  AdminTh,
  AdminThead,
  AdminTr,
} from "@/components/admin/shared/AdminTable";
import { StatusBadge, UserStatusBadge } from "@/components/admin/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserActionKind } from "@/hooks/api/use-user-actions";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { formatDate } from "@/lib/format-date";
import type { AdminUser } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

import {
  NO_ADMIN_TIER_CAPS,
  capsForTarget,
  type AdminTierCaps,
  type UserActionCaps,
} from "./target-caps";

// Distinct badge tone per role so the three tiers are visually separable in the
// list (previously superadmin and user both rendered as muted).
const ROLE_TONE: Record<SystemRole, "primary" | "info" | "muted"> = {
  [SystemRole.SUPERADMIN]: "primary",
  [SystemRole.ADMIN]: "info",
  [SystemRole.USER]: "muted",
};

interface UsersTableProps {
  rows: AdminUser[];
  isLoading: boolean;
  currentUserId: string | null;
  caps: UserActionCaps;
  // The viewer's admin-tier keys: an admin or superadmin row only offers the
  // actions the API accepts for them. Omitted means none.
  adminTier?: AdminTierCaps;
  onAction: (kind: UserActionKind, user: AdminUser) => void;
}

interface RowMenuArgs {
  user: AdminUser;
  isSelf: boolean;
  onAction: UsersTableProps["onAction"];
  t: (key: string) => string;
  caps: UserActionCaps;
}

// Build only the row actions the admin is permitted to perform. An item missing
// here means the admin lacks that permission, so the action is never offered
// (and no request is ever sent for it).
const buildRowMenu = ({ user, isSelf, onAction, t, caps }: RowMenuArgs): MenuProps["items"] => {
  const items: NonNullable<MenuProps["items"]> = [];

  if (caps.canSuspend) {
    items.push(
      user.suspended_at
        ? {
            key: "unsuspend",
            icon: <RotateCcw className="h-4 w-4" />,
            label: t("users.rowActions.unsuspend"),
            onClick: () => {
              onAction("unsuspend", user);
            },
          }
        : {
            key: "suspend",
            icon: <Ban className="h-4 w-4" />,
            label: t("users.rowActions.suspend"),
            danger: true,
            disabled: isSelf,
            onClick: () => {
              onAction("suspend", user);
            },
          },
    );
  }

  if (caps.canUnlock) {
    items.push({
      key: "unlock",
      icon: <LockOpen className="h-4 w-4" />,
      label: t("users.rowActions.unlock"),
      onClick: () => {
        onAction("unlock", user);
      },
    });
  }

  if (caps.canResetPassword) {
    items.push({
      key: "change-password",
      icon: <KeyRound className="h-4 w-4" />,
      label: t("users.rowActions.changePassword"),
      onClick: () => {
        onAction("change-password", user);
      },
    });
  }

  if (caps.canDelete) {
    if (items.length > 0) items.push({ type: "divider" });
    items.push({
      key: "delete",
      icon: <Trash2 className="h-4 w-4" />,
      label: t("users.rowActions.delete"),
      danger: true,
      disabled: isSelf,
      onClick: () => {
        onAction("delete", user);
      },
    });
  }

  return items;
};

export function UsersTable({
  rows,
  isLoading,
  currentUserId,
  caps,
  adminTier = NO_ADMIN_TIER_CAPS,
  onAction,
}: UsersTableProps) {
  const { t } = useTranslation("admin");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);

  return (
    <AdminTable>
      <AdminThead>
        <AdminTh className="text-start">{t("users.columns.user")}</AdminTh>
        <AdminTh className="text-center">{t("users.columns.role")}</AdminTh>
        <AdminTh className="text-center">{t("users.columns.status")}</AdminTh>
        <AdminTh className="text-center">{t("users.columns.verified")}</AdminTh>
        <AdminTh className="text-center">{t("users.columns.created")}</AdminTh>
        <AdminTh className="text-right">{t("users.columns.actions")}</AdminTh>
      </AdminThead>
      <AdminTbody>
        {rows.map((user) => {
          const isSelf = currentUserId === user.id;
          const rowCaps = capsForTarget(caps, user.role, adminTier);
          const hasRowActions =
            rowCaps.canSuspend ||
            rowCaps.canResetPassword ||
            rowCaps.canDelete ||
            rowCaps.canUnlock;
          return (
            <AdminTr key={user.id}>
              <AdminTd className="text-start">
                <Link
                  href={getLocalizedPath(`${ROUTES.adminUsers}/${user.id}`, currentLocale)}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="size-9">
                    {user.avatar_file?.url && (
                      <AvatarImage src={user.avatar_file.url} alt={user.email} />
                    )}
                    <AvatarFallback className="text-xs uppercase">
                      {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {user.first_name || user.last_name
                        ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                        : user.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </Link>
              </AdminTd>
              <AdminTd className="text-center">
                <StatusBadge tone={ROLE_TONE[user.role]}>
                  {t(`users.role.${user.role}` as const)}
                </StatusBadge>
              </AdminTd>
              <AdminTd className="text-center">
                <UserStatusBadge user={user} />
              </AdminTd>
              <AdminTd className="text-center text-xs text-muted-foreground">
                {user.is_verified ? "✓" : "—"}
              </AdminTd>
              <AdminTd className="whitespace-nowrap text-center text-xs text-muted-foreground">
                {formatDate(user.created_at)}
              </AdminTd>
              <AdminTd className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      href={getLocalizedPath(`${ROUTES.adminUsers}/${user.id}`, currentLocale)}
                      aria-label={t("users.rowActions.open")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  {hasRowActions ? (
                    <Dropdown
                      menu={{ items: buildRowMenu({ user, isSelf, onAction, t, caps: rowCaps }) }}
                      trigger={["click"]}
                      placement="bottomRight"
                    >
                      <span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("users.rowActions.menu")}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </span>
                    </Dropdown>
                  ) : null}
                </div>
              </AdminTd>
            </AdminTr>
          );
        })}
        {rows.length === 0 ? (
          <AdminTableStateRow
            colSpan={6}
            isLoading={isLoading}
            loadingLabel={t("users.loading")}
            emptyLabel={t("users.empty")}
          />
        ) : null}
      </AdminTbody>
    </AdminTable>
  );
}
