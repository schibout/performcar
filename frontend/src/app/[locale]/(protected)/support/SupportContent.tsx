"use client";

import { useMemo, useState } from "react";

import { Segmented } from "antd";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { NewTicketModal } from "@/components/support/NewTicketModal";
import { TicketList } from "@/components/support/TicketList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyTickets } from "@/hooks/api/use-support";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { Permission } from "@/lib/types/permissions";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/types/support";

type StatusFilter = TicketStatus | "all";

export function SupportContent() {
  const { t } = useTranslation("support");
  const { isReady, has } = usePermissions();
  const canRead = has(Permission.SelfSupportRead);
  const canCreate = has(Permission.SelfSupportCreate);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [modalOpen, setModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const params = useMemo(
    () => ({
      skip,
      limit: pageSize,
      status: status === "all" ? undefined : status,
      search: debouncedSearch.trim() || undefined,
    }),
    [skip, pageSize, status, debouncedSearch],
  );

  const { data, isLoading, isFetching } = useMyTickets(params);

  const statusOptions = [
    { label: t("admin.filters.all"), value: "all" },
    ...TICKET_STATUSES.map((value) => ({ label: t(`status.${value}`), value })),
  ];

  return (
    <div className="mx-auto w-full max-w-480 space-y-6 p-4 sm:p-6 lg:p-8 xl:p-12">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("list.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        {canCreate ? (
          <Button
            className="shrink-0"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("list.newTicket")}
          </Button>
        ) : null}
      </div>

      {!isReady ? <Skeleton className="h-40 w-full" /> : null}
      {isReady && !canRead ? <PermissionNote text={t("restricted")} /> : null}

      {canRead ? (
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-0">
            {/* Toolbar: search left, status filter right on desktop; stacked on mobile. */}
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSkip(0);
                  }}
                  placeholder={t("list.searchPlaceholder")}
                  maxLength={200}
                  className="pl-9"
                />
              </div>

              {/* Scrolls instead of cramming the five filters on narrow screens. */}
              <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:ml-auto sm:px-0">
                <Segmented
                  options={statusOptions}
                  value={status}
                  onChange={(value) => {
                    setStatus(value as StatusFilter);
                    setSkip(0);
                  }}
                />
              </div>
            </div>

            <TicketList rows={data?.data ?? []} isLoading={isLoading && !data} />
            {data ? (
              <div
                className="px-4 pb-4 pt-0"
                aria-live="polite"
                aria-busy={isFetching ? "true" : "false"}
              >
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
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canCreate ? <NewTicketModal open={modalOpen} onOpenChange={setModalOpen} /> : null}
    </div>
  );
}
