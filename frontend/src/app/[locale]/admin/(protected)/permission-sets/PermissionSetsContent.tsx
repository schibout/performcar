"use client";

import { useState } from "react";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AudienceBadge } from "@/components/admin/rbac/AudienceBadge";
import { RbacDeleteDialog } from "@/components/admin/rbac/RbacDeleteDialog";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useDeletePermissionSet,
  usePermissionSets,
  useRbacPermissionCatalog,
} from "@/hooks/api/use-rbac";
import {
  useCanReadPermissionSets,
  useCanWritePermissionSets,
  usePermissions,
} from "@/hooks/use-permissions";
import type { PermissionSet } from "@/lib/types/rbac";

import { AdminForbidden } from "../AdminForbidden";
import { PermissionSetFormModal } from "./PermissionSetFormModal";

export function PermissionSetsContent() {
  const { t } = useTranslation("admin");
  const { has } = usePermissions();
  const canRead = useCanReadPermissionSets();
  const canWrite = useCanWritePermissionSets();

  const setsQuery = usePermissionSets(canRead);
  // The catalog is only needed to edit; the API opens it to roles:read and
  // permission_sets:read alike.
  const catalogQuery = useRbacPermissionCatalog(canRead && canWrite);
  const deleteSet = useDeletePermissionSet();

  // `undefined` form target = closed; `null` = creating a new set.
  const [editing, setEditing] = useState<PermissionSet | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<PermissionSet | null>(null);

  if (!canRead) return <AdminForbidden />;

  const sets = setsQuery.data?.data ?? [];
  // A viewer only hands out keys it holds; the other keys of an edited set stay
  // in the form's state and are resent unchanged.
  const catalog = (catalogQuery.data?.data ?? []).map((info) => info.key).filter(has);

  const closeDelete = () => {
    deleteSet.reset();
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("rbac.sets.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("rbac.sets.subtitle")}</p>
        </div>
        {canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
            }}
          >
            {t("rbac.sets.create")}
          </Button>
        ) : null}
      </div>

      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-0">
          <AdminTable>
            <AdminThead>
              <AdminTh className="text-start">{t("rbac.sets.columns.set")}</AdminTh>
              <AdminTh className="text-center">{t("rbac.sets.columns.audience")}</AdminTh>
              <AdminTh className="text-center">{t("rbac.sets.columns.permissions")}</AdminTh>
              <AdminTh className="text-right">{t("rbac.sets.columns.actions")}</AdminTh>
            </AdminThead>
            <AdminTbody>
              {sets.map((set) => {
                const readOnly = !canWrite || set.is_system;
                return (
                  <AdminTr key={set.id} data-testid={`set-row-${set.key}`}>
                    <AdminTd className="text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{set.name}</p>
                        {set.is_system ? (
                          <StatusBadge tone="warning">{t("rbac.system")}</StatusBadge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{set.key}</p>
                      {set.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{set.description}</p>
                      ) : null}
                    </AdminTd>
                    <AdminTd className="text-center">
                      <AudienceBadge audience={set.audience} />
                    </AdminTd>
                    <AdminTd className="text-center text-xs text-muted-foreground">
                      {t("rbac.sets.permissionCount", { count: set.permissions.length })}
                    </AdminTd>
                    <AdminTd className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${readOnly ? t("rbac.view") : t("rbac.edit")} ${set.name}`}
                          onClick={() => {
                            setEditing(set);
                          }}
                        >
                          {readOnly ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </Button>
                        {/* System sets never offer a delete: the API refuses it. */}
                        {canWrite && !set.is_system ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t("rbac.delete")} ${set.name}`}
                            onClick={() => {
                              setDeleting(set);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </AdminTd>
                  </AdminTr>
                );
              })}
              {sets.length === 0 ? (
                <AdminTableStateRow
                  colSpan={4}
                  isLoading={setsQuery.isLoading}
                  loadingLabel={t("rbac.sets.loading")}
                  emptyLabel={t("rbac.sets.empty")}
                />
              ) : null}
            </AdminTbody>
          </AdminTable>
        </CardContent>
      </Card>

      <PermissionSetFormModal
        permissionSet={editing ?? null}
        open={editing !== undefined}
        readOnly={editing ? !canWrite || editing.is_system : !canWrite}
        catalog={catalog}
        catalogFailed={catalogQuery.isError}
        catalogLoading={catalogQuery.isLoading}
        onClose={() => {
          setEditing(undefined);
        }}
      />

      <RbacDeleteDialog
        target={deleting}
        title={t("rbac.sets.delete.title")}
        description={t("rbac.sets.delete.description", { name: deleting?.name ?? "" })}
        confirmLabel={t("rbac.sets.delete.confirm")}
        isPending={deleteSet.isPending}
        error={deleteSet.error}
        onConfirm={(id) => {
          deleteSet.mutate(id, { onSuccess: closeDelete });
        }}
        onClose={closeDelete}
      />
    </div>
  );
}
