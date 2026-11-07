"use client";

import { useState } from "react";

import { Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCreateAdmin } from "@/hooks/api/use-admin";
import type { Permission } from "@/lib/types/permissions";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getAdminCreateSchema, type AdminCreateFormValues } from "@/schemas/admin";

import { PermissionMatrix } from "./PermissionMatrix";

interface CreateAdminModalProps {
  catalog: Permission[];
  open: boolean;
  onClose: () => void;
}

export function CreateAdminModal({ catalog, open, onClose }: CreateAdminModalProps) {
  const { t } = useTranslation("admin");
  // Validation messages live in the `validation` namespace and the shared auth
  // field schemas reference them unprefixed, so the schema needs a t bound to
  // that namespace (otherwise the raw keys like "passwordSpecial" show up).
  const { t: tv } = useTranslation("validation");
  const [form] = Form.useForm<AdminCreateFormValues>();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const { mutate: createAdmin, isPending } = useCreateAdmin();
  const schema = getAdminCreateSchema(tv);

  const close = () => {
    if (isPending) return;
    form.resetFields();
    setPermissions([]);
    onClose();
  };

  const onFinish = (values: AdminCreateFormValues) => {
    // Duplicate-email and other server errors surface via the global response
    // interceptor, so there's no inline error handling here.
    createAdmin(
      {
        email: values.email.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        password: values.password,
        permissions,
      },
      {
        onSuccess: () => {
          form.resetFields();
          setPermissions([]);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title={t("admins.create.title")}
      centered
      width={560}
      destroyOnHidden
      onCancel={close}
      mask={{ closable: !isPending }}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="mt-4">
        <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("admins.create.accountSection")}
        </p>
        <Form.Item
          name="email"
          label={t("admins.create.emailLabel")}
          rules={[zodFieldRule(schema.shape.email)]}
        >
          <Input
            type="email"
            placeholder={t("admins.create.emailPlaceholder")}
            disabled={isPending}
          />
        </Form.Item>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            name="first_name"
            label={t("admins.create.firstNameLabel")}
            rules={[zodFieldRule(schema.shape.first_name)]}
          >
            <Input disabled={isPending} />
          </Form.Item>
          <Form.Item
            name="last_name"
            label={t("admins.create.lastNameLabel")}
            rules={[zodFieldRule(schema.shape.last_name)]}
          >
            <Input disabled={isPending} />
          </Form.Item>
        </div>

        <Form.Item
          name="password"
          label={t("admins.create.passwordLabel")}
          rules={[zodFieldRule(schema.shape.password)]}
        >
          <Input.Password
            placeholder={t("admins.create.passwordPlaceholder")}
            disabled={isPending}
          />
        </Form.Item>

        {/* Divider + labelled section clearly separates the permission grid from
            the account fields above. */}
        <Separator className="my-5" />
        <p className="mt-3 mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("admins.create.permissionsLabel")}
        </p>
        <div className="mt-2">
          <PermissionMatrix
            catalog={catalog}
            value={permissions}
            onChange={setPermissions}
            disabled={isPending}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={close} disabled={isPending}>
            {t("admins.create.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("admins.create.submit")}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
