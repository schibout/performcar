import axios from "axios";

import { env } from "@/env";
import i18n from "@/i18n/config";
import {
  ROUTES,
  getLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  isAdminPath,
  protectedRoutes,
  matchesRoute,
} from "@/lib/config/routes";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth.store";

import type { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

interface ErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

const isServer = typeof window === "undefined";
const API_URL = isServer ? env.NEXT_PUBLIC_API_URL : "";
const API_PREFIX = env.NEXT_PUBLIC_API_PREFIX;

// Requests under /auth/* should not trigger silent refresh-and-retry when
// they 401. /auth/change-password is the exception: it runs as an
// authenticated user and its 401 should follow the normal refresh flow.
const AUTH_ROUTE_PREFIX = "/auth/";
const REFRESHABLE_AUTH_PATHS: readonly string[] = ["/auth/change-password"];

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // Custom header forces a CORS preflight for cross-origin POST/PUT/DELETE
    // and makes classic HTML-form CSRF impossible. Combined with the backend
    // origin allow-list and SameSite cookies this is our CSRF defense.
    "X-Requested-With": "XMLHttpRequest",
  },
});

const translateAndToast = (key: string, type: "success" | "error", id?: string) => {
  const namespace = type === "success" ? "success" : "errors";
  const translatedMessage = i18n.t(`${namespace}:${key}`, {
    defaultValue: i18n.t(`common:${key}`, { defaultValue: key }),
  });
  if (type === "success") {
    toast.success(translatedMessage, { id: id || key });
  } else {
    toast.error(translatedMessage, { id: id || key });
  }
};

const performLogout = async () => {
  const { isAuthenticated, logout } = useAuthStore.getState();

  // Always clear client state first
  logout();

  if (isAuthenticated) {
    try {
      await axios.post(
        `${API_URL}${API_PREFIX}/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: { "X-Requested-With": "XMLHttpRequest" },
        },
      );
    } catch {
      // Ignore background logout failure
    }
  }

  // Restore hard redirect to clear React Query cache and other stale state
  if (typeof window !== "undefined") {
    const locale = getLocaleFromPath(window.location.pathname);
    const pathWithoutLocale = getPathWithoutLocale(window.location.pathname);

    // Only redirect to login if we are currently on a protected route
    const isProtectedRoute = protectedRoutes.some((route) =>
      matchesRoute(pathWithoutLocale, route),
    );

    if (isProtectedRoute) {
      // Keep admins inside the admin shell on session expiry; the public login
      // page would lose their original destination context.
      const target = isAdminPath(pathWithoutLocale) ? ROUTES.adminLogin : ROUTES.login;
      const loginPath = getLocalizedPath(target, locale);
      window.location.href = `${loginPath}?session_expired=true`;
    }
  }
};

const handleNonAuthError = (error: AxiosError<ErrorResponse>) => {
  const rawError =
    error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message;

  // Skip errors that are handled by redirections in hooks
  const skipToastErrors = ["error.user.email_not_verified"];

  if (rawError && !skipToastErrors.includes(rawError)) {
    translateAndToast(rawError, "error");
  } else if (!error.response) {
    translateAndToast("INTERNAL_SERVER_ERROR", "error", "INTERNAL_SERVER_ERROR");
  }
};

let refreshPromise: Promise<string> | null = null;

const attemptTokenRefresh = async (
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
) => {
  try {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          await axios.post(
            `${API_URL}${API_PREFIX}/auth/refresh`,
            {},
            {
              withCredentials: true,
              headers: { "X-Requested-With": "XMLHttpRequest" },
            },
          );
          return "refreshed";
        } finally {
          refreshPromise = null;
        }
      })();
    }

    await refreshPromise;
    return await api(originalRequest);
  } catch (refreshError) {
    void performLogout();
    return Promise.reject(
      refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
    );
  }
};

const handleUnauthorized = (error: AxiosError<ErrorResponse>, isAuthRequest: boolean) => {
  const rawError =
    error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message;

  if (rawError) {
    translateAndToast(rawError, "error", rawError);
  } else {
    translateAndToast("genericError", "error", "genericError");
  }

  if (!isAuthRequest) {
    void performLogout();
  }
};

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data as { message?: string };
    const rawMessage = data?.message;
    if (rawMessage && response.config.method?.toLowerCase() !== "get") {
      translateAndToast(rawMessage, "success");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data;
  },
  (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = originalRequest.url || "";
    const isAuthRequest =
      url.includes(AUTH_ROUTE_PREFIX) && !REFRESHABLE_AUTH_PATHS.some((path) => url.includes(path));

    if (status !== 401) {
      handleNonAuthError(error);
      return Promise.reject(error);
    }

    if (!originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      return attemptTokenRefresh(originalRequest);
    }

    handleUnauthorized(error, isAuthRequest);
    return Promise.reject(error);
  },
);

export default api;
