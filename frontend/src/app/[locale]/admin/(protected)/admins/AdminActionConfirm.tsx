"use client";

import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { useDeleteAdmin, useDemoteSuperadmin, usePromoteSuperadmin } from "@/hooks/api/use-admin";
import type { AdminListItem } from "@/lib/types/admin";

export type AdminActionKind = "delete" | "promote" | "demote";

export interface AdminActionState {
  kind: AdminActionKind;
  admin: AdminListItem;
}

interface ActionMeta {
  i18n: string;
  destructive: boolean;
  isPending: boolean;
  run: (id: string, onDone: () => void) => void;
}

interface AdminActionConfirmProps {
  action: AdminActionState | null;
  onClose: () => void;
}

// Single confirmation dialog backing all three superadmin-tier actions. Owns the
// mutations so the parent list stays lean; each kind maps to its i18n block,
// styling, and the mutation that performs it.
export function AdminActionConfirm({ action, onClose }: AdminActionConfirmProps) {
  const { t } = useTranslation("admin");
  const deleteMutation = useDeleteAdmin();
  const promoteMutation = usePromoteSuperadmin();
  const demoteMutation = useDemoteSuperadmin();

  const meta: Record<AdminActionKind, ActionMeta> = {
    delete: {
      i18n: "delete",
      destructive: true,
      isPending: deleteMutation.isPending,
      run: (id, onDone) => {
        deleteMutation.mutate(id, { onSuccess: onDone });
      },
    },
    promote: {
      i18n: "promoteSuperadmin",
      destructive: false,
      isPending: promoteMutation.isPending,
      run: (id, onDone) => {
        promoteMutation.mutate(id, { onSuccess: onDone });
      },
    },
    demote: {
      i18n: "demoteToAdmin",
      destructive: true,
      isPending: demoteMutation.isPending,
      run: (id, onDone) => {
        demoteMutation.mutate(id, { onSuccess: onDone });
      },
    },
  };
  const active = action ? meta[action.kind] : null;

  return (
    <ConfirmDialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={active ? t(`admins.${active.i18n}.title`) : ""}
      description={
        action && active
          ? t(`admins.${active.i18n}.description`, { email: action.admin.email })
          : ""
      }
      confirmLabel={active ? t(`admins.${active.i18n}.confirm`) : ""}
      cancelLabel={active ? t(`admins.${active.i18n}.cancel`) : ""}
      destructive={active?.destructive ?? false}
      isLoading={active?.isPending ?? false}
      onConfirm={() => {
        if (!action || !active) return;
        active.run(action.admin.id, onClose);
      }}
    />
  );
}
