"use client";

import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanUseAssistant } from "@/hooks/api/use-assistant";
import { usePermissions } from "@/hooks/use-permissions";

// Page frame of the assistant pages: heading plus the self.assistant:use gate.
export function AssistantFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("assistant");
  const { isReady } = usePermissions();
  const canUse = useCanUseAssistant();
  let body = children;
  if (!isReady) body = <Skeleton className="h-96 w-full" />;
  else if (!canUse) body = <PermissionNote text={t("restricted")} />;
  return (
    <div className="mx-auto w-full max-w-480 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {body}
    </div>
  );
}
