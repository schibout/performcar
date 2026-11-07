"use client";

import { useState } from "react";

import { Form, Modal } from "antd";
import { AlertTriangle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useDeactivateMe } from "@/hooks/api/use-users";
import { useLanguage } from "@/hooks/use-language";
import { ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { type DeactivateAccountFormValues, getDeactivateAccountSchema } from "@/schemas/user";
import { useAuthStore } from "@/stores/auth.store";

export const DangerZone = () => {
  const { t } = useTranslation(["account", "validation"]);
  const { t: tv } = useTranslation("validation");
  const [open, setOpen] = useState(false);
  const { mutate: deactivate, isPending } = useDeactivateMe();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { language } = useLanguage();
  const [form] = Form.useForm<DeactivateAccountFormValues>();
  const acknowledge = Form.useWatch("acknowledge", form);
  const deactivateSchema = getDeactivateAccountSchema(tv);
  const passwordRule = zodFieldRule(deactivateSchema.shape.password);
  const acknowledgeRule = zodFieldRule(deactivateSchema.shape.acknowledge);

  const handleClose = () => {
    if (isPending) return;
    setOpen(false);
    form.resetFields();
  };

  const onFinish = (values: DeactivateAccountFormValues) => {
    deactivate(
      { password: values.password, lang: language },
      {
        onSuccess: () => {
          setOpen(false);
          form.resetFields();
          logout();
          router.push(getLocalizedPath(ROUTES.login, language));
        },
      },
    );
  };

  return (
    <Card className="rounded-3xl border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-3 text-destructive">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-5 w-5" />
          </span>
          {t("account:deactivate.title")}
        </CardTitle>
        <CardDescription>{t("account:deactivate.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end">
        <Button
          variant="destructive"
          onClick={() => {
            setOpen(true);
          }}
        >
          <AlertTriangle className="h-4 w-4" />
          {t("account:deactivate.cta")}
        </Button>
      </CardContent>

      <Modal
        open={open}
        onCancel={handleClose}
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("account:deactivate.dialog.title")}
          </span>
        }
        footer={null}
        destroyOnHidden
      >
        <p className="mb-4 text-sm text-muted-foreground">
          {t("account:deactivate.dialog.description")}
        </p>

        <Form<DeactivateAccountFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ password: "", acknowledge: false }}
          requiredMark={false}
          className="space-y-4"
        >
          <Form.Item
            name="password"
            label={t("account:deactivate.dialog.passwordLabel")}
            rules={[passwordRule]}
          >
            <Input
              type="password"
              placeholder="••••••••"
              prefix={<Lock className="h-4 w-4 text-muted-foreground" />}
              autoComplete="current-password"
              disabled={isPending}
            />
          </Form.Item>

          <Form.Item name="acknowledge" valuePropName="checked" rules={[acknowledgeRule]}>
            <Checkbox disabled={isPending}>
              {t("account:deactivate.dialog.acknowledgeLabel")}
            </Checkbox>
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {t("account:deactivate.dialog.cancel")}
            </Button>
            <Button type="submit" variant="destructive" loading={isPending} disabled={!acknowledge}>
              {isPending
                ? t("account:deactivate.dialog.submitting")
                : t("account:deactivate.dialog.confirm")}
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};
