"use client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminListItem } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

interface AdminRowProps {
  admin: AdminListItem;
  // Whether the current viewer is the root superadmin — gates the superadmin-tier
  // actions (promote an admin to superadmin, demote a superadmin to admin).
  isViewerRoot: boolean;
  // admins:write and admins:delete: gate the actions on a plain admin.
  canWrite: boolean;
  canDelete: boolean;
  viewerId: string | undefined;
  onManage: (admin: AdminListItem) => void;
  onDelete: (admin: AdminListItem) => void;
  onPromote: (admin: AdminListItem) => void;
  onDemoteSuperadmin: (admin: AdminListItem) => void;
}

export function AdminRow({
  admin,
  isViewerRoot,
  canWrite,
  canDelete,
  viewerId,
  onManage,
  onDelete,
  onPromote,
  onDemoteSuperadmin,
}: AdminRowProps) {
  const { t } = useTranslation("admin");
  const fullName = [admin.first_name, admin.last_name].filter(Boolean).join(" ");
  const isSuperadmin = admin.role === SystemRole.SUPERADMIN;
  const isSelf = admin.id === viewerId;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{admin.email}</p>
          {fullName ? <p className="text-sm text-muted-foreground">{fullName}</p> : null}
        </div>

        {isSuperadmin ? (
          <div className="flex flex-wrap items-center gap-2">
            {admin.is_root_superadmin ? (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600">
                {t("admins.rootBadge")}
              </span>
            ) : null}
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {t("admins.superadminBadge")}
            </span>
            {isViewerRoot && !admin.is_root_superadmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDemoteSuperadmin(admin);
                }}
              >
                {t("admins.demoteToAdmin.action")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("admins.permissionCount", { count: admin.permissions.length })}
            </span>
            {canWrite && !isSelf ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onManage(admin);
                }}
              >
                {t("admins.managePermissions")}
              </Button>
            ) : null}
            {isViewerRoot ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onPromote(admin);
                }}
              >
                {t("admins.promoteSuperadmin.action")}
              </Button>
            ) : null}
            {canDelete && !isSelf ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDelete(admin);
                }}
              >
                {t("admins.delete.action")}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
