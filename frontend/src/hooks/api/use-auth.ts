import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { authService } from "@/lib/api/endpoints/auth";
import { setPendingVerifyEmail } from "@/lib/auth/pending-verify-email";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import type {
  LoginPayload,
  RegisterPayload,
  VerifyEmailPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
} from "@/lib/types/auth";
import { isAdminTierRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

import type { AxiosError } from "axios";

/**
 * Auth Hooks
 * Contains mutation operations like Login and Register.
 */

export function useLoginMutation() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const queryClient = useQueryClient();
  const { login } = useAuthStore();
  // router.push resolves asynchronously: react-query flips isPending to false
  // the moment onSuccess returns, which re-enables the login form for the
  // second or so the target route takes to render (longer in dev, where it
  // compiles on first visit). This flag keeps the form in its loading state
  // until the navigation unmounts the page. Never reset — a redirecting login
  // surface has no valid interactive state to return to.
  const [isRedirecting, setIsRedirecting] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      // Wipe any cached queries from a prior session before the new user's
      // observers mount — without this, account A's data can flash to
      // account B if both sign in to the same tab without a clean logout.
      queryClient.clear();
      login(data.user);
      // Admin-tier role wins over deletion-grace: the admin shell is the right
      // home regardless of which login surface the user came through. Covers
      // SUPERADMIN too — sending them to /dashboard first would trigger the
      // AuthHydrator bounce and a visible double redirect.
      let target: string = ROUTES.dashboard;
      if (isAdminTierRole(data.user.role)) target = ROUTES.adminDashboard;
      else if (data.user.deletion_scheduled_at) target = ROUTES.accountDeactivated;
      setIsRedirecting(true);
      router.push(getLocalizedPath(target, currentLocale));
    },
    onError: (
      error: AxiosError<{ error?: string; detail?: string; success?: boolean }>,
      variables: LoginPayload,
    ) => {
      const errorData = error.response?.data;
      const errorCode = errorData?.error || errorData?.detail;

      // ``error.account.suspended`` is surfaced via the global toast from the
      // api interceptor. No redirect here — /account-suspended is a private
      // landing page reached only by already-authenticated users whose session
      // the AuthHydrator recognises as suspended.
      if (error.response?.status === 403 && errorCode === "error.user.email_not_verified") {
        setPendingVerifyEmail(variables.email);
        setIsRedirecting(true);
        router.push(getLocalizedPath(ROUTES.verifyEmailNotice, currentLocale));
      }
    },
  });

  return { ...mutation, isPending: mutation.isPending || isRedirecting };
}

export function useRegisterMutation() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const { i18n } = useTranslation();

  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      authService.register({ lang: i18n.language, ...payload }),
    onSuccess: (_, variables) => {
      setPendingVerifyEmail(variables.email);
      router.push(getLocalizedPath(ROUTES.verifyEmailNotice, currentLocale));
    },
    onError: () => {
      // Handled globally by api interceptor
    },
  });
}

export function useLogoutMutation() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();

  // Pick the login surface that matches who the user *was* — clearing the
  // store first would erase the role. Admins and superadmins stay in the admin
  // login flow (future-proof for the admin.<domain> split), everyone else
  // lands on /login.
  const redirectAfterLogout = () => {
    const target = isAdminTierRole(user?.role) ? ROUTES.adminLogin : ROUTES.login;
    logout();
    queryClient.clear();
    router.push(getLocalizedPath(target, currentLocale));
  };

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: redirectAfterLogout,
    onError: redirectAfterLogout,
  });
}

export function useVerifyEmailMutation() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) =>
      authService.verifyEmail({ lang: i18n.language, ...payload }),
  });
}

export function useForgotPasswordMutation() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      authService.forgotPassword({ lang: i18n.language, ...payload }),
  });
}

export function useResetPasswordMutation() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) =>
      authService.resetPassword({ lang: i18n.language, ...payload }),
  });
}

export function useResendVerificationMutation() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (payload: { email: string; lang?: string }) =>
      authService.resendVerification({ lang: i18n.language, ...payload }),
  });
}

export function useChangePasswordMutation() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();

  // The backend revokes the session and clears the auth cookies on a successful
  // password change, so drop client state and send the user to the matching
  // login surface to re-authenticate with their new password.
  const redirectToLogin = () => {
    const target = isAdminTierRole(user?.role) ? ROUTES.adminLogin : ROUTES.login;
    logout();
    queryClient.clear();
    router.push(getLocalizedPath(target, currentLocale));
  };

  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
    onSuccess: redirectToLogin,
  });
}
