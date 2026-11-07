"use client";

import { Form } from "antd";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getNameSchema } from "@/schemas/auth";

import type { TFunction } from "i18next";

// First/last name field pair, each wrapped in its own <Form.Item>. Validation
// uses the shared zod name schema so error messages stay i18n-aware.
interface Props {
  disabled?: boolean;
  t: TFunction;
  firstNameLabelKey: string;
  lastNameLabelKey: string;
  firstNameName?: string;
  lastNameName?: string;
}

export function AuthNameFields({
  disabled,
  t,
  firstNameLabelKey,
  lastNameLabelKey,
  firstNameName = "first_name",
  lastNameName = "last_name",
}: Props) {
  const { t: tv } = useTranslation("validation");
  const nameRule = zodFieldRule(getNameSchema(tv));

  return (
    <div className="grid grid-cols-2 gap-4">
      <Form.Item name={firstNameName} label={t(firstNameLabelKey)} rules={[nameRule]}>
        <Input placeholder="Kemal" disabled={disabled} />
      </Form.Item>
      <Form.Item name={lastNameName} label={t(lastNameLabelKey)} rules={[nameRule]}>
        <Input placeholder="Çalak" disabled={disabled} />
      </Form.Item>
    </div>
  );
}
