"use client";

import { useEffect, useState } from "react";

import { MailCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/button";
import { useVerifyEmailMutation } from "@/hooks/api/use-auth";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";

import type { AxiosError } from "axios";

export function VerifyEmailContent() {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const { mutateAsync: verifyEmail } = useVerifyEmailMutation();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">(
    token ? "loading" : "missing",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token || status !== "loading") {
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail({ token });
        setStatus("success");
      } catch (error) {
        const axiosError = error as AxiosError<{ detail?: string }>;
        setStatus("error");
        setErrorMessage(axiosError.response?.data?.detail || t("verifyEmail.errorMsg"));
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mesh-glow texture-grain flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 24 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-lg shadow-primary/30"
          >
            <MailCheck className="h-6 w-6" />
          </motion.div>
        </div>
        {status === "loading" && (
          <LoadingScreen message={t("verifyEmail.verifying")} fullScreen={false} />
        )}

        {status === "missing" && (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              {t("verifyEmail.invalidLinkTitle")}
            </h1>
            <p className="text-muted-foreground">{t("verifyEmail.invalidLinkDesc")}</p>
            <Button asChild className="mt-4">
              <Link href={getLocalizedPath(ROUTES.login, currentLocale)}>
                {t("verifyEmail.backToLogin")}
              </Link>
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{t("verifyEmail.successTitle")}</h1>
            <p className="text-muted-foreground">{t("verifyEmail.successDesc")}</p>
            <Button asChild className="mt-4 w-full">
              <Link href={getLocalizedPath(ROUTES.login, currentLocale)}>
                {t("verifyEmail.loginNow")}
              </Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{t("verifyEmail.failedTitle")}</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href={getLocalizedPath(ROUTES.login, currentLocale)}>
                {t("verifyEmail.backToLogin")}
              </Link>
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
