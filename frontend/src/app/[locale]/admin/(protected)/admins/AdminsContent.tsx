"use client";

import { useState } from "react";

import { useTranslation } from "react-i18next";

import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdmins, usePermissionCatalog } from "@/hooks/api/use-admin";
import {
  useCanDeleteAdmins,
  useCanReadAdmins,
  useCanWriteAdmins,
  useIsRootSuperadmin,
  usePermissions,
} from "@/hooks/use-permissions";
import type { AdminListItem } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

import { AdminForbidden } from "../AdminForbidden";
import { AdminActionConfirm, type AdminActionState } from "./AdminActionConfirm";
import { AdminsTable } from "./AdminsTable";
import { CreateAdminModal } from "./CreateAdminModal";
import { EditPermissionsModal } from "./EditPermissionsModal";
import { TransferRootModal } from "./TransferRootModal";

// Root transfer targets must cover every superadmin, not just the visible
// page, so they ride a separate role-filtered query at the API's max limit.
const TRANSFER_TARGETS_LIMIT = 200;

export function AdminsContent() {
  const { t } = useTranslation("admin");
  const { has } = usePermissions();
  const canRead = useCanReadAdmins();
  const canWrite = useCanWriteAdmins();
  const canDelete = useCanDeleteAdmins();
  const isRoot = useIsRootSuperadmin();
  const viewerId = useAuthStore((state) => state.user?.id);

  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<AdminListItem | null>(null);
  const [action, setAction] = useState<AdminActionState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const adminsQuery = useAdmins({ skip, limit: pageSize }, canRead);
  const catalogQuery = usePermissionCatalog(canRead);
  const superadminsQuery = useAdmins(
    { role: SystemRole.SUPERADMIN, limit: TRANSFER_TARGETS_LIMIT },
    isRoot,
  );

  if (!canRead) return <AdminForbidden />;

  // A viewer only hands out or withdraws keys it holds, so the grids offer only
  // those. An edited admin's other keys stay in the modal's state and are resent.
  // `/users/me` does not say which keys are temporary: the backend refuses those,
  // and its error message explains why.
  const catalog = (catalogQuery.data?.permissions ?? []).filter(has);
  const data = adminsQuery.data;
  const isLoading = adminsQuery.isLoading || catalogQuery.isLoading;
  // If the current page falls out of range (e.g. the last admin on the last
  // page was deleted), snap back to the last non-empty page. Render-phase
  // state adjustment so the out-of-range page never paints.
  if (data && skip > 0 && skip >= data.total) {
    setSkip(Math.max(0, (Math.ceil(data.total / pageSize) - 1) * pageSize));
  }
  // Root can only be transferred to another (non-root) superadmin.
  const transferTargets = (superadminsQuery.data?.data ?? []).filter(
    (entry) => !entry.is_root_superadmin,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("admins.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admins.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isRoot ? (
            <Button
              variant="outline"
              onClick={() => {
                setTransferOpen(true);
              }}
            >
              {t("admins.transferRoot.action")}
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              {t("admins.create.action")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-0">
          <AdminsTable
            rows={data?.data ?? []}
            isLoading={isLoading && !data}
            isViewerRoot={isRoot}
            canWrite={canWrite}
            canDelete={canDelete}
            viewerId={viewerId}
            onManage={setEditing}
            onDelete={(target) => {
              setAction({ kind: "delete", admin: target });
            }}
            onPromote={(target) => {
              setAction({ kind: "promote", admin: target });
            }}
            onDemoteSuperadmin={(target) => {
              setAction({ kind: "demote", admin: target });
            }}
          />
          {data ? (
            <div
              className="px-4 pb-4 pt-0"
              aria-live="polite"
              aria-busy={adminsQuery.isFetching ? "true" : "false"}
            >
              <AdminPagination
                total={data.total}
                skip={skip}
                limit={pageSize}
                onChange={setSkip}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setSkip(0);
                }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <EditPermissionsModal
        admin={editing}
        catalog={catalog}
        open={editing !== null}
        onClose={() => {
          setEditing(null);
        }}
      />

      <CreateAdminModal
        catalog={catalog}
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
      />

      <TransferRootModal
        targets={transferTargets}
        open={transferOpen}
        onClose={() => {
          setTransferOpen(false);
        }}
      />

      <AdminActionConfirm
        action={action}
        onClose={() => {
          setAction(null);
        }}
      />
    </div>
  );
}
