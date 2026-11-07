"use client";

import { useTranslation } from "react-i18next";

import type { CatalogService, Dealership } from "@/lib/types/quote";

import { estimateMonthlyPayment, formatCalendarDate, formatMoney } from "../quote-format";
import { linePrice, type QuoteDraft } from "./quote-draft";

interface SummaryStepProps {
  draft: QuoteDraft;
  services: CatalogService[];
  total: number;
  dealership: Dealership | undefined;
}

export function SummaryStep({ draft, services, total, dealership }: SummaryStepProps) {
  const { t } = useTranslation("quotes");
  const selected = services.filter((service) => draft.serviceIds.includes(service.id));
  const { type, down_payment: downPayment, duration_months: duration } = draft.financing;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("wizard.summary.title")}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium text-muted-foreground">{t("detail.dealership")}</h3>
          <p className="font-semibold">{dealership?.name ?? "—"}</p>
          {dealership?.address ? <p className="text-sm">{dealership.address}</p> : null}
          {dealership?.phone ? <p className="text-sm">{dealership.phone}</p> : null}
          {dealership?.email ? <p className="text-sm">{dealership.email}</p> : null}
        </section>
        <section className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium text-muted-foreground">{t("detail.customer")}</h3>
          <p className="font-semibold">
            {draft.customer.first_name} {draft.customer.last_name}
          </p>
          {draft.customer.phone ? <p className="text-sm">{draft.customer.phone}</p> : null}
          {draft.customer.email ? <p className="text-sm">{draft.customer.email}</p> : null}
          <p className="text-sm">
            {t("detail.requestedDate")}:{" "}
            {draft.requested_date
              ? formatCalendarDate(draft.requested_date)
              : t("detail.notSpecified")}
          </p>
        </section>
      </div>
      <section className="rounded-lg border p-4">
        <h3 className="mb-2 font-medium text-muted-foreground">{t("detail.vehicle")}</h3>
        <p className="font-semibold">
          {draft.vehicle.brand} {draft.vehicle.model} {draft.vehicle.version}
        </p>
        <p className="text-sm">
          {draft.vehicle.year} · {draft.vehicle.color} · {t(`condition.${draft.vehicle.condition}`)}
        </p>
      </section>
      <section className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">{t("detail.service")}</th>
              <th className="px-4 py-2 text-right">{t("detail.price")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {selected.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-3 text-center text-muted-foreground">
                  {t("detail.noServices")}
                </td>
              </tr>
            ) : (
              selected.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-2">{service.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(linePrice(draft, service))}
                  </td>
                </tr>
              ))
            )}
            <tr className="bg-primary/5 font-semibold">
              <td className="px-4 py-2">{t("detail.total")}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section className="rounded-lg border p-4 text-sm">
        <h3 className="mb-2 font-medium text-muted-foreground">{t("detail.financing")}</h3>
        <p>{t(`financing.${type}`)}</p>
        {type !== "cash" ? (
          <p>
            {t("wizard.financing.downPayment")}: {formatMoney(downPayment)} ·{" "}
            {t("wizard.financing.months", { count: duration })} · {t("wizard.financing.monthly")}:{" "}
            {formatMoney(estimateMonthlyPayment(type, total, downPayment, duration))}
          </p>
        ) : null}
      </section>
      <p className="text-sm text-muted-foreground">{t("detail.validity")}</p>
    </div>
  );
}
