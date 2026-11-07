"use client";

import { useState } from "react";

import { Modal } from "antd";
import { useTranslation } from "react-i18next";

import { TierWarning } from "@/components/admin/users/TierWarning";
import { Button } from "@/components/ui/button";
import { useSetAdminPermissions } from "@/hooks/api/use-admin";
import { useUserAccess } from "@/hooks/api/use-rbac";
import type { AdminListItem } from "@/lib/types/admin";
import type { Permission } from "@/lib/types/permissions";
import { hasActiveAdminAssignment } from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";

import { PermissionMatrix } from "./PermissionMatrix";

interface EditPermissionsModalProps {
  admin: AdminListItem | null;
  catalog: Permission[];
  open: boolean;
  onClose: () => void;
}

interface EditPermissionsBodyProps {
  admin: AdminListItem;
  catalog: Permission[];
  onClose: () => void;
}

// Body is a child so `destroyOnHidden` remounts it per open — the matrix state
// then re-initialises from the selected admin's grants without a sync effect.
function EditPermissionsBody({ admin, catalog, onClose }: EditPermissionsBodyProps) {
  const { t } = useTranslation("admin");
  const [permissions, setPermissions] = useState<Permission[]>(admin.permissions);
  const setPermsMutation = useSetAdminPermissions();
  // Fixed per open so a term ending while the modal is up does not flicker.
  const [now] = useState(() => Date.now());

  // Roles and sets can keep an admin in once its grants are gone. Until that is
  // known, or if it cannot be read, the warning stays: the save may demote.
  const noGrantsLeft = admin.role === SystemRole.ADMIN && permissions.length === 0;
  const { data: access } = useUserAccess(admin.id, noGrantsLeft);
  const keepsAdminAccess =
    access !== undefined &&
    hasActiveAdminAssignment([...access.roles, ...access.permission_sets], now);
  const demotes = noGrantsLeft && !keepsAdminAccess;

  return (
    <div className="space-y-4">
      <PermissionMatrix
        catalog={catalog}
        value={permissions}
        onChange={setPermissions}
        disabled={setPermsMutation.isPending}
      />
      {demotes ? (
        <TierWarning text={t("rbac.access.assign.demoteWarning")} testId="demote" />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={setPermsMutation.isPending}>
          {t("admins.modal.cancel")}
        </Button>
        <Button
          disabled={setPermsMutation.isPending}
          onClick={() => {
            setPermsMutation.mutate(
              { id: admin.id, payload: { permissions } },
              { onSuccess: onClose },
            );
          }}
        >
          {t("admins.savePermissions")}
        </Button>
      </div>
    </div>
  );
}

export function EditPermissionsModal({ admin, catalog, open, onClose }: EditPermissionsModalProps) {
  const { t } = useTranslation("admin");
  return (
    <Modal
      open={open}
      title={admin ? t("admins.modal.title", { email: admin.email }) : ""}
      centered
      footer={null}
      width={560}
      destroyOnHidden
      onCancel={onClose}
    >
      {admin ? <EditPermissionsBody admin={admin} catalog={catalog} onClose={onClose} /> : null}
    </Modal>
  );
}
