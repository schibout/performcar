"use client";

import { useTranslation } from "react-i18next";

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
import { formatDateTime } from "@/lib/format-date";
import type {
  ActivityDetails as ActivityDetailsValue,
  AdminActivity,
  JsonValue,
} from "@/lib/types/admin";

type ScalarJson = string | number | boolean | null;

// Map an HTTP status code to a badge tone: 2xx success, 4xx client-error
// (warning), 5xx server-error (danger), anything else neutral.
const statusCodeTone = (code: number): "success" | "warning" | "danger" | "muted" => {
  if (code >= 500) return "danger";
  if (code >= 400) return "warning";
  if (code >= 200 && code < 300) return "success";
  return "muted";
};

// Prefer the actor's name, then email. Without a user, say "deleted account" only
// when the row records a deletion: others (such as unknown-email logins) never had
// one and read as "unknown account". Either way, add actor_ref's first 8 chars.
const actorLabel = (row: AdminActivity, deletedLabel: string, unknownLabel: string): string => {
  const actor = row.user;
  if (!actor) {
    const label = row.user_deleted_at ? deletedLabel : unknownLabel;
    const short = (row.actor_ref ?? "").slice(0, 8);
    return short ? `${label} ${short}` : label;
  }
  return [actor.first_name, actor.last_name].filter(Boolean).join(" ") || actor.email;
};

const isScalar = (value: JsonValue): value is ScalarJson =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const formatScalar = (value: ScalarJson): string => {
  if (value === null) return "null";
  return typeof value === "string" ? value : String(value);
};

function ActivityDetails({ details }: { details: ActivityDetailsValue | undefined }) {
  const entries: [string, JsonValue][] = Object.entries(details ?? {});
  if (entries.length === 0) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  // When every value is a primitive we render compact "key: value" chips so
  // common cases like {reason: "invalid_password"} read at a glance. Anything
  // nested falls back to pretty-printed JSON in a scrollable code block.
  const scalarEntries: [string, ScalarJson][] = [];
  let allScalar = true;
  for (const [key, value] of entries) {
    if (!isScalar(value)) {
      allScalar = false;
      break;
    }
    scalarEntries.push([key, value]);
  }

  if (allScalar) {
    return (
      <div className="flex max-w-xs flex-wrap gap-1">
        {scalarEntries.map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]"
          >
            <span className="text-muted-foreground">{key}</span>
            <span className="text-foreground">{formatScalar(value)}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <pre className="max-h-40 max-w-xs overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] leading-snug text-foreground">
      {JSON.stringify(details, null, 2)}
    </pre>
  );
}

interface ActivityTableProps {
  rows: AdminActivity[];
  isLoading?: boolean;
  showUser?: boolean;
  emptyLabel?: string;
}

export function ActivityTable({
  rows,
  isLoading = false,
  showUser = true,
  emptyLabel,
}: ActivityTableProps) {
  const { t } = useTranslation("admin");
  const columnCount = showUser ? 7 : 6;

  return (
    <AdminTable className="rounded-2xl border bg-card">
      <AdminThead>
        <AdminTh>{t("activities.columns.when")}</AdminTh>
        {showUser ? <AdminTh>{t("activities.columns.user")}</AdminTh> : null}
        <AdminTh>{t("activities.columns.type")}</AdminTh>
        <AdminTh>{t("activities.columns.resource")}</AdminTh>
        <AdminTh>{t("activities.columns.status")}</AdminTh>
        <AdminTh>{t("activities.columns.statusCode")}</AdminTh>
        <AdminTh>{t("activities.columns.details")}</AdminTh>
      </AdminThead>
      <AdminTbody>
        {rows.map((row) => (
          <AdminTr key={row.id}>
            <AdminTd className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDateTime(row.created_at)}
            </AdminTd>
            {showUser ? (
              <AdminTd className="text-xs text-muted-foreground">
                {actorLabel(row, t("activities.deletedAccount"), t("activities.unknownAccount"))}
              </AdminTd>
            ) : null}
            <AdminTd className="font-medium">{t(`activities.type.${row.activity_type}`)}</AdminTd>
            <AdminTd className="text-muted-foreground">
              {t(`activities.resource.${row.resource_type}`)}
            </AdminTd>
            <AdminTd>
              <StatusBadge tone={row.status === "success" ? "success" : "danger"}>
                {t(`activities.status.${row.status}`)}
              </StatusBadge>
            </AdminTd>
            <AdminTd>
              {row.status_code === null ? (
                <span className="text-muted-foreground/60">—</span>
              ) : (
                <StatusBadge tone={statusCodeTone(row.status_code)}>
                  <span className="font-mono">{row.status_code}</span>
                </StatusBadge>
              )}
            </AdminTd>
            <AdminTd className="align-top text-xs text-muted-foreground">
              <ActivityDetails details={row.details} />
            </AdminTd>
          </AdminTr>
        ))}
        {rows.length === 0 ? (
          <AdminTableStateRow
            colSpan={columnCount}
            isLoading={isLoading}
            loadingLabel={t("activities.loading")}
            emptyLabel={emptyLabel ?? t("activities.empty")}
          />
        ) : null}
      </AdminTbody>
    </AdminTable>
  );
}
