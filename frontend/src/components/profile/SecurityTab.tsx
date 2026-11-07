"use client";

import { Form } from "antd";
import { Lock, Shield, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DangerZone } from "@/components/profile/DangerZone";
import { SessionsSection } from "@/components/profile/SessionsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useChangePasswordMutation } from "@/hooks/api/use-auth";
import { cn } from "@/lib/utils";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import {
  getConfirmPasswordSchema,
  getPasswordSchema,
  getRequiredPasswordSchema,
} from "@/schemas/auth";
import { type ChangePasswordFormValues } from "@/schemas/user";

interface SecurityTabProps {
  // The admin-panel profile hides self-deactivation (admin lifecycle is managed
  // by superadmins; a root self-deactivating would orphan the system).
  showDangerZone?: boolean;
}

// 0–4 heuristic score for the strength meter; purely visual feedback, the
// real policy lives in the zod password schema.
const getPasswordStrength = (value: string): number => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) || /[^a-zA-Z0-9]/.test(value)) score += 1;
  return Math.min(4, score);
};

const STRENGTH_LABEL_KEYS = [
  "security.strengthWeak",
  "security.strengthWeak",
  "security.strengthFair",
  "security.strengthGood",
  "security.strengthStrong",
] as const;

const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-primary/70",
  "bg-primary",
] as const;

export const SecurityTab = ({ showDangerZone = true }: SecurityTabProps) => {
  const { t } = useTranslation(["profile", "validation"]);
  const { t: tv } = useTranslation("validation");
  const { mutate: changePassword, isPending: isLoading } = useChangePasswordMutation();
  const [form] = Form.useForm<ChangePasswordFormValues>();
  const newPassword = Form.useWatch("new_password", form) ?? "";
  const strength = getPasswordStrength(newPassword);

  const onFinish = ({ confirmPassword: _, ...payload }: ChangePasswordFormValues) => {
    changePassword(payload, {
      onSuccess: () => {
        form.resetFields();
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Shield className="h-5 w-5" />
            </span>
            {t("security.title")}
          </CardTitle>
          <CardDescription>{t("security.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form<ChangePasswordFormValues>
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ current_password: "", new_password: "", confirmPassword: "" }}
            requiredMark={false}
            className="space-y-4"
          >
            <Form.Item
              name="current_password"
              label={t("security.currentPassword")}
              rules={[zodFieldRule(getRequiredPasswordSchema(tv))]}
            >
              <Input
                type="password"
                placeholder="••••••••"
                prefix={<Lock className="h-4 w-4 text-muted-foreground" />}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </Form.Item>

            <Separator className="my-2" />

            <Form.Item
              name="new_password"
              label={t("security.newPassword")}
              rules={[zodFieldRule(getPasswordSchema(tv))]}
            >
              <Input
                type="password"
                placeholder="••••••••"
                prefix={<Lock className="h-4 w-4 text-muted-foreground" />}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </Form.Item>

            {newPassword ? (
              <div className="-mt-2 space-y-1.5 pb-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((segment) => (
                    <span
                      key={segment}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-300",
                        segment < strength ? STRENGTH_COLORS[strength] : "bg-border",
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("security.strengthLabel")}:{" "}
                  <span className="font-medium text-foreground">
                    {t(STRENGTH_LABEL_KEYS[strength])}
                  </span>
                </p>
              </div>
            ) : null}

            <Form.Item
              name="confirmPassword"
              label={t("security.confirmPassword")}
              dependencies={["new_password"]}
              rules={[
                zodFieldRule(getConfirmPasswordSchema(tv)),
                ({ getFieldValue }) => ({
                  validator(_rule, value: string) {
                    if (!value || getFieldValue("new_password") === value) return Promise.resolve();
                    return Promise.reject(new Error(tv("confirmPasswordMismatch")));
                  },
                }),
              ]}
            >
              <Input
                type="password"
                placeholder="••••••••"
                prefix={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </Form.Item>

            <div className="pt-4">
              <Button type="submit" loading={isLoading} className="w-full md:w-auto">
                {isLoading ? t("security.submitting") : t("security.submit")}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <SessionsSection />

      {showDangerZone ? <DangerZone /> : null}
    </div>
  );
};
