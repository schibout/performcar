// Client-only: relies on the browser's IANA timezone via Intl.DateTimeFormat
// (no `timeZone` option set) and on i18n.language resolved by the browser
// language detector. Calling from a server component will silently format
// using the server's timezone (typically UTC in containers) and fall back
// to "en", which is almost never what the user wants.
import i18n from "@/i18n/config";

type DateInput = string | null | undefined;

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
};

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

const LONG_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "long",
  timeStyle: "short",
};

const format = (iso: DateInput, opts: Intl.DateTimeFormatOptions): string => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(i18n.language || "en", opts).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const formatDate = (iso: DateInput): string => format(iso, DATE_OPTIONS);

export const formatDateTime = (iso: DateInput): string => format(iso, DATETIME_OPTIONS);

export const formatLongDateTime = (iso: DateInput): string => format(iso, LONG_DATETIME_OPTIONS);
