"use client";

import { useState } from "react";

import { Modal, Radio } from "antd";
import { useTranslation } from "react-i18next";

import { ApiErrorNote } from "@/components/admin/rbac/ApiErrorNote";
import { ELEMENT_KEY_PATTERN } from "@/components/admin/rbac/element-key";
import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePermissionSet, useUpdatePermissionSet } from "@/hooks/api/use-rbac";
import type { Permission } from "@/lib/types/permissions";
import { RbacAudience, type PermissionSet } from "@/lib/types/rbac";

import { PermissionMatrix } from "../admins/PermissionMatrix";

interface PermissionSetFormModalProps {
  // null creates a permission set.
  permissionSet: PermissionSet | null;
  open: boolean;
  // True for system sets and for viewers without permission_sets:write.
  readOnly: boolean;
  // Keys the viewer may hand out; ignored in read-only mode, which shows the
  // set's own keys.
  catalog: Permission[];
  // The catalog could not be loaded (or is still loading): the grid would be
  // empty, so saving is blocked rather than sending a set without keys.
  catalogFailed: boolean;
  catalogLoading: boolean;
  onClose: () => void;
}

interface BodyProps extends Omit<PermissionSetFormModalProps, "open"> {
  permissionSet: PermissionSet | null;
}

// Body is a child so `destroyOnHidden` remounts it per open and the form state
// re-initialises from the edited set without a sync effect.
function PermissionSetFormBody({
  permissionSet,
  readOnly,
  catalog,
  catalogFailed,
  catalogLoading,
  onClose,
}: BodyProps) {
  const { t } = useTranslation("admin");
  const create = useCreatePermissionSet();
  const update = useUpdatePermissionSet();
  const mutation = permissionSet ? update : create;

  const [key, setKey] = useState(permissionSet?.key ?? "");
  const [name, setName] = useState(permissionSet?.name ?? "");
  const [description, setDescription] = useState(permissionSet?.description ?? "");
  const [audience, setAudience] = useState<RbacAudience>(
    permissionSet?.audience ?? RbacAudience.User,
  );
  const [permissions, setPermissions] = useState<Permission[]>(permissionSet?.permissions ?? []);

  const keyValid = permissionSet !== null || ELEMENT_KEY_PATTERN.test(key);
  const keyInvalid = permissionSet === null && key !== "" && !keyValid;
  const catalogBlocked = !readOnly && (catalogFailed || catalogLoading);
  const canSubmit =
    !readOnly && !catalogBlocked && keyValid && name.trim().length > 0 && !mutation.isPending;

  // A read-only view lists exactly what the set holds.
  const gridCatalog = readOnly ? (permissionSet?.permissions ?? []) : catalog;

  const submit = () => {
    const trimmedDescription = description.trim() || null;
    if (permissionSet) {
      update.mutate(
        {
          id: permissionSet.id,
          payload: { name: name.trim(), description: trimmedDescription, permissions },
        },
        { onSuccess: onClose },
      );
    } else {
      create.mutate(
        { key, name: name.trim(), description: trimmedDescription, audience, permissions },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="set-key">{t("rbac.fields.key")}</Label>
        <Input
          id="set-key"
          value={key}
          disabled={permissionSet !== null || readOnly}
          status={keyInvalid ? "error" : undefined}
          onChange={(event) => {
            setKey(event.target.value);
          }}
        />
        <p className={keyInvalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {keyInvalid ? t("rbac.validation.keyInvalid") : t("rbac.fields.keyHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="set-name">{t("rbac.fields.name")}</Label>
        <Input
          id="set-name"
          value={name}
          maxLength={100}
          disabled={readOnly}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="set-description">{t("rbac.fields.description")}</Label>
        <Input
          id="set-description"
          value={description}
          maxLength={255}
          disabled={readOnly}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("rbac.audience.label")}</Label>
        <div>
          <Radio.Group
            value={audience}
            disabled={permissionSet !== null || readOnly}
            onChange={(event) => {
              const next = event.target.value as RbacAudience;
              setAudience(next);
              // The user audience only admits self-service keys: drop the rest.
              if (next === RbacAudience.User) {
                setPermissions((current) => current.filter((p) => p.startsWith("self.")));
              }
            }}
          >
            <Radio value={RbacAudience.User}>{t("rbac.audience.user")}</Radio>
            <Radio value={RbacAudience.Admin}>{t("rbac.audience.admin")}</Radio>
          </Radio.Group>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(`rbac.audienceHint.${audience}` as const)}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>{t("rbac.sets.permissionsLabel")}</Label>
        {!readOnly && catalogFailed ? <PermissionNote text={t("rbac.catalogError")} /> : null}
        <PermissionMatrix
          catalog={gridCatalog}
          value={permissions}
          onChange={setPermissions}
          disabled={readOnly || mutation.isPending}
          audience={audience}
        />
      </div>

      {permissionSet?.is_system ? <PermissionNote text={t("rbac.systemReadOnly")} /> : null}
      <ApiErrorNote error={mutation.error} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          {readOnly ? t("rbac.close") : t("rbac.cancel")}
        </Button>
        {readOnly ? null : (
          <Button type="submit" disabled={!canSubmit}>
            {mutation.isPending
              ? t("rbac.saving")
              : permissionSet
                ? t("rbac.save")
                : t("rbac.create")}
          </Button>
        )}
      </div>
    </form>
  );
}

export function PermissionSetFormModal({
  permissionSet,
  open,
  readOnly,
  catalog,
  catalogFailed,
  catalogLoading,
  onClose,
}: PermissionSetFormModalProps) {
  const { t } = useTranslation("admin");
  const title = !permissionSet
    ? t("rbac.sets.createTitle")
    : readOnly
      ? t("rbac.sets.viewTitle", { name: permissionSet.name })
      : t("rbac.sets.editTitle", { name: permissionSet.name });
  return (
    <Modal
      open={open}
      title={title}
      centered
      footer={null}
      width={640}
      destroyOnHidden
      onCancel={onClose}
    >
      <PermissionSetFormBody
        permissionSet={permissionSet}
        readOnly={readOnly}
        catalog={catalog}
        catalogFailed={catalogFailed}
        catalogLoading={catalogLoading}
        onClose={onClose}
      />
    </Modal>
  );
}
