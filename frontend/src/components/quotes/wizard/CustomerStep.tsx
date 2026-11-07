"use client";

import { useState } from "react";

import { Select } from "antd";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomers } from "@/hooks/api/use-quotes";
import { useDebounce } from "@/hooks/use-debounce";
import type { QuoteScope } from "@/lib/types/quote";

import { customerName } from "../quote-format";
import { todayIso, type QuoteDraft } from "./quote-draft";

interface CustomerStepProps {
  scope: QuoteScope;
  /** Admin edit: the customers to offer are those of the quote's dealership. */
  dealershipId?: string;
  draft: QuoteDraft;
  onChange: (customer: Partial<QuoteDraft["customer"]>) => void;
  onDateChange: (date: string) => void;
}

const FIELDS = [
  { key: "first_name", type: "text", autoComplete: "given-name" },
  { key: "last_name", type: "text", autoComplete: "family-name" },
  { key: "email", type: "email", autoComplete: "email" },
  { key: "phone", type: "tel", autoComplete: "tel" },
] as const;

export function CustomerStep({
  scope,
  dealershipId,
  draft,
  onChange,
  onDateChange,
}: CustomerStepProps) {
  const { t } = useTranslation("quotes");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data, isFetching } = useCustomers(scope, {
    search: debounced.trim() || undefined,
    limit: 20,
    dealership_id: dealershipId,
  });

  const options = (data?.items ?? []).map((customer) => ({
    value: customer.id,
    label: `${customerName(customer)}${customer.email ? ` · ${customer.email}` : ""}`,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("wizard.customer.title")}</h2>
      <div className="space-y-2">
        <Label htmlFor="existing-customer">{t("wizard.customer.existing")}</Label>
        <Select
          id="existing-customer"
          className="w-full"
          allowClear
          showSearch={{ filterOption: false, onSearch: setSearch }}
          loading={isFetching}
          placeholder={t("wizard.customer.existingPlaceholder")}
          value={draft.customer.id}
          options={
            draft.customer.id && !options.some((option) => option.value === draft.customer.id)
              ? [{ value: draft.customer.id, label: customerName(draft.customer) }, ...options]
              : options
          }
          onChange={(id: string | undefined) => {
            const customer = data?.items.find((item) => item.id === id);
            if (!id || !customer) {
              onChange({ id: undefined, first_name: "", last_name: "", phone: "", email: "" });
              return;
            }
            onChange({
              id,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: customer.phone ?? "",
              email: customer.email ?? "",
            });
          }}
        />
        <p className="text-xs text-muted-foreground">
          {draft.customer.id
            ? t("wizard.customer.updatesExisting")
            : t("wizard.customer.createsNew")}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`customer-${field.key}`}>{t(`customers.fields.${field.key}`)}</Label>
            <Input
              id={`customer-${field.key}`}
              type={field.type}
              autoComplete={field.autoComplete}
              maxLength={100}
              required={field.key === "first_name" || field.key === "last_name"}
              value={draft.customer[field.key]}
              onChange={(event) => {
                onChange({ [field.key]: event.target.value });
              }}
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="requested-date">{t("wizard.customer.requestedDate")}</Label>
          <Input
            id="requested-date"
            type="date"
            min={todayIso()}
            value={draft.requested_date}
            onChange={(event) => {
              onDateChange(event.target.value);
            }}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t("wizard.customer.privacy")}</p>
    </div>
  );
}
