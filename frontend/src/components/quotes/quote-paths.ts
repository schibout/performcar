import { ROUTES } from "@/lib/config/routes";
import type { QuoteScope } from "@/lib/types/quote";

// Where the quote screens of each perimeter live (without the locale prefix).
export const quotePaths = (scope: QuoteScope) => {
  const root = scope === "admin" ? ROUTES.adminQuotes : ROUTES.quotes;
  return {
    root,
    history: scope === "admin" ? ROUTES.adminQuotes : ROUTES.quotesHistory,
    detail: (id: string) => `${root}/${id}`,
    edit: (id: string) => `${root}/${id}/edit`,
    print: (id: string) => `${root}/${id}/print`,
  };
};
