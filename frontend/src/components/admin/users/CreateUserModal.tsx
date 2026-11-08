"use client";

import { Form, Input, Modal, Select } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AudienceBadge } from "@/components/admin/rbac/AudienceBadge";
import { Button } from "@/components/ui/button";
import { useCreateUser } from "@/hooks/api/use-admin";
import { useDealerships } from "@/hooks/api/use-quotes";
import { useRoles, useSetUserRoles } from "@/hooks/api/use-rbac";
import { usePermissions } from "@/hooks/use-permissions";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";
import { toast } from "@/lib/toast";
import { Permission } from "@/lib/types/permissions";
import { RbacAudience } from "@/lib/types/rbac";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getAdminCreateSchema, type AdminCreateFormValues } from "@/schemas/admin";

// Key of the system role every account starts with (backend DEFAULT_USER_ROLE_KEY).
const DEFAULT_ROLE_KEY = "user";

type FormValues = AdminCreateFormValues & { dealership_id?: string | null; role_ids?: string[] };

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creates a verified account, then applies the chosen roles through the regular
 * role assignment (which also moves the account to the admin tier when an admin
 * role is picked), so every RBAC guard still applies.
 */
export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const { t } = useTranslation("admin");
  const { t: tv } = useTranslation("validation");
  const [form] = Form.useForm<FormValues>();
  const router = useRouter();
  const pathname = usePathname();
  const { has } = usePermissions();
  const canPickDealership = has(Permission.DealershipsRead);
  const canPickRoles = has(Permission.RolesRead);
  const canGrantAdmin = has(Permission.AdminsWrite);
  const dealerships = useDealerships(open && canPickDealership);
  const roles = useRoles(open && canPickRoles);
  const createUser = useCreateUser();
  const setRoles = useSetUserRoles();
  const isPending = createUser.isPending || setRoles.isPending;
  const schema = getAdminCreateSchema(tv);

  const roleList = roles.data?.data ?? [];
  const defaultRoleId = roleList.find((role) => role.key === DEFAULT_ROLE_KEY)?.id;
  const isUserRole = (id: string) =>
    roleList.find((role) => role.id === id)?.audience === RbacAudience.User;

  const close = () => {
    if (isPending) return;
    form.resetFields();
    onClose();
  };

  const openDetail = (userId: string) => {
    form.resetFields();
    onClose();
    router.push(getLocalizedPath(`${ROUTES.adminUsers}/${userId}`, getLocaleFromPath(pathname)));
  };

  const onFinish = (values: FormValues) => {
    const roleIds = values.role_ids ?? [];
    createUser.mutate(
      {
        email: values.email.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        password: values.password,
        dealership_id: values.dealership_id ?? null,
      },
      {
        onSuccess: ({ user }) => {
          toast.success(t("users.create.success"));
          // The account already holds the default role: only a different choice needs a call.
          if (roleIds.length === 0 || (roleIds.length === 1 && roleIds[0] === defaultRoleId)) {
            openDetail(user.id);
            return;
          }
          setRoles.mutate(
            {
              userId: user.id,
              payload: { assignments: roleIds.map((id) => ({ id, expires_at: null })) },
            },
            {
              onSettled: (_data, error) => {
                if (error) toast.error(t("users.create.rolesFailed"));
                openDetail(user.id);
              },
            },
          );
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title={t("users.create.title")}
      centered
      width={560}
      destroyOnHidden
      onCancel={close}
      mask={{ closable: !isPending }}
      footer={null}
    >
      <p className="mt-1 text-sm text-muted-foreground">{t("users.create.description")}</p>
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        className="mt-4"
      >
        <Form.Item
          name="email"
          label={t("users.create.emailLabel")}
          rules={[zodFieldRule(schema.shape.email)]}
        >
          <Input
            type="email"
            placeholder={t("users.create.emailPlaceholder")}
            disabled={isPending}
          />
        </Form.Item>
        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            name="first_name"
            label={t("users.create.firstNameLabel")}
            rules={[zodFieldRule(schema.shape.first_name)]}
          >
            <Input disabled={isPending} />
          </Form.Item>
          <Form.Item
            name="last_name"
            label={t("users.create.lastNameLabel")}
            rules={[zodFieldRule(schema.shape.last_name)]}
          >
            <Input disabled={isPending} />
          </Form.Item>
        </div>
        <Form.Item
          name="password"
          label={t("users.create.passwordLabel")}
          rules={[zodFieldRule(schema.shape.password)]}
        >
          <Input.Password
            placeholder={t("users.create.passwordPlaceholder")}
            disabled={isPending}
            autoComplete="new-password"
          />
        </Form.Item>
        {canPickDealership ? (
          <Form.Item name="dealership_id" label={t("users.create.dealershipLabel")}>
            <Select
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              loading={dealerships.isLoading}
              disabled={isPending}
              placeholder={t("users.create.dealershipPlaceholder")}
              options={(dealerships.data?.items ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>
        ) : null}
        {canPickRoles && defaultRoleId ? (
          <Form.Item
            name="role_ids"
            // Field-level: the roles list loads after the form mounts.
            initialValue={[defaultRoleId]}
            label={t("users.create.rolesLabel")}
            extra={t("users.create.rolesHint")}
            rules={[
              {
                validator: (_rule, value: string[] | undefined) =>
                  (value ?? []).some(isUserRole)
                    ? Promise.resolve()
                    : Promise.reject(new Error(t("users.create.rolesRequired"))),
              },
            ]}
          >
            <Select
              mode="multiple"
              disabled={isPending}
              showSearch={{ optionFilterProp: "label" }}
              options={roleList.map((role) => ({
                value: role.id,
                label: role.name,
                disabled: role.audience === RbacAudience.Admin && !canGrantAdmin,
                title:
                  role.audience === RbacAudience.Admin && !canGrantAdmin
                    ? t("users.create.adminRoleForbidden")
                    : undefined,
                audience: role.audience,
              }))}
              optionRender={(option) => (
                <span className="flex items-center gap-2">
                  {option.label}
                  <AudienceBadge audience={option.data.audience} />
                </span>
              )}
            />
          </Form.Item>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={close} disabled={isPending}>
            {t("users.create.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("users.create.submit")}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
