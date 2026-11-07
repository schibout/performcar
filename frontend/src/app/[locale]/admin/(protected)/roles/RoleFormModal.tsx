"use client";

import { useState } from "react";

import { Modal, Radio } from "antd";
import { useTranslation } from "react-i18next";

import { ApiErrorNote } from "@/components/admin/rbac/ApiErrorNote";
import { ELEMENT_KEY_PATTERN } from "@/components/admin/rbac/element-key";
import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRole, useUpdateRole } from "@/hooks/api/use-rbac";
import { RbacAudience, type PermissionSet, type Role } from "@/lib/types/rbac";

interface RoleFormModalProps {
  // null creates a role.
  role: Role | null;
  open: boolean;
  // True for system roles and for viewers without roles:write.
  readOnly: boolean;
  // Undefined when the viewer cannot read permission sets.
  permissionSets: PermissionSet[] | undefined;
  // The sets are still loading: saving now would send an empty selection.
  setsLoading: boolean;
  onClose: () => void;
}

interface RoleFormBodyProps extends Omit<RoleFormModalProps, "open"> {
  role: Role | null;
}

// Body is a child so `destroyOnHidden` remounts it per open and the form state
// re-initialises from the edited role without a sync effect.
function RoleFormBody({ role, readOnly, permissionSets, setsLoading, onClose }: RoleFormBodyProps) {
  const { t } = useTranslation("admin");
  const create = useCreateRole();
  const update = useUpdateRole();
  const mutation = role ? update : create;

  const [key, setKey] = useState(role?.key ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [audience, setAudience] = useState<RbacAudience>(role?.audience ?? RbacAudience.User);
  const [setIds, setSetIds] = useState<string[]>(role?.permission_sets.map((s) => s.id) ?? []);

  const keyValid = role !== null || ELEMENT_KEY_PATTERN.test(key);
  const nameValid = name.trim().length > 0;
  const canSubmit = !readOnly && keyValid && nameValid && !setsLoading && !mutation.isPending;
  const keyInvalid = role === null && key !== "" && !keyValid;

  // A role only includes sets of its own audience.
  const available = (permissionSets ?? []).filter((set) => set.audience === audience);
  const selected = new Set(setIds);

  const toggleSet = (id: string, checked: boolean) => {
    const next = new Set(setIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSetIds([...next]);
  };

  const submit = () => {
    const trimmedDescription = description.trim() || null;
    if (role) {
      update.mutate(
        {
          id: role.id,
          payload: {
            name: name.trim(),
            description: trimmedDescription,
            // Without permission_sets:read the list is unknown: leave it unchanged.
            ...(permissionSets ? { permission_set_ids: setIds } : {}),
          },
        },
        { onSuccess: onClose },
      );
    } else {
      create.mutate(
        {
          key,
          name: name.trim(),
          description: trimmedDescription,
          audience,
          permission_set_ids: setIds,
        },
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
        <Label htmlFor="role-key">{t("rbac.fields.key")}</Label>
        <Input
          id="role-key"
          value={key}
          disabled={role !== null || readOnly}
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
        <Label htmlFor="role-name">{t("rbac.fields.name")}</Label>
        <Input
          id="role-name"
          value={name}
          maxLength={100}
          disabled={readOnly}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-description">{t("rbac.fields.description")}</Label>
        <Input
          id="role-description"
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
            disabled={role !== null || readOnly}
            onChange={(event) => {
              setAudience(event.target.value as RbacAudience);
              // Sets of the other audience would be refused.
              setSetIds([]);
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
        <Label>{t("rbac.roles.setsLabel")}</Label>
        {setsLoading ? (
          <p className="text-sm text-muted-foreground">{t("rbac.roles.loading")}</p>
        ) : permissionSets === undefined ? (
          <PermissionNote />
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("rbac.roles.noSetsAvailable")}</p>
        ) : (
          <div className="grid gap-1 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            {available.map((set) => (
              <Label
                key={set.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal hover:bg-background"
              >
                <Checkbox
                  checked={selected.has(set.id)}
                  disabled={readOnly}
                  onCheckedChange={(checked) => {
                    toggleSet(set.id, checked);
                  }}
                />
                {set.name}
              </Label>
            ))}
          </div>
        )}
      </div>

      {role?.is_system ? <PermissionNote text={t("rbac.systemReadOnly")} /> : null}
      <ApiErrorNote error={mutation.error} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          {readOnly ? t("rbac.close") : t("rbac.cancel")}
        </Button>
        {readOnly ? null : (
          <Button type="submit" disabled={!canSubmit}>
            {mutation.isPending ? t("rbac.saving") : role ? t("rbac.save") : t("rbac.create")}
          </Button>
        )}
      </div>
    </form>
  );
}

export function RoleFormModal({
  role,
  open,
  readOnly,
  permissionSets,
  setsLoading,
  onClose,
}: RoleFormModalProps) {
  const { t } = useTranslation("admin");
  const title = !role
    ? t("rbac.roles.createTitle")
    : readOnly
      ? t("rbac.roles.viewTitle", { name: role.name })
      : t("rbac.roles.editTitle", { name: role.name });
  return (
    <Modal
      open={open}
      title={title}
      centered
      footer={null}
      width={560}
      destroyOnHidden
      onCancel={onClose}
    >
      <RoleFormBody
        role={role}
        readOnly={readOnly}
        permissionSets={permissionSets}
        setsLoading={setsLoading}
        onClose={onClose}
      />
    </Modal>
  );
}
