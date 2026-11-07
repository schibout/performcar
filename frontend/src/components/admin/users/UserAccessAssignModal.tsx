"use client";

import { useState } from "react";

import { Modal } from "antd";
import { useTranslation } from "react-i18next";

import { ApiErrorNote } from "@/components/admin/rbac/ApiErrorNote";
import { AudienceBadge } from "@/components/admin/rbac/AudienceBadge";
import { TierWarning } from "@/components/admin/users/TierWarning";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetUserPermissionSets, useSetUserRoles } from "@/hooks/api/use-rbac";
import {
  RbacAudience,
  hasActiveAdminAssignment,
  type Assignment,
  type AssignmentItem,
  type UserAccess,
} from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";

export type AssignKind = "roles" | "sets";

// What can be assigned: roles and permission sets share this shape.
export interface AssignOption {
  id: string;
  key: string;
  name: string;
  audience: RbacAudience;
}

interface AssignModalProps {
  kind: AssignKind;
  open: boolean;
  userId: string;
  userEmail: string;
  access: UserAccess;
  options: AssignOption[];
  // False when the viewer lacks admins:write: assigning an admin role or set to
  // a plain user would promote it, which the API refuses.
  canAssignAdminAudience: boolean;
  onClose: () => void;
}

interface Row {
  selected: boolean;
  // `datetime-local` value (local time, minute precision); "" means no expiry.
  expires: string;
  // The end date as the API sent it, resent verbatim while the input is untouched
  // so an already-passed date the API accepts as unchanged is not rewritten.
  original: string | null;
  initialExpires: string;
}

// Only the options the admin touched have a row.
type Rows = Partial<Record<string, Row>>;

const EMPTY_ROW: Row = { selected: false, expires: "", original: null, initialExpires: "" };

const pad = (n: number) => String(n).padStart(2, "0");

const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toItem = (id: string, row: Row): AssignmentItem => ({
  id,
  expires_at:
    row.expires === ""
      ? null
      : row.expires === row.initialExpires
        ? row.original
        : new Date(row.expires).toISOString(),
});

const buildRows = (current: Assignment[]): Rows => {
  const rows: Rows = {};
  for (const item of current) {
    const local = toLocalInput(item.expires_at);
    rows[item.id] = {
      selected: true,
      expires: local,
      original: item.expires_at,
      initialExpires: local,
    };
  }
  return rows;
};

// Body is a child so `destroyOnHidden` remounts it per open and the rows
// re-initialise from what the account holds without a sync effect.
function AssignBody({
  kind,
  userId,
  access,
  options,
  canAssignAdminAudience,
  onClose,
}: Omit<AssignModalProps, "open">) {
  const { t } = useTranslation("admin");
  const setRoles = useSetUserRoles();
  const setSets = useSetUserPermissionSets();
  const mutation = kind === "roles" ? setRoles : setSets;

  const current = kind === "roles" ? access.roles : access.permission_sets;
  const other = kind === "roles" ? access.permission_sets : access.roles;
  const [rows, setRows] = useState<Rows>(() => buildRows(current));
  // Fixed per open so a term ending while the modal is up does not flicker.
  const [now] = useState(() => Date.now());

  const held = new Set(current.map((item) => item.id));
  // An admin element the viewer cannot assign is hidden unless already held, so
  // it can still be withdrawn.
  const visible = options.filter(
    (option) =>
      held.has(option.id) || canAssignAdminAudience || option.audience !== RbacAudience.Admin,
  );

  const chosen = visible.flatMap((option) => {
    const row = rows[option.id];
    return row?.selected ? [{ option, row }] : [];
  });
  const activeAdminChosen = chosen.some(
    ({ option, row }) =>
      option.audience === RbacAudience.Admin &&
      (row.expires === "" || new Date(row.expires).getTime() > now),
  );

  const promotes = access.account_role === SystemRole.USER && activeAdminChosen;
  const otherKeepsAdminAccess = hasActiveAdminAssignment(other, now);
  const demotes =
    access.account_role === SystemRole.ADMIN &&
    !activeAdminChosen &&
    !otherKeepsAdminAccess &&
    access.direct_permissions.length === 0;

  // An account must keep a permanent user role: the API refuses anything else.
  const keepsUserRole =
    kind !== "roles" ||
    chosen.some(({ option, row }) => option.audience === RbacAudience.User && row.expires === "");

  const update = (id: string, patch: Partial<Row>) => {
    setRows((previous) => ({
      ...previous,
      [id]: { ...EMPTY_ROW, ...previous[id], ...patch },
    }));
  };

  const submit = () => {
    const assignments = chosen.map(({ option, row }) => toItem(option.id, row));
    mutation.mutate({ userId, payload: { assignments } }, { onSuccess: onClose });
  };

  return (
    <div className="space-y-4">
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rbac.access.assign.noOptions")}</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {visible.map((option) => {
            const row = rows[option.id];
            const selected = row?.selected ?? false;
            const expired = held.has(option.id)
              ? (current.find((item) => item.id === option.id)?.expired ?? false)
              : false;
            return (
              <li key={option.id} className="rounded-lg border bg-muted/30 p-3">
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={selected}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) => {
                      update(option.id, { selected: checked });
                    }}
                  />
                  <span className="font-medium">{option.name}</span>
                  <span className="text-xs text-muted-foreground">{option.key}</span>
                  <AudienceBadge audience={option.audience} />
                  {expired ? (
                    <span className="text-xs text-destructive">
                      {t("rbac.access.assign.expiredBadge")}
                    </span>
                  ) : null}
                </Label>
                {selected ? (
                  <div className="mt-2 space-y-1 ps-6">
                    <Label htmlFor={`expires-${option.id}`} className="text-xs font-normal">
                      {t("rbac.access.assign.expiresLabel")} · {option.name}
                    </Label>
                    <Input
                      id={`expires-${option.id}`}
                      type="datetime-local"
                      value={row?.expires ?? ""}
                      disabled={mutation.isPending}
                      onChange={(event) => {
                        update(option.id, { expires: event.target.value });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("rbac.access.assign.expiresHint")}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {promotes ? (
        <TierWarning text={t("rbac.access.assign.promoteWarning")} testId="promote" />
      ) : null}
      {demotes ? (
        <TierWarning text={t("rbac.access.assign.demoteWarning")} testId="demote" />
      ) : null}
      {keepsUserRole ? null : (
        <p role="alert" className="text-sm text-destructive">
          {t("rbac.access.assign.userRoleRequired")}
        </p>
      )}
      <ApiErrorNote error={mutation.error} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          {t("rbac.cancel")}
        </Button>
        <Button disabled={mutation.isPending || !keepsUserRole} onClick={submit}>
          {mutation.isPending ? t("rbac.saving") : t("rbac.access.assign.save")}
        </Button>
      </div>
    </div>
  );
}

export function UserAccessAssignModal(props: AssignModalProps) {
  const { t } = useTranslation("admin");
  const { open, kind, userEmail, onClose } = props;
  return (
    <Modal
      open={open}
      title={t(
        kind === "roles" ? "rbac.access.assign.rolesTitle" : "rbac.access.assign.setsTitle",
        {
          email: userEmail,
        },
      )}
      centered
      footer={null}
      width={560}
      destroyOnHidden
      onCancel={onClose}
    >
      <AssignBody {...props} />
    </Modal>
  );
}
