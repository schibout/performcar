import { describe, expect, it } from "vitest";

import {
  draftFromQuote,
  draftToPayload,
  draftTotal,
  emptyDraft,
  isStepComplete,
  stepIssues,
  todayIso,
  type QuoteDraft,
} from "@/components/quotes/wizard/quote-draft";
import type { CatalogService, Quote } from "@/lib/types/quote";

const category = { id: "c1", name: "Garantie", code: "GAR" };
const services: CatalogService[] = [
  { id: "s1", name: "Garantie", price: 1200, description: null, active: true, category },
  { id: "s2", name: "Livraison", price: 250, description: null, active: true, category },
];

const validDraft = (): QuoteDraft => ({
  ...emptyDraft(),
  vehicle: {
    brand: "Audi",
    model: "A3",
    version: "",
    year: new Date().getFullYear(),
    color: "Blanc",
    condition: "new",
  },
  serviceIds: ["s1", "s2"],
  customer: { first_name: "Jean", last_name: "Dupont", phone: "06 12 34 56 78", email: "" },
});

describe("quote draft", () => {
  it("totals the selected services, keeping frozen prices", () => {
    const draft = { ...validDraft(), frozenPrices: { s1: 1000 } };
    expect(draftTotal(draft, services)).toBe(1250);
  });

  it("reports what keeps each step from being valid", () => {
    const draft = emptyDraft();
    expect(stepIssues("vehicle", draft, 0)).toEqual([
      "wizard.issues.vehicle",
      "wizard.issues.color",
    ]);
    expect(stepIssues("customer", draft, 0)).toContain("wizard.issues.name");
    expect(isStepComplete("services", draft, 0)).toBe(false);

    const financed = {
      ...validDraft(),
      financing: { type: "credit" as const, down_payment: 5000, duration_months: 12 },
    };
    expect(stepIssues("financing", financed, 1450)).toEqual(["wizard.issues.downPayment"]);

    const badContact = {
      ...validDraft(),
      customer: { first_name: "J3an", last_name: "D", phone: "12345", email: "nope" },
      requested_date: "2000-01-01",
    };
    expect(stepIssues("customer", badContact, 0)).toEqual([
      "wizard.issues.name",
      "wizard.issues.phone",
      "wizard.issues.email",
      "wizard.issues.date",
    ]);
    expect(stepIssues("customer", { ...validDraft(), requested_date: todayIso() }, 0)).toEqual([]);
  });

  it("builds the API payload", () => {
    const cash = draftToPayload(validDraft());
    expect(cash.financing).toEqual({ type: "cash" });
    expect(cash.customer).toEqual({
      first_name: "Jean",
      last_name: "Dupont",
      phone: "06 12 34 56 78",
      email: null,
    });
    expect(cash.vehicle.version).toBeNull();
    expect(cash.requested_date).toBeNull();

    const credit = draftToPayload({
      ...validDraft(),
      customer: { ...validDraft().customer, id: "cust-1" },
      financing: { type: "credit", down_payment: 250, duration_months: 12 },
    });
    expect(credit.customer.id).toBe("cust-1");
    expect(credit.financing).toEqual({ type: "credit", down_payment: 250, duration_months: 12 });
  });

  it("restores an edited quote with its frozen prices", () => {
    const quote = {
      vehicle: {
        brand: "BMW",
        model: "X3",
        version: null,
        year: 2024,
        color: "Noir",
        condition: "used",
      },
      services: [{ service_id: "s1", price: 999 }],
      financing: null,
      customer: { id: "c", first_name: "A", last_name: "B", phone: null, email: null },
      requested_date: null,
    } as unknown as Quote;
    const draft = draftFromQuote(quote);
    expect(draft.frozenPrices).toEqual({ s1: 999 });
    expect(draft.financing.type).toBe("cash");
    expect(draft.customer.id).toBe("c");
  });
});
