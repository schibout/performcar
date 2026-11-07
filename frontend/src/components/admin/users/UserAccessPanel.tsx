"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AudienceBadge } from "@/components/admin/rbac/AudienceBadge";
import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import {
  UserAccessAssignModal,
  type AssignKind,
  type AssignOption,
} from "@/components/admin/users/UserAccessAssignModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionSets, useRoles, useUserAccess } from "@/hooks/api/use-rbac";
import { usePermissions } from "@/hooks/use-permissions";
import { getApiErrorStatus } from "@/lib/api/error-message";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { formatDateTime } from "@/lib/format-date";
import type { AdminUser } from "@/lib/types/admin";
import { Permission } from "@/lib/types/permissions";
import type { Assignment } from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";

interface UserAccessPanelProps {
  user: AdminUser;
  isSelf: boolean;
}

function AssignmentList({ items }: { items: Assignment[] }) {
  const { t } = useTranslation("admin");
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("rbac.access.none")}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.key}</span>
          <AudienceBadge audience={item.audience} />
          {item.expired ? (
            <StatusBadge tone="danger">{t("rbac.access.expired")}</StatusBadge>
          ) : item.expires_at ? (
            <StatusBadge tone="warning">
              {t("rbac.access.expires", { date: formatDateTime(item.expires_at) })}
            </StatusBadge>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function UserAccessPanel({ user, isSelf }: UserAccessPanelProps) {
  const { t } = useTranslation("admin");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const { has } = usePermissions();

  const targetIsUser = user.role === SystemRole.USER;
  const targetIsSuperadmin = user.role === SystemRole.SUPERADMIN;
  // What an admin-tier account holds stays behind admins:read, whoever looks.
  const canSeeAccess = targetIsUser || has(Permission.AdminsRead);

  const accessQuery = useUserAccess(user.id, canSeeAccess);
  const [assigning, setAssigning] = useState<AssignKind | null>(null);

  // A superadmin holds every key through its tier and the API refuses to assign
  // it anything; an admin-tier target also needs admins:write.
  const canEditAccount =
    has(Permission.UsersWrite) &&
    !targetIsSuperadmin &&
    !isSelf &&
    (targetIsUser || has(Permission.AdminsWrite));
  const canAssignRoles = canEditAccount && has(Permission.RolesRead);
  const canAssignSets = canEditAccount && has(Permission.PermissionSetsRead);

  const rolesQuery = useRoles(canAssignRoles);
  const setsQuery = usePermissionSets(canAssignSets);

  const forbidden = !canSeeAccess || getApiErrorStatus(accessQuery.error) === 403;
  const access = accessQuery.data;

  const header = (
    <CardHeader>
      <CardTitle className="text-base">{t("rbac.access.title")}</CardTitle>
      <CardDescription>{t("rbac.access.description")}</CardDescription>
    </CardHeader>
  );

  if (forbidden) {
    return (
      <Card id="access" data-testid="user-access-panel" className="border-border/50 bg-card/60">
        {header}
        <CardContent>
          <PermissionNote text={t("rbac.access.forbiddenNote")} />
        </CardContent>
      </Card>
    );
  }

  if (!access) {
    return (
      <Card id="access" data-testid="user-access-panel" className="border-border/50 bg-card/60">
        {header}
        <CardContent>
          <Skeleton className="h-20 w-full rounded-xl" aria-label={t("rbac.access.loading")} />
        </CardContent>
      </Card>
    );
  }

  const options = (kind: AssignKind): AssignOption[] =>
    (kind === "roles" ? rolesQuery.data?.data : setsQuery.data?.data)?.map(
      ({ id, key, name, audience }) => ({ id, key, name, audience }),
    ) ?? [];

  const sourceLabel = (kind: string) => t(`rbac.access.source.${kind}` as const);

  return (
    <Card id="access" data-testid="user-access-panel" className="border-border/50 bg-card/60">
      {header}
      <CardContent className="space-y-6">
        {targetIsSuperadmin ? <PermissionNote text={t("rbac.access.superadminNote")} /> : null}
        {isSelf && !targetIsSuperadmin ? <PermissionNote text={t("rbac.access.selfNote")} /> : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("rbac.access.roles")}</h3>
            {canAssignRoles ? (
              <Button
                variant="outline"
                size="sm"
                disabled={rolesQuery.isLoading || rolesQuery.isError}
                onClick={() => {
                  setAssigning("roles");
                }}
              >
                {t("rbac.access.manageRoles")}
              </Button>
            ) : null}
          </div>
          {canAssignRoles && rolesQuery.isError ? (
            <PermissionNote text={t("rbac.access.assign.listError")} />
          ) : null}
          <AssignmentList items={access.roles} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("rbac.access.permissionSets")}</h3>
            {canAssignSets ? (
              <Button
                variant="outline"
                size="sm"
                disabled={setsQuery.isLoading || setsQuery.isError}
                onClick={() => {
                  setAssigning("sets");
                }}
              >
                {t("rbac.access.manageSets")}
              </Button>
            ) : null}
          </div>
          {canAssignSets && setsQuery.isError ? (
            <PermissionNote text={t("rbac.access.assign.listError")} />
          ) : null}
          <AssignmentList items={access.permission_sets} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("rbac.access.directPermissions")}</h3>
            {has(Permission.AdminsRead) && !targetIsUser ? (
              <Link
                href={getLocalizedPath(ROUTES.adminAdmins, currentLocale)}
                className="text-xs text-primary hover:underline"
              >
                {t("rbac.access.openAdmins")}
              </Link>
            ) : null}
          </div>
          {access.direct_permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rbac.access.none")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {access.direct_permissions.map((permission) => (
                <code key={permission} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {permission}
                </code>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("rbac.access.directHint")}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("rbac.access.effective")}</h3>
          {access.effective.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rbac.access.effectiveEmpty")}</p>
          ) : (
            <ul
              data-testid="user-access-effective"
              className="max-h-96 divide-y divide-border/60 overflow-y-auto rounded-lg border"
            >
              {access.effective.map((entry) => (
                <li
                  key={entry.permission}
                  data-testid={`effective-${entry.permission}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <code className="text-xs">{entry.permission}</code>
                  <span className="flex flex-wrap gap-1.5">
                    {entry.sources.map((source) => (
                      <StatusBadge
                        key={`${source.kind}:${source.key}`}
                        tone={source.kind === "direct" ? "info" : "muted"}
                      >
                        {sourceLabel(source.kind)}
                        {source.kind === "role" || source.kind === "permission_set"
                          ? ` · ${source.key}`
                          : ""}
                      </StatusBadge>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>

      {assigning && !(assigning === "roles" ? rolesQuery : setsQuery).isError ? (
        <UserAccessAssignModal
          kind={assigning}
          open
          userId={user.id}
          userEmail={user.email}
          access={access}
          options={options(assigning)}
          canAssignAdminAudience={!targetIsUser || has(Permission.AdminsWrite)}
          onClose={() => {
            setAssigning(null);
          }}
        />
      ) : null}
    </Card>
  );
}
