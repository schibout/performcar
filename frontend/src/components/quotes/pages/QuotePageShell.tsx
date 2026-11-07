"use client";

import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { AdminForbidden } from "@/app/[locale]/admin/(protected)/AdminForbidden";
import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/lib/types/permissions";
import type { QuoteScope } from "@/lib/types/quote";
import { useAuthStore } from "@/stores/auth.store";

interface QuotePageShellProps {
  scope: QuoteScope;
  permission: Permission;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

// Frame of every quote generator page: the permission gate, the dealership
// requirement of dealer pages, and the heading. Admin pages render inside the
// admin shell, dealer pages get the account area's container.
export function QuotePageShell({
  scope,
  permission,
  title,
  subtitle,
  actions,
  children,
}: QuotePageShellProps) {
  const { t } = useTranslation("quotes");
  const { isReady, has } = usePermissions();
  const dealershipId = useAuthStore((state) => state.user?.dealership_id);

  let body: ReactNode = children;
  if (!isReady) body = <Skeleton className="h-64 w-full" />;
  else if (!has(permission)) {
    body = scope === "admin" ? <AdminForbidden /> : <PermissionNote text={t("restricted")} />;
  } else if (scope === "self" && !dealershipId) {
    body = (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">{t("noDealership")}</p>
    );
  }

  const content = (
    <div className="space-y-6">
      {title ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions && body === children ? <div className="flex gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {body}
    </div>
  );

  if (scope === "admin") return content;
  return <div className="mx-auto w-full max-w-480 p-4 sm:p-6 lg:p-8 xl:p-12">{content}</div>;
}
