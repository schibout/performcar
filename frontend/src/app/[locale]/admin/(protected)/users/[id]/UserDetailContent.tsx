"use client";

import { useState } from "react";

import { Spin } from "antd";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { StatusBadge, UserStatusBadge } from "@/components/admin/shared/StatusBadge";
import { canMutateTarget } from "@/components/admin/users/target-caps";
import { UserAccessPanel } from "@/components/admin/users/UserAccessPanel";
import { UserActionDialogs } from "@/components/admin/users/UserActionDialogs";
import { UserActivityCard } from "@/components/admin/users/UserActivityCard";
import { UserAvatarCard } from "@/components/admin/users/UserAvatarCard";
import { UserDangerZone } from "@/components/admin/users/UserDangerZone";
import { UserEditForm } from "@/components/admin/users/UserEditForm";
import { UserOverviewCard } from "@/components/admin/users/UserOverviewCard";
import { UserSessionsCard } from "@/components/admin/users/UserSessionsCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminUser, useUpdateAdminUser } from "@/hooks/api/use-admin";
import { useUserActions, type UserActionKind } from "@/hooks/api/use-user-actions";
import {
  useCanDeleteAdmins,
  useCanDeleteUsers,
  useCanManageUserSessions,
  useCanResetUserPassword,
  useCanSuspendUsers,
  useCanUnlockUsers,
  useCanWriteAdmins,
  useCanWriteUsers,
  useIsSuperadmin,
} from "@/hooks/use-permissions";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import type { AdminUserUpdatePayload } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

export function UserDetailContent({ userId }: { userId: string }) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);

  const { data: user, isLoading } = useAdminUser(userId);
  const update = useUpdateAdminUser();
  const { run, isLoading: isActionLoading } = useUserActions();

  const canWriteUsers = useCanWriteUsers();
  const adminTier = {
    canWriteAdmins: useCanWriteAdmins(),
    canDeleteAdmins: useCanDeleteAdmins(),
    isViewerSuperadmin: useIsSuperadmin(),
  };
  const canManageSessions = useCanManageUserSessions();
  const dangerCaps = {
    canResetPassword: useCanResetUserPassword(),
    canSuspend: useCanSuspendUsers(),
    canDelete: useCanDeleteUsers(),
    canUnlock: useCanUnlockUsers(),
  };

  const [action, setAction] = useState<UserActionKind | null>(null);

  if (isLoading || !user) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spin />
        {t("users.loading")}
      </div>
    );
  }

  const isSelf = currentUserId === user.id;
  // On an admin-tier account the API asks for admins:write on top of users:write
  // for every change, so the edit form, avatar and session actions follow.
  const targetMutable = canMutateTarget(user.role, adminTier);
  const canWrite = canWriteUsers && targetMutable;

  const handleSave = (payload: AdminUserUpdatePayload) => {
    update.mutate({ id: user.id, payload });
  };

  const confirmAction = () => {
    if (!action) return;
    // Dialog closes only on success so failed actions keep the dialog open for
    // the user to retry. Delete redirects back to the list on success.
    run(action, user, {
      onSuccess: () => {
        setAction(null);
        if (action === "delete") {
          router.push(getLocalizedPath(ROUTES.adminUsers, currentLocale));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href={getLocalizedPath(ROUTES.adminUsers, currentLocale)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("userDetail.backToUsers")}
          </Link>
          <div className="mt-2 flex items-center gap-4">
            <Avatar className="size-14 border shadow-sm">
              {user.avatar_file?.url && <AvatarImage src={user.avatar_file.url} alt={user.email} />}
              <AvatarFallback className="text-lg uppercase">
                {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {user.first_name || user.last_name
                  ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                  : user.email}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={user.role === SystemRole.ADMIN ? "primary" : "muted"}>
            {t(`users.role.${user.role}` as const)}
          </StatusBadge>
          <UserStatusBadge user={user} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {canWrite ? (
            <UserEditForm
              user={user}
              isSelf={isSelf}
              isSaving={update.isPending}
              onSubmit={handleSave}
            />
          ) : (
            <Card className="flex h-full flex-col border-border/50 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">{t("userDetail.editTitle")}</CardTitle>
                <CardDescription>{t("userDetail.editDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionNote
                  text={canWriteUsers ? t("userDetail.adminTargetRestricted") : undefined}
                />
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {canWrite ? <UserAvatarCard user={user} /> : null}
          <UserOverviewCard user={user} />
        </div>
      </div>

      {canManageSessions ? <UserSessionsCard userId={user.id} canRevoke={targetMutable} /> : null}

      <UserAccessPanel user={user} isSelf={isSelf} />

      <UserDangerZone
        user={user}
        isSelf={isSelf}
        disabled={isActionLoading}
        caps={dangerCaps}
        adminTier={adminTier}
        onAction={setAction}
      />

      <UserActivityCard userId={user.id} />

      <UserActionDialogs
        action={action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        onConfirm={confirmAction}
        isLoading={isActionLoading}
      />
    </div>
  );
}
