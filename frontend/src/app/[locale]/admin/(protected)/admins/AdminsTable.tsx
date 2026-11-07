"use client";

import { Dropdown } from "antd";
import { MoreHorizontal } from "lucide-react";
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
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCanReadUsers } from "@/hooks/use-permissions";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { formatDate } from "@/lib/format-date";
import type { AdminListItem } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

import { buildRowMenu, type RowMenuActions } from "./admin-row-menu";

interface AdminsTableProps extends RowMenuActions {
  rows: AdminListItem[];
  isLoading: boolean;
  // Whether the current viewer is the root superadmin — gates the
  // superadmin-tier actions (promote to superadmin, demote back to admin).
  isViewerRoot: boolean;
  // admins:write and admins:delete: gate the actions on plain admin rows.
  canWrite: boolean;
  canDelete: boolean;
  viewerId: string | undefined;
}

export function AdminsTable({
  rows,
  isLoading,
  isViewerRoot,
  canWrite,
  canDelete,
  viewerId,
  onManage,
  onDelete,
  onPromote,
  onDemoteSuperadmin,
}: AdminsTableProps) {
  const { t } = useTranslation("admin");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const canReadUsers = useCanReadUsers();

  return (
    <AdminTable>
      <AdminThead>
        <AdminTh className="text-start">{t("admins.columns.admin")}</AdminTh>
        <AdminTh className="text-center">{t("admins.columns.role")}</AdminTh>
        <AdminTh className="text-center" title={t("admins.directPermissionsHint")}>
          {t("admins.columns.permissions")}
        </AdminTh>
        <AdminTh className="text-center">{t("admins.columns.created")}</AdminTh>
        <AdminTh className="text-right">{t("admins.columns.actions")}</AdminTh>
      </AdminThead>
      <AdminTbody>
        {rows.map((admin) => {
          const fullName = [admin.first_name, admin.last_name].filter(Boolean).join(" ");
          const isSuperadmin = admin.role === SystemRole.SUPERADMIN;
          const menuItems = buildRowMenu({
            admin,
            isViewerRoot,
            canWrite,
            canDelete,
            viewerId,
            t,
            onManage,
            onDelete,
            onPromote,
            onDemoteSuperadmin,
          });

          return (
            <AdminTr key={admin.id}>
              <AdminTd className="text-start">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs uppercase">
                      {(admin.first_name?.[0] ?? admin.email[0]).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fullName || admin.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
              </AdminTd>
              <AdminTd className="text-center">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {admin.is_root_superadmin ? (
                    <StatusBadge tone="warning">{t("admins.rootBadge")}</StatusBadge>
                  ) : null}
                  <StatusBadge tone={isSuperadmin ? "primary" : "info"}>
                    {t(`users.role.${admin.role}` as const)}
                  </StatusBadge>
                </div>
              </AdminTd>
              <AdminTd className="text-center text-xs text-muted-foreground">
                {/* Direct grants only: keys held through roles are not counted, so
                    the count links to the account's access panel, which shows all. */}
                {canReadUsers ? (
                  <Link
                    href={`${getLocalizedPath(`${ROUTES.adminUsers}/${admin.id}`, currentLocale)}#access`}
                    title={t("admins.viewAccess")}
                    aria-label={`${t("admins.viewAccess")}: ${admin.email}`}
                    className="text-primary hover:underline"
                  >
                    {admin.permissions.length}
                  </Link>
                ) : (
                  admin.permissions.length
                )}
              </AdminTd>
              <AdminTd className="whitespace-nowrap text-center text-xs text-muted-foreground">
                {formatDate(admin.created_at)}
              </AdminTd>
              <AdminTd className="text-right">
                {menuItems && menuItems.length > 0 ? (
                  <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                    <span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("admins.rowActions.menu")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </span>
                  </Dropdown>
                ) : null}
              </AdminTd>
            </AdminTr>
          );
        })}
        {rows.length === 0 ? (
          <AdminTableStateRow
            colSpan={5}
            isLoading={isLoading}
            loadingLabel={t("admins.loading")}
            emptyLabel={t("admins.empty")}
          />
        ) : null}
      </AdminTbody>
    </AdminTable>
  );
}
