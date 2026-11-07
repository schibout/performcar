"use client";

import { Checkbox } from "antd";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogService } from "@/lib/types/quote";
import { cn } from "@/lib/utils";

import { formatMoney } from "../quote-format";
import { linePrice, type QuoteDraft } from "./quote-draft";

interface ServicesStepProps {
  draft: QuoteDraft;
  services: CatalogService[];
  isLoading: boolean;
  total: number;
  onChange: (serviceIds: string[]) => void;
}

export function ServicesStep({ draft, services, isLoading, total, onChange }: ServicesStepProps) {
  const { t } = useTranslation("quotes");
  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const groups = new Map<string, CatalogService[]>();
  for (const service of services) {
    const group = groups.get(service.category.name) ?? [];
    group.push(service);
    groups.set(service.category.name, group);
  }
  const toggle = (id: string) => {
    onChange(
      draft.serviceIds.includes(id)
        ? draft.serviceIds.filter((item) => item !== id)
        : [...draft.serviceIds, id],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("wizard.services.title")}</h2>
        <p className="text-lg font-semibold tabular-nums">
          {t("wizard.total")}: {formatMoney(total)}
        </p>
      </div>
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("wizard.services.empty")}</p>
      ) : null}
      {[...groups.entries()].map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h3 className="border-b pb-2 font-medium">{category}</h3>
          {items.map((service) => {
            const selected = draft.serviceIds.includes(service.id);
            return (
              <label
                key={service.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 transition-colors",
                  selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <span className="flex items-start gap-3">
                  <Checkbox
                    checked={selected}
                    onChange={() => {
                      toggle(service.id);
                    }}
                  />
                  <span>
                    <span className="block font-medium">{service.name}</span>
                    {service.description ? (
                      <span className="block text-sm text-muted-foreground">
                        {service.description}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatMoney(linePrice(draft, service))}
                </span>
              </label>
            );
          })}
        </section>
      ))}
    </div>
  );
}
