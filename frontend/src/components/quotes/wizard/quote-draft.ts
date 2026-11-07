import type {
  CatalogService,
  FinancingType,
  Quote,
  QuoteCreatePayload,
  VehicleCondition,
} from "@/lib/types/quote";

// Client-side mirror of the server validation, so a step can say what is
// missing before the request is sent. The server stays the authority.
const NAME_PATTERN = /^[a-zA-ZÀ-ÿ\-\s']+$/;
const PHONE_PATTERN = /^(?:\+33|0)[1-9][0-9]{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const STEPS = ["vehicle", "services", "financing", "customer", "summary"] as const;
export type StepKey = (typeof STEPS)[number];

export interface QuoteDraft {
  vehicle: {
    brand: string;
    model: string;
    version: string;
    year: number;
    color: string;
    condition: VehicleCondition;
  };
  serviceIds: string[];
  // Price of the lines already on an edited quote: they keep it.
  frozenPrices: Record<string, number>;
  financing: { type: FinancingType; down_payment: number; duration_months: number };
  customer: { id?: string; first_name: string; last_name: string; phone: string; email: string };
  requested_date: string;
}

export const currentYear = (): number => new Date().getFullYear();

export const emptyDraft = (): QuoteDraft => ({
  vehicle: { brand: "", model: "", version: "", year: currentYear(), color: "", condition: "new" },
  serviceIds: [],
  frozenPrices: {},
  financing: { type: "cash", down_payment: 0, duration_months: 36 },
  customer: { first_name: "", last_name: "", phone: "", email: "" },
  requested_date: "",
});

export const draftFromQuote = (quote: Quote): QuoteDraft => ({
  vehicle: {
    brand: quote.vehicle.brand,
    model: quote.vehicle.model,
    version: quote.vehicle.version ?? "",
    year: quote.vehicle.year,
    color: quote.vehicle.color,
    condition: quote.vehicle.condition,
  },
  serviceIds: quote.services.map((line) => line.service_id),
  frozenPrices: Object.fromEntries(quote.services.map((line) => [line.service_id, line.price])),
  financing: {
    type: quote.financing?.type ?? "cash",
    down_payment: quote.financing?.down_payment ?? 0,
    duration_months: quote.financing?.duration_months ?? 36,
  },
  customer: {
    id: quote.customer.id,
    first_name: quote.customer.first_name,
    last_name: quote.customer.last_name,
    phone: quote.customer.phone ?? "",
    email: quote.customer.email ?? "",
  },
  requested_date: quote.requested_date ?? "",
});

export const linePrice = (draft: QuoteDraft, service: CatalogService): number =>
  draft.frozenPrices[service.id] ?? service.price;

export const draftTotal = (draft: QuoteDraft, services: CatalogService[]): number => {
  const byId = new Map(services.map((service) => [service.id, service]));
  return draft.serviceIds.reduce((sum, id) => {
    const service = byId.get(id);
    return sum + (draft.frozenPrices[id] ?? service?.price ?? 0);
  }, 0);
};

export const todayIso = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const compactPhone = (phone: string) => phone.replace(/[\s.\-()]/g, "");

const validName = (value: string) => value.trim().length >= 2 && NAME_PATTERN.test(value.trim());

const vehicleIssues = ({ vehicle }: QuoteDraft): string[] =>
  [
    (!vehicle.brand || !vehicle.model) && "wizard.issues.vehicle",
    !vehicle.color && "wizard.issues.color",
    (vehicle.year < 2000 || vehicle.year > currentYear() + 1) && "wizard.issues.year",
  ].filter((issue): issue is string => Boolean(issue));

const financingIssues = ({ financing }: QuoteDraft, total: number): string[] =>
  financing.type !== "cash" && (financing.down_payment < 0 || financing.down_payment > total)
    ? ["wizard.issues.downPayment"]
    : [];

const customerIssues = ({ customer, requested_date: date }: QuoteDraft): string[] =>
  [
    (!validName(customer.first_name) || !validName(customer.last_name)) && "wizard.issues.name",
    customer.phone.trim() &&
      !PHONE_PATTERN.test(compactPhone(customer.phone)) &&
      "wizard.issues.phone",
    customer.email.trim() && !EMAIL_PATTERN.test(customer.email.trim()) && "wizard.issues.email",
    date && date < todayIso() && "wizard.issues.date",
  ].filter((issue): issue is string => Boolean(issue));

/** Return the translation keys of what keeps a step from being valid. */
export const stepIssues = (step: StepKey, draft: QuoteDraft, total: number): string[] => {
  if (step === "vehicle") return vehicleIssues(draft);
  if (step === "financing") return financingIssues(draft, total);
  if (step === "customer") return customerIssues(draft);
  return [];
};

export const isStepComplete = (step: StepKey, draft: QuoteDraft, total: number): boolean => {
  if (step === "services") return draft.serviceIds.length > 0;
  if (step === "summary") return true;
  return stepIssues(step, draft, total).length === 0;
};

export const draftToPayload = (draft: QuoteDraft): QuoteCreatePayload => ({
  vehicle: {
    brand: draft.vehicle.brand,
    model: draft.vehicle.model,
    version: draft.vehicle.version || null,
    year: draft.vehicle.year,
    color: draft.vehicle.color,
    condition: draft.vehicle.condition,
  },
  customer: {
    ...(draft.customer.id ? { id: draft.customer.id } : {}),
    first_name: draft.customer.first_name.trim(),
    last_name: draft.customer.last_name.trim(),
    phone: draft.customer.phone.trim() || null,
    email: draft.customer.email.trim() || null,
  },
  service_ids: draft.serviceIds,
  financing:
    draft.financing.type === "cash"
      ? { type: "cash" }
      : {
          type: draft.financing.type,
          down_payment: draft.financing.down_payment,
          duration_months: draft.financing.duration_months,
        },
  requested_date: draft.requested_date || null,
});
