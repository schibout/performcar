"use client";

import { useMemo, useState } from "react";

import { Segmented, Select, Tooltip } from "antd";
import { ArrowDown, ArrowUp, Eye, Printer, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuotes } from "@/hooks/api/use-quotes";
import { useDebounce } from "@/hooks/use-debounce";
import { getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { formatDate } from "@/lib/format-date";
import {
  QUOTE_PERIODS,
  QUOTE_STATUSES,
  type QuotePeriod,
  type QuoteScope,
  type QuoteSort,
  type QuoteStatus,
  type SortOrder,
} from "@/lib/types/quote";

import { customerName, formatMoney } from "./quote-format";
import { quotePaths } from "./quote-paths";
import { QuoteStatusBadge } from "./QuoteStatusBadge";

interface QuoteHistoryViewProps {
  scope: QuoteScope;
  /** Admin panel only: narrow the list to one dealership. */
  dealershipId?: string;
}

type StatusFilter = QuoteStatus | "all";

interface SortHeaderProps {
  column: QuoteSort;
  label: string;
  sort: QuoteSort;
  order: SortOrder;
  onToggle: (column: QuoteSort) => void;
}

// A sortable column header: clicking flips the order, or sorts by this column.
function SortHeader({ column, label, sort, order, onToggle }: SortHeaderProps) {
  const active = sort === column;
  const ariaSort = order === "asc" ? "ascending" : "descending";
  const Icon = order === "asc" ? ArrowUp : ArrowDown;
  return (
    <AdminTh aria-sort={active ? ariaSort : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
        onClick={() => {
          onToggle(column);
        }}
      >
        {label}
        {active ? <Icon className="h-3 w-3" /> : null}
      </button>
    </AdminTh>
  );
}

export function QuoteHistoryView({ scope, dealershipId }: QuoteHistoryViewProps) {
  const { t } = useTranslation("quotes");
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const paths = quotePaths(scope);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [period, setPeriod] = useState<QuotePeriod>("all");
  const [sort, setSort] = useState<QuoteSort>("date");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 300);

  const params = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status === "all" ? undefined : status,
      period,
      sort,
      order,
      skip,
      limit: pageSize,
      dealership_id: dealershipId,
    }),
    [debouncedSearch, status, period, sort, order, skip, pageSize, dealershipId],
  );
  const { data, isLoading, isFetching, isError, refetch } = useQuotes(scope, params);
  const showDealership = scope === "admin";
  const columnCount = showDealership ? 8 : 7;

  const toggleSort = (column: QuoteSort) => {
    if (sort === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(column);
      setOrder("desc");
    }
    setSkip(0);
  };

  const sortProps = { sort, order, onToggle: toggleSort };
  const filtered = Boolean(params.search) || status !== "all" || period !== "all";

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSkip(0);
              }}
              placeholder={t("history.searchPlaceholder")}
              aria-label={t("history.searchPlaceholder")}
              maxLength={100}
              className="pl-9"
            />
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <Segmented
              value={status}
              options={[
                { label: t("history.allStatuses"), value: "all" },
                ...QUOTE_STATUSES.map((value) => ({ label: t(`status.${value}`), value })),
              ]}
              onChange={(value) => {
                setStatus(value as StatusFilter);
                setSkip(0);
              }}
            />
          </div>
          <Select
            className="w-full lg:w-48"
            value={period}
            aria-label={t("history.period")}
            options={QUOTE_PERIODS.map((value) => ({
              value,
              label: t(`history.periods.${value}`),
            }))}
            onChange={(value) => {
              setPeriod(value);
              setSkip(0);
            }}
          />
          <Button
            variant="outline"
            className="lg:ml-auto"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {t("history.refresh")}
          </Button>
        </div>

        {isError ? (
          <p className="p-6 text-sm text-destructive">{t("errors.loadQuotes")}</p>
        ) : (
          <AdminTable>
            <AdminThead>
              <SortHeader column="date" label={t("history.columns.date")} {...sortProps} />
              <AdminTh>{t("history.columns.reference")}</AdminTh>
              <AdminTh>{t("history.columns.vehicle")}</AdminTh>
              <SortHeader column="customer" label={t("history.columns.customer")} {...sortProps} />
              {showDealership ? <AdminTh>{t("history.columns.dealership")}</AdminTh> : null}
              <SortHeader column="price" label={t("history.columns.price")} {...sortProps} />
              <AdminTh>{t("history.columns.status")}</AdminTh>
              <AdminTh className="text-right">{t("history.columns.actions")}</AdminTh>
            </AdminThead>
            <AdminTbody>
              {!data || data.items.length === 0 ? (
                <AdminTableStateRow
                  colSpan={columnCount}
                  isLoading={isLoading}
                  loadingLabel={t("history.loading")}
                  emptyLabel={filtered ? t("history.noMatch") : t("history.empty")}
                />
              ) : (
                data.items.map((quote) => (
                  <AdminTr key={quote.id}>
                    <AdminTd className="whitespace-nowrap">{formatDate(quote.created_at)}</AdminTd>
                    <AdminTd className="whitespace-nowrap font-mono text-xs">
                      {quote.reference_number}
                    </AdminTd>
                    <AdminTd>
                      <div className="font-medium">
                        {quote.vehicle.brand} {quote.vehicle.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {quote.vehicle.year}, {quote.vehicle.color}
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <div className="font-medium">{customerName(quote.customer)}</div>
                      {quote.customer.phone ? (
                        <div className="text-xs text-muted-foreground">{quote.customer.phone}</div>
                      ) : null}
                    </AdminTd>
                    {showDealership ? <AdminTd>{quote.dealership.name}</AdminTd> : null}
                    <AdminTd className="whitespace-nowrap font-medium tabular-nums">
                      {formatMoney(quote.total_price)}
                    </AdminTd>
                    <AdminTd>
                      <QuoteStatusBadge status={quote.status} />
                    </AdminTd>
                    <AdminTd className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip title={t("history.view")}>
                          <Link
                            href={getLocalizedPath(paths.detail(quote.id), locale)}
                            aria-label={t("history.view")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Tooltip>
                        <Tooltip title={t("history.print")}>
                          <Link
                            href={getLocalizedPath(paths.print(quote.id), locale)}
                            aria-label={t("history.print")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </Tooltip>
                      </div>
                    </AdminTd>
                  </AdminTr>
                ))
              )}
            </AdminTbody>
          </AdminTable>
        )}
        {data ? (
          <div className="px-4 pb-4" aria-live="polite" aria-busy={isFetching ? "true" : "false"}>
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
  );
}
