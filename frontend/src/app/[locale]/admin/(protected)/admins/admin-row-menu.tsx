import { type MenuProps } from "antd";
import { KeyRound, ShieldMinus, ShieldPlus, Trash2 } from "lucide-react";

import type { AdminListItem } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

export interface RowMenuActions {
  onManage: (admin: AdminListItem) => void;
  onDelete: (admin: AdminListItem) => void;
  onPromote: (admin: AdminListItem) => void;
  onDemoteSuperadmin: (admin: AdminListItem) => void;
}

interface RowMenuArgs extends RowMenuActions {
  admin: AdminListItem;
  isViewerRoot: boolean;
  canWrite: boolean;
  canDelete: boolean;
  viewerId: string | undefined;
  t: (key: string) => string;
}

// Build only the actions the viewer may perform on this row. The root
// superadmin row gets no menu at all — its role only changes via root transfer.
// The backend refuses an admin acting on a superadmin or on itself, so neither
// row offers those actions.
export const buildRowMenu = ({
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
}: RowMenuArgs): MenuProps["items"] => {
  if (admin.role === SystemRole.SUPERADMIN) {
    if (!isViewerRoot || admin.is_root_superadmin) return [];
    return [
      {
        key: "demote",
        icon: <ShieldMinus className="h-4 w-4" />,
        label: t("admins.demoteToAdmin.action"),
        onClick: () => {
          onDemoteSuperadmin(admin);
        },
      },
    ];
  }

  const isSelf = admin.id === viewerId;
  const items: NonNullable<MenuProps["items"]> = [];

  if (canWrite && !isSelf) {
    items.push({
      key: "manage-permissions",
      icon: <KeyRound className="h-4 w-4" />,
      label: t("admins.managePermissions"),
      onClick: () => {
        onManage(admin);
      },
    });
  }

  if (isViewerRoot) {
    items.push({
      key: "promote",
      icon: <ShieldPlus className="h-4 w-4" />,
      label: t("admins.promoteSuperadmin.action"),
      onClick: () => {
        onPromote(admin);
      },
    });
  }

  if (canDelete && !isSelf) {
    if (items.length > 0) items.push({ type: "divider" });
    items.push({
      key: "delete",
      icon: <Trash2 className="h-4 w-4" />,
      label: t("admins.delete.action"),
      danger: true,
      onClick: () => {
        onDelete(admin);
      },
    });
  }

  return items;
};
