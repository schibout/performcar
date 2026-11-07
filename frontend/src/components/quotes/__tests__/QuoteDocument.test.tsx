import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatMoney } from "@/components/quotes/quote-format";
import { QuoteDocument } from "@/components/quotes/QuoteDocument";
import type { Quote } from "@/lib/types/quote";

const quote: Quote = {
  id: "q1",
  reference_number: "QUO-20261107-0001",
  status: "pending",
  total_price: 1450,
  requested_date: null,
  created_at: "2026-11-07T10:00:00Z",
  updated_at: "2026-11-07T10:00:00Z",
  dealership: {
    id: "d1",
    name: "PerformCar Paris",
    logo_url: null,
    address: "1 avenue de Paris",
    phone: "0142567890",
    email: "paris@test.com",
    created_at: "2026-11-07T10:00:00Z",
    updated_at: "2026-11-07T10:00:00Z",
  },
  created_by: null,
  customer: {
    id: "c1",
    first_name: "Jean",
    last_name: "Dupont",
    phone: "0612345678",
    email: "jean@test.com",
    dealership_id: "d1",
    created_at: "2026-11-07T10:00:00Z",
    updated_at: "2026-11-07T10:00:00Z",
  },
  vehicle: {
    brand: "Audi",
    model: "A3",
    version: "Sportback",
    year: 2024,
    color: "Blanc",
    condition: "new",
  },
  financing: { type: "credit", down_payment: 250, duration_months: 12, monthly_payment: 100 },
  services: [
    {
      service_id: "s1",
      name: "Garantie étendue 3 ans",
      description: null,
      category_name: "Garantie",
      category_code: "GAR",
      price: 1200,
    },
    {
      service_id: "s2",
      name: "Livraison à domicile",
      description: null,
      category_name: "Livraison",
      category_code: "LIV",
      price: 250,
    },
  ],
};

describe("QuoteDocument", () => {
  it("prints the saved quote figures", () => {
    render(<QuoteDocument quote={quote} />);
    expect(screen.getByText("PerformCar Paris")).toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Garantie étendue 3 ans")).toBeInTheDocument();
    expect(screen.getByText(formatMoney(1450))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(100))).toBeInTheDocument();
    expect(screen.getByText("quotes:financing.credit")).toBeInTheDocument();
  });

  it("shows no financing terms for a cash quote", () => {
    render(
      <QuoteDocument
        quote={{
          ...quote,
          financing: {
            type: "cash",
            down_payment: null,
            duration_months: null,
            monthly_payment: null,
          },
        }}
      />,
    );
    expect(screen.getByText("quotes:financing.cash")).toBeInTheDocument();
    expect(screen.queryByText("quotes:wizard.financing.monthly")).not.toBeInTheDocument();
  });
});
