"use client";

import { InputNumber, Radio, Select } from "antd";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { VehicleCatalog } from "@/lib/types/quote";

import { currentYear, type QuoteDraft } from "./quote-draft";

interface VehicleStepProps {
  draft: QuoteDraft;
  catalog: VehicleCatalog | undefined;
  isLoading: boolean;
  onChange: (vehicle: Partial<QuoteDraft["vehicle"]>) => void;
}

export function VehicleStep({ draft, catalog, isLoading, onChange }: VehicleStepProps) {
  const { t } = useTranslation("quotes");
  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const brand = catalog?.brands.find((item) => item.name === draft.vehicle.brand);
  const model = brand?.models.find((item) => item.name === draft.vehicle.model);
  // A brand or model that left the catalog stays selectable on an edited quote.
  const withCurrent = (names: string[], current: string) =>
    current && !names.includes(current) ? [current, ...names] : names;
  const toOptions = (names: string[]) => names.map((name) => ({ value: name, label: name }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("wizard.vehicle.title")}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicle-brand">{t("wizard.vehicle.brand")}</Label>
          <Select
            id="vehicle-brand"
            className="w-full"
            showSearch={{ optionFilterProp: "label" }}
            placeholder={t("wizard.vehicle.brandPlaceholder")}
            value={draft.vehicle.brand || undefined}
            options={toOptions(
              withCurrent(catalog?.brands.map((item) => item.name) ?? [], draft.vehicle.brand),
            )}
            onChange={(value: string) => {
              onChange({ brand: value, model: "", version: "" });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-model">{t("wizard.vehicle.model")}</Label>
          <Select
            id="vehicle-model"
            className="w-full"
            showSearch={{ optionFilterProp: "label" }}
            disabled={!draft.vehicle.brand}
            placeholder={t("wizard.vehicle.modelPlaceholder")}
            value={draft.vehicle.model || undefined}
            options={toOptions(
              withCurrent(brand?.models.map((item) => item.name) ?? [], draft.vehicle.model),
            )}
            notFoundContent={t("wizard.vehicle.noModel")}
            onChange={(value: string) => {
              onChange({ model: value, version: "" });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-version">{t("wizard.vehicle.version")}</Label>
          <Select
            id="vehicle-version"
            className="w-full"
            allowClear
            disabled={!draft.vehicle.model}
            placeholder={t("wizard.vehicle.versionPlaceholder")}
            value={draft.vehicle.version || undefined}
            options={toOptions(
              withCurrent(model?.versions.map((item) => item.name) ?? [], draft.vehicle.version),
            )}
            notFoundContent={t("wizard.vehicle.noVersion")}
            onChange={(value: string | undefined) => {
              onChange({ version: value ?? "" });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-year">{t("wizard.vehicle.year")}</Label>
          <InputNumber
            id="vehicle-year"
            className="w-full!"
            min={2000}
            max={currentYear() + 1}
            precision={0}
            value={draft.vehicle.year}
            onChange={(value) => {
              onChange({ year: typeof value === "number" ? value : currentYear() });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-color">{t("wizard.vehicle.color")}</Label>
          <Select
            id="vehicle-color"
            className="w-full"
            showSearch={{ optionFilterProp: "label" }}
            placeholder={t("wizard.vehicle.colorPlaceholder")}
            value={draft.vehicle.color || undefined}
            options={toOptions(
              withCurrent(catalog?.colors.map((item) => item.name) ?? [], draft.vehicle.color),
            )}
            onChange={(value: string) => {
              onChange({ color: value });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("wizard.vehicle.condition")}</Label>
          <Radio.Group
            value={draft.vehicle.condition}
            onChange={(event) => {
              onChange({ condition: event.target.value as QuoteDraft["vehicle"]["condition"] });
            }}
            options={[
              { value: "new", label: t("condition.new") },
              { value: "used", label: t("condition.used") },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
