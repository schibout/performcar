"use client";

import { useMemo, useState } from "react";

import { Select } from "antd";
import { RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ActivityTable } from "@/components/admin/activities/ActivityTable";
import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminActivities } from "@/hooks/api/use-admin";
import { useDebounce } from "@/hooks/use-debounce";
import type {
  ActivityStatus,
  ActivityType,
  AdminActivityListParams,
  ResourceType,
} from "@/lib/types/admin";
import { cn } from "@/lib/utils";

import type { TFunction } from "i18next";

// Option arrays mirror the FastAPI StrEnums in
// app/schemas/user_activity.py (ActivityType, ResourceType, ActivityStatus).
// Kept as readonly const-tuples so changes to the backend enum surface as
// TypeScript errors rather than silent mismatches.
const ACTIVITY_TYPES = [
  "create",
  "read",
  "update",
  "delete",
  "execute",
  "login",
  "logout",
  "export",
  "invite",
] as const satisfies readonly ActivityType[];

const RESOURCE_TYPES = [
  "user",
  "auth",
  "file",
  "support_ticket",
  "system_settings",
  "role",
  "permission_set",
  "announcement",
] as const satisfies readonly ResourceType[];
const STATUS_OPTIONS = ["success", "failure"] as const satisfies readonly ActivityStatus[];
// Curated set of HTTP codes the audit log actually emits (200 success default
// plus the failure codes raised across auth/users). Kept as a const-tuple so
// the dropdown and the param type stay in lockstep.
const STATUS_CODE_OPTIONS = [200, 400, 401, 403, 404, 409, 500] as const;

type TypeFilter = "all" | ActivityType;
type ResourceFilter = "all" | ResourceType;
type StatusFilter = "all" | ActivityStatus;
type StatusCodeFilter = "all" | (typeof STATUS_CODE_OPTIONS)[number];

const isTypeFilter = (value: string): value is TypeFilter =>
  value === "all" || (ACTIVITY_TYPES as readonly string[]).includes(value);
const isResourceFilter = (value: string): value is ResourceFilter =>
  value === "all" || (RESOURCE_TYPES as readonly string[]).includes(value);
const isStatusFilter = (value: string): value is StatusFilter =>
  value === "all" || (STATUS_OPTIONS as readonly string[]).includes(value);
const parseStatusCodeFilter = (value: string): StatusCodeFilter | null => {
  if (value === "all") return "all";
  const code = Number(value);
  return (STATUS_CODE_OPTIONS as readonly number[]).includes(code)
    ? (code as StatusCodeFilter)
    : null;
};

// Built outside the component so the render function stays lean; each mirrors
// its const-tuple plus the leading "any" option.
const typeOptions = (t: TFunction) => [
  { value: "all", label: t("activities.filters.typeAny") },
  ...ACTIVITY_TYPES.map((v) => ({ value: v, label: t(`activities.type.${v}`) })),
];
const resourceOptions = (t: TFunction) => [
  { value: "all", label: t("activities.filters.resourceAny") },
  ...RESOURCE_TYPES.map((v) => ({ value: v, label: t(`activities.resource.${v}`) })),
];
const statusOptions = (t: TFunction) => [
  { value: "all", label: t("activities.filters.statusAny") },
  ...STATUS_OPTIONS.map((v) => ({ value: v, label: t(`activities.status.${v}`) })),
];
const statusCodeOptions = (t: TFunction) => [
  { value: "all", label: t("activities.filters.statusCodeAny") },
  ...STATUS_CODE_OPTIONS.map((c) => ({ value: String(c), label: String(c) })),
];

export function ActivitiesContent() {
  const { t } = useTranslation("admin");
  const [type, setType] = useState<TypeFilter>("all");
  const [resource, setResource] = useState<ResourceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [statusCode, setStatusCode] = useState<StatusCodeFilter>("all");
  // Free-text search over the acting user's name/email (server-side ILIKE).
  const [userSearch, setUserSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const debouncedUserSearch = useDebounce(userSearch, 300);

  const params = useMemo<AdminActivityListParams>(
    () => ({
      skip,
      limit: pageSize,
      user_search: debouncedUserSearch.trim() || undefined,
      activity_type: type === "all" ? undefined : type,
      resource_type: resource === "all" ? undefined : resource,
      status: status === "all" ? undefined : status,
      status_code: statusCode === "all" ? undefined : statusCode,
    }),
    [skip, pageSize, debouncedUserSearch, type, resource, status, statusCode],
  );

  const { data, isLoading, isFetching, refetch } = useAdminActivities(params);

  const resetFilters = () => {
    setType("all");
    setResource("all");
    setStatus("all");
    setStatusCode("all");
    setUserSearch("");
    setSkip(0);
  };

  const hasFilters =
    type !== "all" ||
    resource !== "all" ||
    status !== "all" ||
    statusCode !== "all" ||
    userSearch.trim() !== "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {t("activities.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("activities.subtitle")}</p>
      </div>

      <Card className="border-border/50 bg-card/60">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center">
          <div className="grid grid-cols-2 gap-2 md:contents">
            <Select<string>
              value={type}
              onChange={(value) => {
                if (!isTypeFilter(value)) return;
                setType(value);
                setSkip(0);
              }}
              aria-label={t("activities.filters.type")}
              className="w-full md:w-fit md:min-w-35"
              options={typeOptions(t)}
            />
            <Select<string>
              value={resource}
              onChange={(value) => {
                if (!isResourceFilter(value)) return;
                setResource(value);
                setSkip(0);
              }}
              aria-label={t("activities.filters.resource")}
              className="w-full md:w-fit md:min-w-35"
              options={resourceOptions(t)}
            />
            <Select<string>
              value={status}
              onChange={(value) => {
                if (!isStatusFilter(value)) return;
                setStatus(value);
                setSkip(0);
              }}
              aria-label={t("activities.filters.status")}
              className="w-full md:w-fit md:min-w-35"
              options={statusOptions(t)}
            />
            <Select<string>
              value={String(statusCode)}
              onChange={(value) => {
                const next = parseStatusCodeFilter(value);
                if (next === null) return;
                setStatusCode(next);
                setSkip(0);
              }}
              aria-label={t("activities.filters.statusCode")}
              className="w-full md:w-fit md:min-w-35"
              options={statusCodeOptions(t)}
            />
          </div>
          <div className="w-full md:flex-1 md:min-w-50">
            <Input
              value={userSearch}
              prefix={<Search className="h-4 w-4 text-muted-foreground" />}
              placeholder={t("activities.filters.userSearch")}
              aria-label={t("activities.filters.user")}
              onChange={(event) => {
                setUserSearch(event.target.value);
                setSkip(0);
              }}
            />
          </div>
          {hasFilters ? (
            <Button variant="ghost" onClick={resetFilters} className="w-full md:w-auto">
              <X className="h-4 w-4" />
              {t("activities.filters.reset")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
            className="w-full md:w-auto"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {t("activities.refresh")}
          </Button>
        </CardContent>
      </Card>

      <ActivityTable rows={data?.data ?? []} isLoading={isLoading} />

      {data ? (
        <AdminPagination
          total={data.total}
          skip={data.skip}
          limit={data.limit}
          onChange={setSkip}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setSkip(0);
          }}
        />
      ) : null}
    </div>
  );
}
