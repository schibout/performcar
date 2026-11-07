"use client";

import { useState, useEffect } from "react";

import { Form } from "antd";
import { isAxiosError } from "axios";
import { ShieldCheck, XCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useResetPasswordMutation } from "@/hooks/api/use-auth";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getConfirmPasswordSchema, getPasswordSchema, type ResetFormValues } from "@/schemas/auth";

const SuccessState = ({ t, locale }: { t: (key: string) => string; locale: string }) => (
  <div className="mesh-glow texture-grain flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
    <div className="mx-auto w-full max-w-md space-y-6 text-center">
      <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
      <h1 className="text-2xl font-bold tracking-tight">{t("resetPassword.successTitle")}</h1>
      <p className="text-muted-foreground">{t("resetPassword.successDesc")}</p>
      <Button asChild className="w-full mt-4">
        <Link href={getLocalizedPath(ROUTES.login, locale)}>{t("resetPassword.loginNow")}</Link>
      </Button>
    </div>
  </div>
);

const InvalidLinkState = ({ t, locale }: { t: (key: string) => string; locale: string }) => (
  <div className="mesh-glow texture-grain flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
    <div className="mx-auto w-full max-w-md space-y-6 text-center">
      <XCircle className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-bold tracking-tight">{t("resetPassword.invalidLinkTitle")}</h1>
      <p className="text-muted-foreground">{t("resetPassword.invalidLinkDesc")}</p>
      <Button asChild className="mt-4">
        <Link href={getLocalizedPath(ROUTES.login, locale)}>{t("login.login")}</Link>
      </Button>
    </div>
  </div>
);

export function ResetPasswordContent() {
  const { t } = useTranslation("auth");
  const { t: tv } = useTranslation("validation");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPasswordMutation = useResetPasswordMutation();
  const isPending = resetPasswordMutation.isPending;

  const onFinish = async (values: ResetFormValues) => {
    if (!token) return;
    setError(null);
    try {
      await resetPasswordMutation.mutateAsync({ token, new_password: values.password });
      setSuccess(true);
    } catch (err: unknown) {
      const detail =
        isAxiosError<{ detail?: string }>(err) && err.response?.data?.detail
          ? err.response.data.detail
          : null;
      setError(detail ?? t("resetPassword.errorMsg"));
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push(getLocalizedPath(ROUTES.login, currentLocale));
    }, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, [success, router, currentLocale]);

  if (!token) return <InvalidLinkState t={t} locale={currentLocale} />;
  if (success) return <SuccessState t={t} locale={currentLocale} />;

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
          titleKey="resetPassword.title"
          subtitleKey="resetPassword.subtitle"
          icon={ShieldCheck}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form<ResetFormValues>
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ password: "", confirmPassword: "" }}
          requiredMark={false}
          className="space-y-4"
        >
          <Form.Item
            name="password"
            label={t("resetPassword.newPassword")}
            rules={[zodFieldRule(getPasswordSchema(tv))]}
          >
            <AuthPasswordField disabled={isPending} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t("resetPassword.confirmNewPassword")}
            dependencies={["password"]}
            rules={[
              zodFieldRule(getConfirmPasswordSchema(tv)),
              ({ getFieldValue }) => ({
                validator(_rule, value: string) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error(tv("confirmPasswordMismatch")));
                },
              }),
            ]}
          >
            <AuthPasswordField disabled={isPending} />
          </Form.Item>
          <Button className="w-full" type="submit" loading={isPending}>
            {isPending ? t("resetPassword.submitting") : t("resetPassword.submitButton")}
          </Button>
        </Form>
      </motion.div>
    </div>
  );
}
