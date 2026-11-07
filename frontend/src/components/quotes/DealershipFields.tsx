"use client";

import { Form, Input } from "antd";
import { useTranslation } from "react-i18next";

const PHONE_PATTERN = /^(?:\+33|0)[1-9][0-9]{8}$/;

// The dealership details of the original "Company" settings section.
export function DealershipFields({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation("quotes");
  return (
    <>
      <Form.Item
        name="name"
        label={t("dealership.fields.name")}
        rules={[
          { required: true, message: t("dealership.validation.name") },
          { min: 2, max: 100, message: t("dealership.validation.name") },
        ]}
      >
        <Input maxLength={100} disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="logo_url"
        label={t("dealership.fields.logo_url")}
        rules={[{ type: "url", message: t("dealership.validation.url") }]}
      >
        <Input maxLength={255} placeholder="https://" disabled={disabled} />
      </Form.Item>
      <Form.Item name="address" label={t("dealership.fields.address")}>
        <Input.TextArea rows={2} maxLength={500} disabled={disabled} />
      </Form.Item>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name="phone"
          label={t("dealership.fields.phone")}
          rules={[
            {
              validator: (_rule, value?: string) =>
                !value?.trim() || PHONE_PATTERN.test(value.replace(/[\s.\-()]/g, ""))
                  ? Promise.resolve()
                  : Promise.reject(new Error(t("customers.validation.phone"))),
            },
          ]}
        >
          <Input type="tel" maxLength={20} disabled={disabled} />
        </Form.Item>
        <Form.Item
          name="email"
          label={t("dealership.fields.email")}
          rules={[{ type: "email", message: t("customers.validation.email") }]}
        >
          <Input type="email" maxLength={100} disabled={disabled} />
        </Form.Item>
      </div>
    </>
  );
}
