"use client";

import { useState } from "react";

import { Select } from "antd";
import { ArrowLeft, Pencil, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteQuote, useQuote, useUpdateQuote } from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import { getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { formatLongDateTime } from "@/lib/format-date";
import { Permission } from "@/lib/types/permissions";
import { QUOTE_STATUSES, type QuoteScope, type QuoteStatus } from "@/lib/types/quote";

import { quotePaths } from "./quote-paths";
import { QuoteDocument } from "./QuoteDocument";
import { QuoteStatusBadge } from "./QuoteStatusBadge";

const WRITE_KEYS: Record<QuoteScope, { write: Permission; remove: Permission }> = {
  self: { write: Permission.SelfQuotesWrite, remove: Permission.SelfQuotesDelete },
  admin: { write: Permission.QuotesWrite, remove: Permission.QuotesDelete },
};

interface QuoteDetailViewProps {
  scope: QuoteScope;
  quoteId: string;
}

export function QuoteDetailView({ scope, quoteId }: QuoteDetailViewProps) {
  const { t } = useTranslation("quotes");
  const router = useRouter();
  const locale = getLocaleFromPath(usePathname());
  const paths = quotePaths(scope);
  const { has } = usePermissions();
  const canWrite = has(WRITE_KEYS[scope].write);
  const canDelete = has(WRITE_KEYS[scope].remove);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: quote, isLoading, isError } = useQuote(scope, quoteId);
  const updateQuote = useUpdateQuote(scope, quoteId);
  const deleteQuote = useDeleteQuote(scope);

  const back = (
    <Link
      href={getLocalizedPath(paths.history, locale)}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("detail.back")}
    </Link>
  );

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !quote) {
    return (
      <div className="space-y-4">
        {back}
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          {t("detail.notFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("detail.title", { reference: quote.reference_number })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("detail.createdOn", { date: formatLongDateTime(quote.created_at) })}
            {quote.created_by ? ` · ${quote.created_by.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <Select
              aria-label={t("detail.changeStatus")}
              className="w-40"
              value={quote.status}
              loading={updateQuote.isPending}
              disabled={updateQuote.isPending}
              options={QUOTE_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))}
              onChange={(status: QuoteStatus) => {
                updateQuote.mutate({ status });
              }}
            />
          ) : (
            <QuoteStatusBadge status={quote.status} />
          )}
          <Button variant="outline" asChild>
            <Link href={getLocalizedPath(paths.print(quote.id), locale)}>
              <Printer className="h-4 w-4" />
              {t("detail.print")}
            </Link>
          </Button>
          {canWrite ? (
            <Button variant="outline" asChild>
              <Link href={getLocalizedPath(paths.edit(quote.id), locale)}>
                <Pencil className="h-4 w-4" />
                {t("detail.edit")}
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t("detail.delete")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-8">
        <QuoteDocument quote={quote} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("detail.deleteTitle")}
        description={t("detail.deleteDescription", { reference: quote.reference_number })}
        confirmLabel={t("detail.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        isLoading={deleteQuote.isPending}
        onConfirm={() => {
          deleteQuote.mutate(quote.id, {
            onSuccess: () => {
              setConfirmOpen(false);
              router.push(getLocalizedPath(paths.history, locale));
            },
          });
        }}
      />
    </div>
  );
}
