import i18n from "@/i18n/config";
import type { FinancingType, QuoteFinancing, QuoteStatus } from "@/lib/types/quote";

// Amounts are euros, as in the original quote generator.
export const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(i18n.language || "en", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
};

// A plain calendar date (``YYYY-MM-DD``) shown without a timezone shift.
export const formatCalendarDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(i18n.language || "en", { dateStyle: "long" }).format(
    new Date(year, month - 1, day),
  );
};

export const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: "gold",
  confirmed: "blue",
  completed: "green",
};

/**
 * Mirror of the server rule, for live display only: the monthly payment is the
 * financed amount spread over the duration; cash has no terms. The server
 * recomputes and stores the real figure.
 */
export const estimateMonthlyPayment = (
  type: FinancingType,
  total: number,
  downPayment: number,
  durationMonths: number | null | undefined,
): number | null => {
  if (type === "cash" || !durationMonths) return null;
  return Math.round(((total - downPayment) / durationMonths) * 100) / 100;
};

export const isFinanced = (financing: QuoteFinancing | null): financing is QuoteFinancing =>
  financing !== null && financing.type !== "cash";

export const customerName = (customer: { first_name: string; last_name: string }): string =>
  `${customer.first_name} ${customer.last_name}`;
