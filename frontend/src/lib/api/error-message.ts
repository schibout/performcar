import { isAxiosError } from "axios";

interface ErrorBody {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
}

/**
 * The message key an API refusal carries (for example `error.rbac.role_in_use`),
 * which resolves in the `errors` namespace. Null when the failure has no key,
 * a validation error list for instance.
 */
export const getApiErrorKey = (error: unknown): string | null => {
  if (!isAxiosError<ErrorBody>(error)) return null;
  const body = error.response?.data;
  for (const candidate of [body?.error, body?.detail, body?.message]) {
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return null;
};

export const getApiErrorStatus = (error: unknown): number | null =>
  isAxiosError(error) ? (error.response?.status ?? null) : null;
