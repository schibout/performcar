"use client";

import { useMemo, useState } from "react";

import { Alert, Progress, Steps } from "antd";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCatalogServices,
  useCreateQuote,
  useMyDealership,
  useUpdateQuote,
  useVehicleCatalog,
} from "@/hooks/api/use-quotes";
import { getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { toast } from "@/lib/toast";
import type { CatalogService, Quote, QuoteScope } from "@/lib/types/quote";

import { quotePaths } from "../quote-paths";
import { CustomerStep } from "./CustomerStep";
import { FinancingStep } from "./FinancingStep";
import {
  STEPS,
  draftFromQuote,
  draftToPayload,
  draftTotal,
  emptyDraft,
  isStepComplete,
  stepIssues,
  type QuoteDraft,
  type StepKey,
} from "./quote-draft";
import { ServicesStep } from "./ServicesStep";
import { SummaryStep } from "./SummaryStep";
import { VehicleStep } from "./VehicleStep";

interface QuoteWizardProps {
  scope: QuoteScope;
  /** The quote being edited; absent when creating one. */
  quote?: Quote;
}

const stepStatus = (current: boolean, complete: boolean): "process" | "finish" | "wait" => {
  if (current) return "process";
  return complete ? "finish" : "wait";
};

// Services already on an edited quote stay listed even if the catalog no longer
// offers them (deactivated), at the price frozen on the quote.
const mergeQuoteLines = (catalog: CatalogService[], quote?: Quote): CatalogService[] => {
  if (!quote) return catalog;
  const known = new Set(catalog.map((service) => service.id));
  const missing = quote.services
    .filter((line) => !known.has(line.service_id))
    .map((line) => ({
      id: line.service_id,
      name: line.name,
      price: line.price,
      description: line.description,
      active: false,
      category: { id: line.category_code, name: line.category_name, code: line.category_code },
    }));
  return [...catalog, ...missing];
};

export function QuoteWizard({ scope, quote }: QuoteWizardProps) {
  const { t } = useTranslation("quotes");
  const router = useRouter();
  const locale = getLocaleFromPath(usePathname());
  const paths = quotePaths(scope);
  const [draft, setDraft] = useState<QuoteDraft>(() =>
    quote ? draftFromQuote(quote) : emptyDraft(),
  );
  const [stepIndex, setStepIndex] = useState(0);

  const vehicles = useVehicleCatalog(scope);
  const catalogServices = useCatalogServices(scope);
  const myDealership = useMyDealership();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote(scope, quote?.id ?? "");
  const saving = createQuote.isPending || updateQuote.isPending;

  const services = useMemo(
    () =>
      mergeQuoteLines(
        (catalogServices.data?.items ?? []).filter(
          (service) => service.active || draft.serviceIds.includes(service.id),
        ),
        quote,
      ),
    [catalogServices.data, quote, draft.serviceIds],
  );
  const total = draftTotal(draft, services);
  const step: StepKey = STEPS[stepIndex];
  const issues = step === "summary" ? [] : stepIssues(step, draft, total);
  const dealership = quote?.dealership ?? myDealership.data;

  // Merge a partial update into one of the draft's object sections.
  const patch = <K extends "vehicle" | "financing" | "customer">(
    key: K,
    value: Partial<QuoteDraft[K]>,
  ) => {
    setDraft((current) => ({ ...current, [key]: { ...current[key], ...value } }));
  };

  const firstIncomplete = STEPS.findIndex(
    (key) => key !== "services" && !isStepComplete(key, draft, total),
  );

  const save = () => {
    if (firstIncomplete !== -1) {
      setStepIndex(firstIncomplete);
      toast.error(t("wizard.incomplete"));
      return;
    }
    const payload = draftToPayload(draft);
    const onSuccess = (saved: Quote) => {
      toast.success(
        quote
          ? t("wizard.updated", { reference: saved.reference_number })
          : t("wizard.created", { reference: saved.reference_number }),
      );
      router.push(getLocalizedPath(paths.detail(saved.id), locale));
    };
    if (quote) updateQuote.mutate(payload, { onSuccess });
    else createQuote.mutate(payload, { onSuccess });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t("wizard.stepOf", { current: stepIndex + 1, total: STEPS.length })}
          </span>
          <span className="font-medium">{Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</span>
        </div>
        <Progress percent={((stepIndex + 1) / STEPS.length) * 100} showInfo={false} />
      </div>
      <Card className="border-border/50 bg-card/60">
        <CardContent className="space-y-6 p-4 sm:p-6">
          <Steps
            current={stepIndex}
            onChange={setStepIndex}
            size="small"
            responsive
            items={STEPS.map((key, index) => ({
              title: t(`wizard.steps.${key}`),
              status: stepStatus(index === stepIndex, isStepComplete(key, draft, total)),
            }))}
          />
          {step === "vehicle" ? (
            <VehicleStep
              draft={draft}
              catalog={vehicles.data}
              isLoading={vehicles.isLoading}
              onChange={(value) => {
                patch("vehicle", value);
              }}
            />
          ) : null}
          {step === "services" ? (
            <ServicesStep
              draft={draft}
              services={services}
              isLoading={catalogServices.isLoading}
              total={total}
              onChange={(ids) => {
                setDraft((current) => ({ ...current, serviceIds: ids }));
              }}
            />
          ) : null}
          {step === "financing" ? (
            <FinancingStep
              draft={draft}
              total={total}
              onChange={(value) => {
                patch("financing", value);
              }}
            />
          ) : null}
          {step === "customer" ? (
            <CustomerStep
              scope={scope}
              dealershipId={scope === "admin" ? quote?.dealership.id : undefined}
              draft={draft}
              onChange={(value) => {
                patch("customer", value);
              }}
              onDateChange={(date) => {
                setDraft((current) => ({ ...current, requested_date: date }));
              }}
            />
          ) : null}
          {step === "summary" ? (
            <SummaryStep draft={draft} services={services} total={total} dealership={dealership} />
          ) : null}
          {issues.length > 0 ? (
            <Alert type="warning" showIcon title={issues.map((issue) => t(issue)).join(" ")} />
          ) : null}
        </CardContent>
        <div className="flex justify-between gap-2 border-t p-4 sm:p-6">
          <Button
            variant="outline"
            disabled={stepIndex === 0 || saving}
            onClick={() => {
              setStepIndex(stepIndex - 1);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("wizard.previous")}
          </Button>
          {step === "summary" ? (
            <Button onClick={save} loading={saving}>
              {!saving && <Save className="h-4 w-4" />}
              {quote ? t("wizard.saveChanges") : t("wizard.save")}
            </Button>
          ) : (
            <Button
              onClick={() => {
                setStepIndex(stepIndex + 1);
              }}
            >
              {t("wizard.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
