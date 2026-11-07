"use client";

import { useState } from "react";

import { Select } from "antd";
import { History, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDealerships, useQuote } from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import { getLocaleFromPath, getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { Permission } from "@/lib/types/permissions";
import type { QuoteScope } from "@/lib/types/quote";

import { DealershipsAdminView } from "../admin/DealershipsAdminView";
import { ServicesAdminView } from "../admin/ServicesAdminView";
import { CustomersView } from "../CustomersView";
import { DealershipSettingsView } from "../DealershipSettingsView";
import { QuoteDetailView } from "../QuoteDetailView";
import { QuoteHistoryView } from "../QuoteHistoryView";
import { QuotePrintView } from "../QuotePrintView";
import { QuoteStatsView } from "../QuoteStatsView";
import { QuotePageShell } from "./QuotePageShell";
import { QuoteWizard } from "../wizard/QuoteWizard";

const READ: Record<QuoteScope, Permission> = {
  self: Permission.SelfQuotesRead,
  admin: Permission.QuotesRead,
};
const WRITE: Record<QuoteScope, Permission> = {
  self: Permission.SelfQuotesWrite,
  admin: Permission.QuotesWrite,
};

/** Dealer dashboard of the dealership's quotes. */
export function QuotesDashboardContent() {
  const { t } = useTranslation("quotes");
  const locale = getLocaleFromPath(usePathname());
  const canCreate = usePermissions().has(Permission.SelfQuotesCreate);
  return (
    <QuotePageShell
      scope="self"
      permission={Permission.SelfQuotesRead}
      title={t("dashboard.title")}
      subtitle={t("dashboard.subtitle")}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href={getLocalizedPath(ROUTES.quotesHistory, locale)}>
              <History className="h-4 w-4" />
              {t("dashboard.history")}
            </Link>
          </Button>
          {canCreate ? (
            <Button asChild>
              <Link href={getLocalizedPath(ROUTES.quotesNew, locale)}>
                <Plus className="h-4 w-4" />
                {t("dashboard.newQuote")}
              </Link>
            </Button>
          ) : null}
        </>
      }
    >
      <QuoteStatsView scope="self" />
    </QuotePageShell>
  );
}

/** Dealer quote history. */
export function QuoteHistoryContent() {
  const { t } = useTranslation("quotes");
  const locale = getLocaleFromPath(usePathname());
  const canCreate = usePermissions().has(Permission.SelfQuotesCreate);
  return (
    <QuotePageShell
      scope="self"
      permission={Permission.SelfQuotesRead}
      title={t("history.title")}
      subtitle={t("history.subtitle")}
      actions={
        canCreate ? (
          <Button asChild>
            <Link href={getLocalizedPath(ROUTES.quotesNew, locale)}>
              <Plus className="h-4 w-4" />
              {t("dashboard.newQuote")}
            </Link>
          </Button>
        ) : null
      }
    >
      <QuoteHistoryView scope="self" />
    </QuotePageShell>
  );
}

/** Dealer quote creation. */
export function NewQuoteContent() {
  const { t } = useTranslation("quotes");
  return (
    <QuotePageShell
      scope="self"
      permission={Permission.SelfQuotesCreate}
      title={t("wizard.newTitle")}
      subtitle={t("wizard.newSubtitle")}
    >
      <QuoteWizard scope="self" />
    </QuotePageShell>
  );
}

/** Quote detail, for a dealer or from the admin panel. */
export function QuoteDetailContent({ scope, quoteId }: { scope: QuoteScope; quoteId: string }) {
  return (
    <QuotePageShell scope={scope} permission={READ[scope]}>
      <QuoteDetailView scope={scope} quoteId={quoteId} />
    </QuotePageShell>
  );
}

function EditLoader({ scope, quoteId }: { scope: QuoteScope; quoteId: string }) {
  const { t } = useTranslation("quotes");
  const { data, isLoading } = useQuote(scope, quoteId);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">{t("detail.notFound")}</p>;
  return <QuoteWizard key={data.id} scope={scope} quote={data} />;
}

/** Quote edition through the creation wizard. */
export function EditQuoteContent({ scope, quoteId }: { scope: QuoteScope; quoteId: string }) {
  const { t } = useTranslation("quotes");
  return (
    <QuotePageShell scope={scope} permission={WRITE[scope]} title={t("wizard.editTitle")}>
      <EditLoader scope={scope} quoteId={quoteId} />
    </QuotePageShell>
  );
}

/** Printable quote (no page chrome of its own). */
export function PrintQuoteContent({ scope, quoteId }: { scope: QuoteScope; quoteId: string }) {
  const { t } = useTranslation("quotes");
  const has = usePermissions().has;
  if (!has(READ[scope])) {
    return <p className="p-6 text-sm text-muted-foreground">{t("restricted")}</p>;
  }
  return <QuotePrintView scope={scope} quoteId={quoteId} />;
}

/** Customers of the dealership, or of every dealership from the admin panel. */
export function CustomersContent({ scope }: { scope: QuoteScope }) {
  const { t } = useTranslation("quotes");
  return (
    <QuotePageShell
      scope={scope}
      permission={scope === "admin" ? Permission.CustomersRead : Permission.SelfCustomersRead}
      title={t("customers.title")}
      subtitle={scope === "admin" ? t("customers.adminSubtitle") : t("customers.subtitle")}
    >
      <CustomersView scope={scope} />
    </QuotePageShell>
  );
}

/** The dealer's own dealership details. */
export function DealershipContent() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <DealershipSettingsView />
    </div>
  );
}

/** Admin panel: every dealership's quotes, with figures. */
export function AdminQuotesContent() {
  const { t } = useTranslation("quotes");
  const [dealershipId, setDealershipId] = useState<string | undefined>();
  const dealerships = useDealerships();
  return (
    <QuotePageShell
      scope="admin"
      permission={Permission.QuotesRead}
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      actions={
        dealerships.data ? (
          <Select
            allowClear
            className="w-64"
            aria-label={t("history.columns.dealership")}
            placeholder={t("admin.allDealerships")}
            value={dealershipId}
            options={dealerships.data.items.map((item) => ({ value: item.id, label: item.name }))}
            onChange={setDealershipId}
          />
        ) : null
      }
    >
      <QuoteStatsView scope="admin" dealershipId={dealershipId} />
      <QuoteHistoryView scope="admin" dealershipId={dealershipId} />
    </QuotePageShell>
  );
}

/** Admin panel: the services offered in quotes and the vehicle catalog. */
export function AdminCatalogContent() {
  const { t } = useTranslation("quotes");
  return (
    <QuotePageShell
      scope="admin"
      permission={Permission.CatalogRead}
      title={t("catalog.title")}
      subtitle={t("catalog.subtitle")}
    >
      <ServicesAdminView />
    </QuotePageShell>
  );
}

/** Admin panel: dealerships. */
export function AdminDealershipsContent() {
  const { t } = useTranslation("quotes");
  return (
    <QuotePageShell
      scope="admin"
      permission={Permission.DealershipsRead}
      title={t("dealership.adminTitle")}
      subtitle={t("dealership.adminSubtitle")}
    >
      <DealershipsAdminView />
    </QuotePageShell>
  );
}
