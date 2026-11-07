"use client";

import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import type { UserActionKind } from "@/hooks/api/use-user-actions";

export type { UserActionKind };

interface UserActionDialogsProps {
  action: UserActionKind | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

// Centralises the five confirm dialogs used by the users list + detail pages
// so both surfaces share the same copy and behavior.
export function UserActionDialogs({
  action,
  onOpenChange,
  onConfirm,
  isLoading,
}: UserActionDialogsProps) {
  const { t } = useTranslation("admin");

  return (
    <>
      <ConfirmDialog
        open={action === "unsuspend"}
        onOpenChange={onOpenChange}
        title={t("confirm.unsuspendTitle")}
        description={t("confirm.unsuspendDescription")}
        confirmLabel={t("confirm.unsuspendConfirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={onConfirm}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={action === "suspend"}
        onOpenChange={onOpenChange}
        title={t("confirm.suspendTitle")}
        description={t("confirm.suspendDescription")}
        confirmLabel={t("confirm.suspendConfirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={onConfirm}
        isLoading={isLoading}
        destructive
      />
      <ConfirmDialog
        open={action === "unlock"}
        onOpenChange={onOpenChange}
        title={t("confirm.unlockTitle")}
        description={t("confirm.unlockDescription")}
        confirmLabel={t("confirm.unlockConfirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={onConfirm}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={action === "change-password"}
        onOpenChange={onOpenChange}
        title={t("confirm.changePasswordTitle")}
        description={t("confirm.changePasswordDescription")}
        confirmLabel={t("confirm.changePasswordConfirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={onConfirm}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={action === "delete"}
        onOpenChange={onOpenChange}
        title={t("confirm.deleteTitle")}
        description={t("confirm.deleteDescription")}
        confirmLabel={t("confirm.deleteConfirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={onConfirm}
        isLoading={isLoading}
        destructive
      />
    </>
  );
}
