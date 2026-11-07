"use client";

import { useEffect, useSyncExternalStore } from "react";

import { Form } from "antd";
import { Mail, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthEmailField } from "@/components/auth/AuthEmailField";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResendVerificationMutation } from "@/hooks/api/use-auth";
import {
  clearPendingVerifyEmail,
  getPendingVerifyEmail,
  getServerPendingVerifyEmail,
  subscribePendingVerifyEmail,
} from "@/lib/auth/pending-verify-email";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getEmailSchema, type ForgotFormValues } from "@/schemas/auth";

export function VerifyEmailNoticeContent() {
  const { t } = useTranslation(["auth", "errors"]);
  const { t: tv } = useTranslation("validation");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const router = useRouter();
  // useSyncExternalStore handles the SSR-snapshot (null) vs client-snapshot
  // split without tripping react-hooks/set-state-in-effect.
  const email = useSyncExternalStore(
    subscribePendingVerifyEmail,
    getPendingVerifyEmail,
    getServerPendingVerifyEmail,
  );

  const { mutate: resendEmail, isPending: isLoading, isSuccess } = useResendVerificationMutation();

  useEffect(() => {
    // Wait for the client snapshot before deciding to redirect — otherwise the
    // initial SSR-snapshot ``null`` would always push us back to /login.
    if (typeof window === "undefined") return;
    if (email === null) {
      router.replace(getLocalizedPath(ROUTES.login, currentLocale));
    }
  }, [email, router, currentLocale]);

  if (!email) {
    return null;
  }

  const onFinish = (values: ForgotFormValues) => {
    resendEmail({ email: values.email });
  };

  return (
    <div className="mesh-glow texture-grain flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthHeader
          t={t}
          titleKey="verifyEmail.noticeTitle"
          subtitleKey="verifyEmail.noticeSubtitle"
          icon={Mail}
        />

        <Card className="rounded-3xl border-border/60 bg-card/70 shadow-xl shadow-primary/5 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">{t("verifyEmail.cardTitle")}</CardTitle>
            <CardDescription>{t("verifyEmail.cardDescription")}</CardDescription>
          </CardHeader>

          <CardContent>
            <Form<ForgotFormValues>
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ email }}
              requiredMark={false}
            >
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  {t("login.emailLabel")}
                </label>
                <span className="text-xs opacity-70">{t("verifyEmail.emailNote")}</span>
              </div>
              <Form.Item name="email" rules={[zodFieldRule(getEmailSchema(tv))]}>
                <AuthEmailField
                  disabled={isLoading}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed text-muted-foreground"
                />
              </Form.Item>

              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <p>{t("verifyEmail.resendSuccess")}</p>
                </motion.div>
              )}

              <div className="flex flex-row gap-3 mt-6">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1"
                  type="button"
                  disabled={isLoading}
                >
                  <Link
                    href={getLocalizedPath(ROUTES.login, currentLocale)}
                    onClick={clearPendingVerifyEmail}
                  >
                    {t("verifyEmail.backToLogin")}
                  </Link>
                </Button>
                <Button className="flex-1" type="submit" loading={isLoading} disabled={isSuccess}>
                  {isLoading ? t("login.submitting") : t("verifyEmail.resendButton")}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
