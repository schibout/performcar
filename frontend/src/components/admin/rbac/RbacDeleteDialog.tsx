"use client";

import { useTranslation } from "react-i18next";

import { ApiErrorNote } from "@/components/admin/rbac/ApiErrorNote";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";

interface RbacDeleteDialogProps {
  // The element about to be deleted; null keeps the dialog closed.
  target: { id: string; name: string } | null;
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  // The last refusal (in use, system element...). It stays on screen so the
  // admin sees why the delete did not happen.
  error: unknown;
  onConfirm: (id: string) => void;
  onClose: () => void;
}

export function RbacDeleteDialog({
  target,
  title,
  description,
  confirmLabel,
  isPending,
  error,
  onConfirm,
  onClose,
}: RbacDeleteDialogProps) {
  const { t } = useTranslation("admin");
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={t("rbac.cancel")}
      destructive
      isLoading={isPending}
      onConfirm={() => {
        if (target) onConfirm(target.id);
      }}
    >
      <ApiErrorNote error={error} />
    </ConfirmDialog>
  );
}
