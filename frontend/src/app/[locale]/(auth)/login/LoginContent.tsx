"use client";

import { Form } from "antd";
import { Lock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthEmailField } from "@/components/auth/AuthEmailField";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLoginMutation } from "@/hooks/api/use-auth";
import { usePublicSettings } from "@/hooks/api/use-system-settings";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getEmailSchema, getRequiredPasswordSchema, type LoginFormValues } from "@/schemas/auth";

export function LoginContent() {
  const { t } = useTranslation(["auth", "validation"]);
  const { t: tv } = useTranslation("validation");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const { mutate: login, isPending: isLoading } = useLoginMutation();
  const { data: publicSettings } = usePublicSettings();
  const canRegister = publicSettings?.data.registration_enabled !== false;

  const onFinish = (values: LoginFormValues) => {
    login(values);
  };

  return (
    <div className="mesh-glow texture-grain flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthHeader t={t} titleKey="login.title" subtitleKey="login.subtitle" icon={Lock} />

        <Card className="rounded-3xl border-border/60 bg-card/70 shadow-xl shadow-primary/5 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">{t("login.cardTitle")}</CardTitle>
            <CardDescription>{t("login.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form<LoginFormValues>
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ email: "", password: "", rememberMe: false }}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={t("login.emailLabel")}
                rules={[zodFieldRule(getEmailSchema(tv))]}
              >
                <AuthEmailField disabled={isLoading} />
              </Form.Item>

              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium leading-none">
                  {t("login.passwordLabel")}
                </label>
                <Link
                  href={getLocalizedPath(ROUTES.forgotPassword, currentLocale)}
                  className="text-sm font-medium text-primary hover:underline transition-all"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <Form.Item name="password" rules={[zodFieldRule(getRequiredPasswordSchema(tv))]}>
                <AuthPasswordField disabled={isLoading} />
              </Form.Item>

              <Form.Item name="rememberMe" valuePropName="checked">
                <Checkbox>{t("login.rememberMe")}</Checkbox>
              </Form.Item>

              <div className="flex flex-col gap-4 mt-4">
                <Button className="w-full" type="submit" loading={isLoading}>
                  {isLoading ? t("login.submitting") : t("login.submitButton")}
                </Button>
                {canRegister && (
                  <div className="text-center text-sm">
                    {t("login.noAccount")}{" "}
                    <Link
                      href={getLocalizedPath(ROUTES.register, currentLocale)}
                      className="font-medium text-primary hover:underline transition-all"
                    >
                      {t("login.register")}
                    </Link>
                  </div>
                )}
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
