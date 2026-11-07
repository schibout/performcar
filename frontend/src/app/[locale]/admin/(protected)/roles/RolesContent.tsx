"use client";

import { useState } from "react";

import { Pencil, Trash2, Eye } from "lucide-react";
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
import { useDeleteRole, usePermissionSets, useRoles } from "@/hooks/api/use-rbac";
import {
  useCanReadPermissionSets,
  useCanReadRoles,
  useCanWriteRoles,
} from "@/hooks/use-permissions";
import type { Role } from "@/lib/types/rbac";

import { AdminForbidden } from "../AdminForbidden";
import { RoleFormModal } from "./RoleFormModal";

export function RolesContent() {
  const { t } = useTranslation("admin");
  const canRead = useCanReadRoles();
  const canWrite = useCanWriteRoles();
  const canReadSets = useCanReadPermissionSets();

  const rolesQuery = useRoles(canRead);
  const setsQuery = usePermissionSets(canRead && canReadSets);
  const deleteRole = useDeleteRole();

  // `undefined` form target = closed; `null` = creating a new role.
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Role | null>(null);

  if (!canRead) return <AdminForbidden />;

  const roles = rolesQuery.data?.data ?? [];

  const closeDelete = () => {
    deleteRole.reset();
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("rbac.roles.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("rbac.roles.subtitle")}</p>
        </div>
        {canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
            }}
          >
            {t("rbac.roles.create")}
          </Button>
        ) : null}
      </div>

      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-0">
          <AdminTable>
            <AdminThead>
              <AdminTh className="text-start">{t("rbac.roles.columns.role")}</AdminTh>
              <AdminTh className="text-center">{t("rbac.roles.columns.audience")}</AdminTh>
              <AdminTh className="text-start">{t("rbac.roles.columns.sets")}</AdminTh>
              <AdminTh className="text-right">{t("rbac.roles.columns.actions")}</AdminTh>
            </AdminThead>
            <AdminTbody>
              {roles.map((role) => {
                const readOnly = !canWrite || role.is_system;
                return (
                  <AdminTr key={role.id} data-testid={`role-row-${role.key}`}>
                    <AdminTd className="text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{role.name}</p>
                        {role.is_system ? (
                          <StatusBadge tone="warning">{t("rbac.system")}</StatusBadge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{role.key}</p>
                      {role.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>
                      ) : null}
                    </AdminTd>
                    <AdminTd className="text-center">
                      <AudienceBadge audience={role.audience} />
                    </AdminTd>
                    <AdminTd className="text-start">
                      {role.permission_sets.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {t("rbac.roles.noSets")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {role.permission_sets.map((set) => (
                            <StatusBadge key={set.id} tone="muted">
                              {set.name}
                            </StatusBadge>
                          ))}
                        </div>
                      )}
                    </AdminTd>
                    <AdminTd className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${readOnly ? t("rbac.view") : t("rbac.edit")} ${role.name}`}
                          onClick={() => {
                            setEditing(role);
                          }}
                        >
                          {readOnly ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </Button>
                        {/* System roles never offer a delete: the API refuses it. */}
                        {canWrite && !role.is_system ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${t("rbac.delete")} ${role.name}`}
                            onClick={() => {
                              setDeleting(role);
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
              {roles.length === 0 ? (
                <AdminTableStateRow
                  colSpan={4}
                  isLoading={rolesQuery.isLoading}
                  loadingLabel={t("rbac.roles.loading")}
                  emptyLabel={t("rbac.roles.empty")}
                />
              ) : null}
            </AdminTbody>
          </AdminTable>
        </CardContent>
      </Card>

      <RoleFormModal
        role={editing ?? null}
        open={editing !== undefined}
        readOnly={editing ? !canWrite || editing.is_system : !canWrite}
        permissionSets={canReadSets ? setsQuery.data?.data : undefined}
        setsLoading={canReadSets && setsQuery.isLoading}
        onClose={() => {
          setEditing(undefined);
        }}
      />

      <RbacDeleteDialog
        target={deleting}
        title={t("rbac.roles.delete.title")}
        description={t("rbac.roles.delete.description", { name: deleting?.name ?? "" })}
        confirmLabel={t("rbac.roles.delete.confirm")}
        isPending={deleteRole.isPending}
        error={deleteRole.error}
        onConfirm={(id) => {
          deleteRole.mutate(id, { onSuccess: closeDelete });
        }}
        onClose={closeDelete}
      />
    </div>
  );
}
