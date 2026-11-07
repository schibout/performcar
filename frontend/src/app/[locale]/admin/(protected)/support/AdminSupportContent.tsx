"use client";

import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import {
  type TicketPriorityFilter,
  type TicketStatusFilter,
} from "@/components/admin/support/support-tickets-filters-config";
import { SupportTicketsFilters } from "@/components/admin/support/SupportTicketsFilters";
import { SupportTicketsTable } from "@/components/admin/support/SupportTicketsTable";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminTickets } from "@/hooks/api/use-support";
import { useDebounce } from "@/hooks/use-debounce";

export function AdminSupportContent() {
  const { t } = useTranslation("support");

  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<TicketStatusFilter>("all");
  const [priority, setPriority] = useState<TicketPriorityFilter>("all");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const search = useDebounce(searchInput, 250);

  const params = useMemo(
    () => ({
      skip,
      limit: pageSize,
      search: search.trim() || undefined,
      status: status === "all" ? undefined : status,
      priority: priority === "all" ? undefined : priority,
    }),
    [skip, pageSize, search, status, priority],
  );

  const { data, isLoading, isFetching } = useAdminTickets(params);

  const hasFilters = searchInput !== "" || status !== "all" || priority !== "all";

  const resetFilters = () => {
    setSearchInput("");
    setStatus("all");
    setPriority("all");
    setSkip(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("admin.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <SupportTicketsFilters
        search={searchInput}
        onSearchChange={(value) => {
          setSearchInput(value);
          setSkip(0);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setSkip(0);
        }}
        priority={priority}
        onPriorityChange={(value) => {
          setPriority(value);
          setSkip(0);
        }}
        onReset={resetFilters}
        hasFilters={hasFilters}
      />

      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-0">
          <SupportTicketsTable rows={data?.data ?? []} isLoading={isLoading && !data} />
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
    </div>
  );
}
