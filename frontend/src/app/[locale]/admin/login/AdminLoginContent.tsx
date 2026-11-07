"use client";

import { Form } from "antd";
import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AuthEmailField } from "@/components/auth/AuthEmailField";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/common/BrandWordmark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginMutation } from "@/hooks/api/use-auth";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getEmailSchema, getRequiredPasswordSchema, type LoginFormValues } from "@/schemas/auth";

export function AdminLoginContent() {
  const { t } = useTranslation(["admin", "auth", "validation"]);
  const { t: tv } = useTranslation("validation");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  // Reuses the public login mutation so admin sign-in inherits cache-clear,
  // email-not-verified redirect, and post-login role-based routing without
  // forking the success/error logic.
  const { mutate: loginMutate, isPending: isLoading } = useLoginMutation();

  const onFinish = (values: LoginFormValues) => {
    loginMutate(values);
  };

  return (
    <div className="texture-grain flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandWordmark className="mb-5 h-20" priority />
          <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("admin:login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin:login.subtitle")}</p>
        </div>

        <Card className="rounded-3xl border-border/60 bg-card/70 shadow-xl shadow-primary/5 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{t("admin:login.cardTitle")}</CardTitle>
            <CardDescription>{t("admin:login.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form<LoginFormValues>
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ email: "", password: "", rememberMe: true }}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={t("admin:login.emailLabel")}
                rules={[zodFieldRule(getEmailSchema(tv))]}
              >
                <AuthEmailField disabled={isLoading} />
              </Form.Item>
              <Form.Item
                name="password"
                label={t("admin:login.passwordLabel")}
                rules={[zodFieldRule(getRequiredPasswordSchema(tv))]}
              >
                <AuthPasswordField disabled={isLoading} />
              </Form.Item>
              <div className="flex flex-col gap-3 mt-4">
                <Button className="w-full" type="submit" loading={isLoading}>
                  {isLoading ? t("admin:login.submitting") : t("admin:login.submitButton")}
                </Button>
                <Link
                  href={getLocalizedPath(ROUTES.home, currentLocale)}
                  className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("admin:login.backToApp")}
                </Link>
              </div>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
