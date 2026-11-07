"use client";

import { useEffect } from "react";

import { Form, Select } from "antd";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { UserEditFormFields } from "@/components/admin/users/UserEditFormFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDealerships } from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import type { AdminUser, AdminUserUpdatePayload } from "@/lib/types/admin";
import { Permission } from "@/lib/types/permissions";
import { type AdminUserUpdateFormValues } from "@/schemas/admin";

interface UserEditFormProps {
  user: AdminUser;
  isSelf: boolean;
  isSaving: boolean;
  onSubmit: (payload: AdminUserUpdatePayload) => void;
}

type FormValues = AdminUserUpdateFormValues & { dealership_id?: string | null };

const userToFormValues = (user: AdminUser): FormValues => ({
  first_name: user.first_name ?? "",
  last_name: user.last_name ?? "",
  title: user.title ?? "",
  is_active: user.is_active,
  is_verified: user.is_verified,
  dealership_id: user.dealership_id ?? null,
});

export function UserEditForm({ user, isSelf, isSaving, onSubmit }: UserEditFormProps) {
  const { t } = useTranslation(["admin", "quotes"]);
  const [form] = Form.useForm<FormValues>();
  const initialValues = userToFormValues(user);
  // Attaching an account to a dealership needs both the user edit key (checked
  // by the page) and the dealership list to choose from.
  const { has } = usePermissions();
  const canAssignDealership = has(Permission.DealershipsRead);
  const { data: dealerships, isLoading: dealershipsLoading } = useDealerships(canAssignDealership);

  useEffect(() => {
    // Reset when the underlying user changes (navigating between detail pages).
    form.setFieldsValue(userToFormValues(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const onFinish = (values: FormValues) => {
    // Self-edit must not alter role, is_active, or is_verified even if DevTools
    // re-enables the disabled inputs. Backend guards this too; belt-and-braces.
    // Email is never in the payload — admins cannot change identity.
    const payload: AdminUserUpdatePayload = {
      first_name: values.first_name ? values.first_name : null,
      last_name: values.last_name ? values.last_name : null,
      title: values.title ? values.title : null,
    };
    if (!isSelf) {
      payload.is_active = values.is_active;
      payload.is_verified = values.is_verified;
    }
    if (canAssignDealership) {
      payload.dealership_id = values.dealership_id ?? null;
    }
    onSubmit(payload);
  };

  return (
    <Card className="flex h-full flex-col border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("userDetail.editTitle")}</CardTitle>
        <CardDescription>{t("userDetail.editDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={initialValues}
          requiredMark={false}
          className="flex flex-1 flex-col gap-4"
        >
          <UserEditFormFields isSelf={isSelf} />
          {canAssignDealership ? (
            <Form.Item
              name="dealership_id"
              label={t("quotes:dealership.userField")}
              extra={t("quotes:dealership.userFieldHint")}
            >
              <Select
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                loading={dealershipsLoading}
                placeholder={t("quotes:dealership.none")}
                options={(dealerships?.items ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Form.Item>
          ) : null}
          <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.resetFields();
              }}
              disabled={isSaving}
            >
              {t("userDetail.cancel")}
            </Button>
            <Button type="submit" loading={isSaving}>
              {!isSaving && <Save className="mr-2 h-4 w-4" />}
              {isSaving ? t("userDetail.saving") : t("userDetail.save")}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
