"use client";

import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Euro,
  FileText,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteStats } from "@/hooks/api/use-quotes";
import i18n from "@/i18n/config";
import { getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { formatDate } from "@/lib/format-date";
import type { QuoteScope, QuoteStats, QuoteStatus } from "@/lib/types/quote";

import { customerName, formatMoney } from "./quote-format";
import { quotePaths } from "./quote-paths";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: number;
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  const { t } = useTranslation("quotes");
  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend !== undefined ? (
            <p
              className={`flex items-center gap-1 text-xs ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {t("stats.trend", { value: Math.abs(trend) })}
            </p>
          ) : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

const STATUS_BAR: Record<QuoteStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  completed: "bg-emerald-500",
};

function StatusDistribution({ stats }: { stats: QuoteStats }) {
  const { t } = useTranslation("quotes");
  const rows = (["pending", "confirmed", "completed"] as const).map((status) => ({
    status,
    count: stats[status],
  }));
  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("stats.distribution")}</CardTitle>
        <CardDescription>{t("stats.distributionHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("stats.noData")}</p>
        ) : (
          rows.map(({ status, count }) => {
            const share = Math.round((count / stats.total) * 100);
            return (
              <div key={status} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{t(`status.${status}`)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {count} · {share}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${STATUS_BAR[status]}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyChart({ stats }: { stats: QuoteStats }) {
  const { t } = useTranslation("quotes");
  const peak = Math.max(1, ...stats.monthly.map((month) => month.quotes));
  const monthLabel = (year: number, month: number) =>
    new Intl.DateTimeFormat(i18n.language || "en", { month: "short" }).format(
      new Date(year, month - 1, 1),
    );
  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("stats.monthly")}</CardTitle>
        <CardDescription>{t("stats.monthlyHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-3" role="list">
          {stats.monthly.map((month) => (
            <div
              key={`${month.year}-${month.month}`}
              role="listitem"
              aria-label={t("stats.monthBar", {
                month: monthLabel(month.year, month.month),
                count: month.quotes,
              })}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="text-xs tabular-nums text-muted-foreground">{month.quotes}</span>
              <div
                className="w-full max-w-12 rounded-t-md bg-primary/80"
                style={{ height: `${(month.quotes / peak) * 100}%`, minHeight: 2 }}
              />
              <span className="text-xs capitalize text-muted-foreground">
                {monthLabel(month.year, month.month)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuoteStatsViewProps {
  scope: QuoteScope;
  dealershipId?: string;
}

export function QuoteStatsView({ scope, dealershipId }: QuoteStatsViewProps) {
  const { t } = useTranslation("quotes");
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const paths = quotePaths(scope);
  const { data: stats, isLoading, isError } = useQuoteStats(scope, dealershipId);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (isError || !stats) {
    return <p className="text-sm text-destructive">{t("errors.loadStats")}</p>;
  }

  const growth =
    stats.previous_month > 0
      ? Math.round(((stats.current_month - stats.previous_month) / stats.previous_month) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("stats.pending")}
          value={stats.pending}
          description={t("stats.pendingHint")}
          icon={Clock}
          trend={growth}
        />
        <StatCard
          title={t("stats.confirmed")}
          value={stats.confirmed}
          description={t("stats.confirmedHint")}
          icon={CalendarCheck}
        />
        <StatCard
          title={t("stats.completed")}
          value={stats.completed}
          description={t("stats.completedHint")}
          icon={CheckCircle2}
        />
        <StatCard
          title={t("stats.revenue")}
          value={formatMoney(stats.revenue)}
          description={t("stats.revenueHint")}
          icon={Euro}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatusDistribution stats={stats} />
        <MonthlyChart stats={stats} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t("stats.average")}
          value={formatMoney(stats.average_value)}
          description={t("stats.averageHint")}
          icon={Wallet}
        />
        <StatCard
          title={t("stats.conversion")}
          value={`${stats.conversion_rate}%`}
          description={t("stats.conversionHint")}
          icon={Percent}
        />
        <StatCard
          title={t("stats.thisMonth")}
          value={stats.current_month}
          description={t("stats.thisMonthHint")}
          icon={FileText}
          trend={growth}
        />
      </div>

      <Card className="border-border/50 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">{t("stats.recent")}</CardTitle>
          <CardDescription>{t("stats.recentHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.recent.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("stats.noQuotes")}</p>
          ) : (
            stats.recent.map((quote) => (
              <Link
                key={quote.id}
                href={getLocalizedPath(paths.detail(quote.id), locale)}
                className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <FileText className="h-6 w-6 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {quote.vehicle.brand} {quote.vehicle.model}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {customerName(quote.customer)} · {quote.reference_number}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium tabular-nums">
                    {formatMoney(quote.total_price)}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {formatDate(quote.created_at)}
                  </span>
                </span>
              </Link>
            ))
          )}
          {stats.recent.length > 0 ? (
            <Link
              href={getLocalizedPath(paths.history, locale)}
              className="block rounded-lg border p-2 text-center text-sm font-medium hover:bg-muted/50"
            >
              {t("stats.viewAll")}
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
