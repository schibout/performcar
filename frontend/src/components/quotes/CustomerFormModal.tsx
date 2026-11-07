"use client";

import { useEffect } from "react";

import { Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/api/use-quotes";
import { toast } from "@/lib/toast";
import type { Customer, CustomerPayload, QuoteScope } from "@/lib/types/quote";

interface CustomerFormModalProps {
  scope: QuoteScope;
  open: boolean;
  /** The customer to edit; absent to create one. */
  customer: Customer | null;
  onClose: () => void;
}

interface FormValues {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
}

const NAME_PATTERN = /^[a-zA-ZÀ-ÿ\-\s']+$/;
const PHONE_PATTERN = /^(?:\+33|0)[1-9][0-9]{8}$/;

export function CustomerFormModal({ scope, open, customer, onClose }: CustomerFormModalProps) {
  const { t } = useTranslation("quotes");
  const [form] = Form.useForm<FormValues>();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer(scope);
  const saving = createCustomer.isPending || updateCustomer.isPending;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      first_name: customer?.first_name ?? "",
      last_name: customer?.last_name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
    });
  }, [open, customer, form]);

  const nameRules = [
    { required: true, message: t("customers.validation.nameRequired") },
    { min: 2, max: 100, message: t("customers.validation.nameLength") },
    { pattern: NAME_PATTERN, message: t("customers.validation.nameChars") },
  ];

  const onFinish = (values: FormValues) => {
    const payload: CustomerPayload = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
    };
    const onSuccess = () => {
      toast.success(customer ? t("customers.updated") : t("customers.created"));
      onClose();
    };
    if (customer) updateCustomer.mutate({ id: customer.id, payload }, { onSuccess });
    else createCustomer.mutate(payload, { onSuccess });
  };

  return (
    <Modal
      open={open}
      title={customer ? t("customers.editTitle") : t("customers.createTitle")}
      centered
      width={520}
      destroyOnHidden
      onCancel={() => {
        if (!saving) onClose();
      }}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="mt-4">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="first_name" label={t("customers.fields.first_name")} rules={nameRules}>
            <Input autoComplete="given-name" maxLength={100} disabled={saving} />
          </Form.Item>
          <Form.Item name="last_name" label={t("customers.fields.last_name")} rules={nameRules}>
            <Input autoComplete="family-name" maxLength={100} disabled={saving} />
          </Form.Item>
        </div>
        <Form.Item
          name="email"
          label={t("customers.fields.email")}
          rules={[{ type: "email", message: t("customers.validation.email") }]}
        >
          <Input type="email" autoComplete="email" maxLength={100} disabled={saving} />
        </Form.Item>
        <Form.Item
          name="phone"
          label={t("customers.fields.phone")}
          rules={[
            {
              validator: (_rule, value?: string) =>
                !value?.trim() || PHONE_PATTERN.test(value.replace(/[\s.\-()]/g, ""))
                  ? Promise.resolve()
                  : Promise.reject(new Error(t("customers.validation.phone"))),
            },
          ]}
        >
          <Input type="tel" autoComplete="tel" maxLength={20} disabled={saving} />
        </Form.Item>
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
