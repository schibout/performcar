"use client";

import { AutoComplete, Input, Select } from "antd";
import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useQuotes } from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import { Permission } from "@/lib/types/permissions";

import { CHANNELS, MESSAGE_TYPES, TONES, type CommunicationRequest } from "./communication-prompt";

const FIELD_LABEL = "mb-1 block text-xs font-medium text-muted-foreground";

interface CommunicationFormProps {
  value: CommunicationRequest;
  onChange: (value: CommunicationRequest) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function CommunicationForm({ value, onChange, onSubmit, disabled }: CommunicationFormProps) {
  const { t } = useTranslation("assistant");
  // The quote picker is a convenience: without self.quotes:read the field stays free text.
  const canReadQuotes = usePermissions().has(Permission.SelfQuotesRead);
  const quotes = useQuotes("self", { limit: 50 });
  const search = value.reference.trim().toLowerCase();
  const quoteOptions = (canReadQuotes ? (quotes.data?.items ?? []) : [])
    .map((quote) => ({
      value: quote.reference_number,
      label: `${quote.reference_number} — ${quote.customer.first_name} ${quote.customer.last_name}`,
    }))
    .filter((option) => option.label.toLowerCase().includes(search));

  const update = <K extends keyof CommunicationRequest>(key: K, field: CommunicationRequest[K]) => {
    onChange({ ...value, [key]: field });
  };

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sm:col-span-2">
        <span className={FIELD_LABEL}>{t("communication.reference")}</span>
        <AutoComplete
          className="w-full"
          value={value.reference}
          options={quoteOptions}
          placeholder={t("communication.referencePlaceholder")}
          onChange={(reference: string) => {
            update("reference", reference);
          }}
        />
      </label>
      <label>
        <span className={FIELD_LABEL}>{t("communication.type")}</span>
        <Select
          className="w-full"
          value={value.type}
          options={MESSAGE_TYPES.map((type) => ({
            value: type,
            label: t(`communication.types.${type}`),
          }))}
          onChange={(type) => {
            update("type", type);
          }}
        />
      </label>
      <label>
        <span className={FIELD_LABEL}>{t("communication.channel")}</span>
        <Select
          className="w-full"
          value={value.channel}
          options={CHANNELS.map((channel) => ({
            value: channel,
            label: t(`communication.channels.${channel}`),
          }))}
          onChange={(channel) => {
            update("channel", channel);
          }}
        />
      </label>
      <label>
        <span className={FIELD_LABEL}>{t("communication.tone")}</span>
        <Select
          className="w-full"
          value={value.tone}
          options={TONES.map((tone) => ({ value: tone, label: t(`communication.tones.${tone}`) }))}
          onChange={(tone) => {
            update("tone", tone);
          }}
        />
      </label>
      <label className="sm:col-span-2">
        <span className={FIELD_LABEL}>{t("communication.instructions")}</span>
        <Input.TextArea
          rows={2}
          maxLength={2000}
          value={value.instructions}
          placeholder={t("communication.instructionsPlaceholder")}
          onChange={(event) => {
            update("instructions", event.target.value);
          }}
        />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={disabled}>
          <Wand2 className="h-4 w-4" />
          {t("communication.generate")}
        </Button>
      </div>
    </form>
  );
}
