"use client";

import { useState } from "react";

import { Form } from "antd";
import { ChevronLeft, MailCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthEmailField } from "@/components/auth/AuthEmailField";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useForgotPasswordMutation } from "@/hooks/api/use-auth";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getEmailSchema, type ForgotFormValues } from "@/schemas/auth";

import type { AxiosError } from "axios";

export function ForgotPasswordContent() {
  const { t } = useTranslation("auth");
  const { t: tv } = useTranslation("validation");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const forgotPasswordMutation = useForgotPasswordMutation();

  const onFinish = async (values: ForgotFormValues) => {
    setError(null);
    try {
      await forgotPasswordMutation.mutateAsync({ email: values.email });
      setSubmittedEmail(values.email);
      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      const msg = axiosError.response?.data?.detail || t("forgotPassword.errorMsg");
      setError(msg);
    }
  };

  const isPending = forgotPasswordMutation.isPending;

  if (success) {
    return (
      <div className="mesh-glow texture-grain flex h-[calc(100vh-80px)] items-center justify-center overflow-hidden p-4">
        <div className="mx-auto w-full max-w-md space-y-6 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("forgotPassword.successTitle")}</h1>
          <p className="text-muted-foreground">
            {t("forgotPassword.successDescPrefix")}{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>.
          </p>
          <Button asChild className="w-full mt-4" variant="outline">
            <Link href={getLocalizedPath(ROUTES.login, currentLocale)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t("forgotPassword.backToLogin")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

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
          titleKey="forgotPassword.title"
          subtitleKey="forgotPassword.subtitle"
          icon={MailCheck}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form<ForgotFormValues>
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ email: "" }}
          requiredMark={false}
          className="space-y-4"
        >
          <Form.Item
            name="email"
            label={t("forgotPassword.emailLabel")}
            rules={[zodFieldRule(getEmailSchema(tv))]}
          >
            <AuthEmailField disabled={isPending} />
          </Form.Item>
          <div className="flex gap-3 pt-2">
            <Button asChild variant="outline" className="flex-1" disabled={isPending}>
              <Link href={getLocalizedPath(ROUTES.login, currentLocale)}>
                {t("forgotPassword.backToLogin")}
              </Link>
            </Button>
            <Button className="flex-1" type="submit" loading={isPending}>
              {isPending ? t("forgotPassword.submitting") : t("forgotPassword.submitButton")}
            </Button>
          </div>
        </Form>
      </motion.div>
    </div>
  );
}
