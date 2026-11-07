"use client";

import { InputNumber, Select } from "antd";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { FINANCING_DURATIONS, FINANCING_TYPES, type FinancingType } from "@/lib/types/quote";

import { estimateMonthlyPayment, formatMoney } from "../quote-format";

import type { QuoteDraft } from "./quote-draft";

interface FinancingStepProps {
  draft: QuoteDraft;
  total: number;
  onChange: (financing: Partial<QuoteDraft["financing"]>) => void;
}

export function FinancingStep({ draft, total, onChange }: FinancingStepProps) {
  const { t } = useTranslation("quotes");
  const { type, down_payment: downPayment, duration_months: duration } = draft.financing;
  const financed = type !== "cash";
  const monthly = estimateMonthlyPayment(type, total, downPayment, duration);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("wizard.financing.title")}</h2>
        <p className="text-lg font-semibold tabular-nums">
          {t("wizard.total")}: {formatMoney(total)}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="financing-type">{t("wizard.financing.type")}</Label>
          <Select
            id="financing-type"
            className="w-full"
            value={type}
            options={FINANCING_TYPES.map((value) => ({ value, label: t(`financing.${value}`) }))}
            onChange={(value: FinancingType) => {
              onChange({ type: value });
            }}
          />
        </div>
        {financed ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="financing-down">{t("wizard.financing.downPayment")}</Label>
              <InputNumber
                id="financing-down"
                className="w-full!"
                min={0}
                max={total}
                precision={2}
                value={downPayment}
                status={downPayment > total ? "error" : undefined}
                onChange={(value) => {
                  onChange({ down_payment: typeof value === "number" ? value : 0 });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="financing-duration">{t("wizard.financing.duration")}</Label>
              <Select
                id="financing-duration"
                className="w-full"
                value={duration}
                options={FINANCING_DURATIONS.map((months) => ({
                  value: months,
                  label: t("wizard.financing.months", { count: months }),
                }))}
                onChange={(value: number) => {
                  onChange({ duration_months: value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("wizard.financing.monthly")}</Label>
              <p className="rounded-md bg-muted px-3 py-2 tabular-nums">{formatMoney(monthly)}</p>
            </div>
          </>
        ) : null}
      </div>
      {financed ? (
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 text-sm">
          <dt>{t("wizard.financing.totalCost")}</dt>
          <dd className="text-right tabular-nums">{formatMoney(total)}</dd>
          <dt>{t("wizard.financing.downPayment")}</dt>
          <dd className="text-right tabular-nums">{formatMoney(downPayment)}</dd>
          <dt>{t("wizard.financing.financed")}</dt>
          <dd className="text-right tabular-nums">{formatMoney(total - downPayment)}</dd>
          <dt>{t("wizard.financing.duration")}</dt>
          <dd className="text-right">{t("wizard.financing.months", { count: duration })}</dd>
          <dt>{t("wizard.financing.monthly")}</dt>
          <dd className="text-right tabular-nums">{formatMoney(monthly)}</dd>
        </dl>
      ) : null}
      <p className="text-sm text-muted-foreground">{t("wizard.financing.note")}</p>
    </div>
  );
}
