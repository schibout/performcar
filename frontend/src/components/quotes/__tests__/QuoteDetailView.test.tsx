import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuoteDetailView } from "@/components/quotes/QuoteDetailView";
import { Permission } from "@/lib/types/permissions";
import type { Quote } from "@/lib/types/quote";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

const quote = {
  id: "q1",
  reference_number: "QUO-20261107-0001",
  status: "pending",
  total_price: 250,
  requested_date: null,
  created_at: "2026-11-07T10:00:00Z",
  updated_at: "2026-11-07T10:00:00Z",
  dealership: { id: "d1", name: "Paris", logo_url: null, address: null, phone: null, email: null },
  created_by: null,
  customer: { id: "c1", first_name: "Jean", last_name: "Dupont", phone: null, email: null },
  vehicle: {
    brand: "Audi",
    model: "A3",
    version: null,
    year: 2024,
    color: "Blanc",
    condition: "new",
  },
  financing: null,
  services: [],
} as unknown as Quote;

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/quotes/q1",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/api/use-quotes", () => ({
  useQuote: () => ({ data: quote, isLoading: false, isError: false }),
  useUpdateQuote: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteQuote: () => ({ mutate: vi.fn(), isPending: false }),
}));

const signIn = (permissions: Permission[]) => {
  useAuthStore.setState({
    user: { id: "u1", email: "d@test.com", role: SystemRole.USER, permissions } as unknown as User,
  });
};

describe("QuoteDetailView", () => {
  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it("shows a read-only quote to a dealer without write keys", () => {
    signIn([Permission.SelfQuotesRead]);
    renderWithProviders(<QuoteDetailView scope="self" quoteId="q1" />);
    expect(screen.getByText("quotes:status.pending")).toBeInTheDocument();
    expect(screen.queryByText("quotes:detail.edit")).not.toBeInTheDocument();
    expect(screen.queryByText("quotes:detail.delete")).not.toBeInTheDocument();
    expect(screen.getByText("quotes:detail.print")).toBeInTheDocument();
  });

  it("offers edit, status change and delete with the write keys", () => {
    signIn([Permission.SelfQuotesRead, Permission.SelfQuotesWrite, Permission.SelfQuotesDelete]);
    renderWithProviders(<QuoteDetailView scope="self" quoteId="q1" />);
    expect(screen.getByText("quotes:detail.edit")).toBeInTheDocument();
    expect(screen.getByText("quotes:detail.delete")).toBeInTheDocument();
    expect(screen.getByLabelText("quotes:detail.changeStatus")).toBeInTheDocument();
  });

  it("ignores dealer keys on the admin perimeter", () => {
    signIn([Permission.SelfQuotesRead, Permission.SelfQuotesWrite, Permission.SelfQuotesDelete]);
    renderWithProviders(<QuoteDetailView scope="admin" quoteId="q1" />);
    expect(screen.queryByText("quotes:detail.edit")).not.toBeInTheDocument();
    expect(screen.queryByText("quotes:detail.delete")).not.toBeInTheDocument();
  });
});
