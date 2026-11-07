"use client";

import { Form } from "antd";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getAdminUserUpdateSchema } from "@/schemas/admin";

interface UserEditFormFieldsProps {
  isSelf: boolean;
}

export function UserEditFormFields({ isSelf }: UserEditFormFieldsProps) {
  const { t } = useTranslation(["admin", "validation"]);
  const schema = getAdminUserUpdateSchema(t);
  const firstNameRule = zodFieldRule(schema.shape.first_name);
  const lastNameRule = zodFieldRule(schema.shape.last_name);
  const titleRule = zodFieldRule(schema.shape.title);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Form.Item
          name="first_name"
          label={t("admin:userDetail.fields.firstName")}
          rules={[firstNameRule]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="last_name"
          label={t("admin:userDetail.fields.lastName")}
          rules={[lastNameRule]}
        >
          <Input />
        </Form.Item>
      </div>
      <Form.Item
        name="title"
        label={t("admin:userDetail.fields.title")}
        rules={[titleRule]}
        normalize={(v: string | null | undefined) => v ?? ""}
      >
        <Input />
      </Form.Item>
      <div className="grid gap-4 md:grid-cols-2">
        <Form.Item name="is_active" valuePropName="checked" label=" " colon={false}>
          <Checkbox disabled={isSelf}>{t("admin:userDetail.fields.active")}</Checkbox>
        </Form.Item>
        <Form.Item name="is_verified" valuePropName="checked" label=" " colon={false}>
          <Checkbox>{t("admin:userDetail.fields.verified")}</Checkbox>
        </Form.Item>
      </div>
    </>
  );
}
