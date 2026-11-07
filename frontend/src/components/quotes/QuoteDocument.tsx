"use client";

import { useTranslation } from "react-i18next";

import { formatDate } from "@/lib/format-date";
import type { Quote } from "@/lib/types/quote";

import { customerName, formatCalendarDate, formatMoney, isFinanced } from "./quote-format";

// The quote as handed to the customer: on screen in the detail page and on
// paper (or PDF) from the print page. Every figure comes from the saved quote.
export function QuoteDocument({ quote }: { quote: Quote }) {
  const { t } = useTranslation("quotes");
  const { dealership, customer, vehicle, financing } = quote;

  return (
    <article className="quote-document space-y-8 text-sm">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          {dealership.logo_url ? (
            <img src={dealership.logo_url} alt={dealership.name} className="mb-2 h-12 w-auto" />
          ) : null}
          <p className="text-lg font-semibold">{dealership.name}</p>
          {dealership.address ? <p>{dealership.address}</p> : null}
          {dealership.phone ? <p>{dealership.phone}</p> : null}
          {dealership.email ? <p>{dealership.email}</p> : null}
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="text-xl font-semibold">
            {t("document.title", { reference: quote.reference_number })}
          </p>
          <p>{t("document.date", { date: formatDate(quote.created_at) })}</p>
          <p>
            {t("detail.status")}: {t(`status.${quote.status}`)}
          </p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-1">
          <h2 className="font-semibold uppercase tracking-wide text-muted-foreground">
            {t("detail.customer")}
          </h2>
          <p className="font-medium">{customerName(customer)}</p>
          {customer.email ? <p>{customer.email}</p> : null}
          {customer.phone ? <p>{customer.phone}</p> : null}
          <p>
            {t("detail.requestedDate")}:{" "}
            {quote.requested_date
              ? formatCalendarDate(quote.requested_date)
              : t("detail.notSpecified")}
          </p>
        </section>
        <section className="space-y-1">
          <h2 className="font-semibold uppercase tracking-wide text-muted-foreground">
            {t("detail.vehicle")}
          </h2>
          <p className="font-medium">
            {vehicle.brand} {vehicle.model} {vehicle.version ?? ""}
          </p>
          <p>
            {t("wizard.vehicle.year")}: {vehicle.year}
          </p>
          <p>
            {t("wizard.vehicle.color")}: {vehicle.color}
          </p>
          <p>
            {t("wizard.vehicle.condition")}: {t(`condition.${vehicle.condition}`)}
          </p>
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold uppercase tracking-wide text-muted-foreground">
          {t("detail.services")}
        </h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/60">
              <th className="px-3 py-2 text-left">{t("detail.service")}</th>
              <th className="px-3 py-2 text-left">{t("detail.category")}</th>
              <th className="px-3 py-2 text-right">{t("detail.price")}</th>
            </tr>
          </thead>
          <tbody>
            {quote.services.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-center text-muted-foreground">
                  {t("detail.noServices")}
                </td>
              </tr>
            ) : (
              quote.services.map((line) => (
                <tr key={line.service_id} className="border-b">
                  <td className="px-3 py-2">
                    <span className="font-medium">{line.name}</span>
                    {line.description ? (
                      <span className="block text-xs text-muted-foreground">
                        {line.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{line.category_name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold uppercase tracking-wide text-muted-foreground">
          {t("detail.financing")}
        </h2>
        <p>{financing ? t(`financing.${financing.type}`) : t("detail.noFinancing")}</p>
        {isFinanced(financing) ? (
          <dl className="grid max-w-md grid-cols-2 gap-1">
            <dt>{t("wizard.financing.downPayment")}</dt>
            <dd className="text-right tabular-nums">{formatMoney(financing.down_payment)}</dd>
            <dt>{t("wizard.financing.duration")}</dt>
            <dd className="text-right">
              {t("wizard.financing.months", { count: financing.duration_months ?? 0 })}
            </dd>
            <dt>{t("wizard.financing.monthly")}</dt>
            <dd className="text-right tabular-nums">{formatMoney(financing.monthly_payment)}</dd>
          </dl>
        ) : null}
      </section>

      <div className="flex justify-end border-t pt-4">
        <p className="text-lg font-semibold">
          {t("document.totalIncl")}:{" "}
          <span className="tabular-nums">{formatMoney(quote.total_price)}</span>
        </p>
      </div>

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        <p>{t("detail.validity")}</p>
        <p>
          {dealership.name}
          {dealership.address ? ` · ${dealership.address}` : ""}
        </p>
      </footer>
    </article>
  );
}
