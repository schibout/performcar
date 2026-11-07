"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuote } from "@/hooks/api/use-quotes";
import { getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import type { QuoteScope } from "@/lib/types/quote";

import { quotePaths } from "./quote-paths";
import { QuoteDocument } from "./QuoteDocument";

interface QuotePrintViewProps {
  scope: QuoteScope;
  quoteId: string;
}

// Printable quote. The browser's print dialog prints it or saves it as a PDF;
// the `print:` variants hide the toolbar and the application chrome.
export function QuotePrintView({ scope, quoteId }: QuotePrintViewProps) {
  const { t } = useTranslation("quotes");
  const locale = getLocaleFromPath(usePathname());
  const { data: quote, isLoading, isError } = useQuote(scope, quoteId);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={getLocalizedPath(quotePaths(scope).detail(quoteId), locale)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("print.back")}
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">{t("print.hint")}</p>
          <Button
            disabled={!quote}
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="h-4 w-4" />
            {t("print.action")}
          </Button>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-[600px] w-full" /> : null}
      {isError ? <p className="text-sm text-muted-foreground">{t("detail.notFound")}</p> : null}
      {quote ? (
        <div className="rounded-xl border bg-white p-6 text-neutral-900 sm:p-10 print:rounded-none print:border-0 print:p-0">
          <QuoteDocument quote={quote} />
        </div>
      ) : null}
    </div>
  );
}
