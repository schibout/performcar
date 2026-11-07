"use client";

import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { RbacAudience } from "@/lib/types/rbac";

export function AudienceBadge({ audience }: { audience: RbacAudience }) {
  const { t } = useTranslation("admin");
  return (
    <StatusBadge tone={audience === RbacAudience.Admin ? "info" : "muted"}>
      {t(`rbac.audience.${audience}` as const)}
    </StatusBadge>
  );
}
