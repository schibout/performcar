"use client";

import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Permission } from "@/lib/types/permissions";
import { RbacAudience } from "@/lib/types/rbac";

interface PermissionMatrixProps {
  catalog: Permission[];
  value: Permission[];
  onChange: (next: Permission[]) => void;
  disabled?: boolean;
  // The population the grid is for: `user` offers only the self-service keys a
  // user may hold, `admin` (or none) offers the whole catalog.
  audience?: RbacAudience;
}

interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

// Group "resource:action" keys by their resource, preserving catalog order.
function groupByResource(catalog: Permission[]): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  for (const permission of catalog) {
    const [resource = ""] = permission.split(":");
    const existing = groups.find((group) => group.resource === resource);
    if (existing) existing.permissions.push(permission);
    else groups.push({ resource, permissions: [permission] });
  }
  return groups;
}

const SELF_PREFIX = "self.";

export function PermissionMatrix({
  catalog,
  value,
  onChange,
  disabled,
  audience,
}: PermissionMatrixProps) {
  const { t } = useTranslation("admin");
  const groups = useMemo(
    () =>
      groupByResource(
        audience === RbacAudience.User
          ? catalog.filter((permission) => permission.startsWith(SELF_PREFIX))
          : catalog,
      ),
    [catalog, audience],
  );
  const selected = useMemo(() => new Set(value), [value]);
  const [query, setQuery] = useState("");

  const toggle = (permission: Permission, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(permission);
    else next.delete(permission);
    onChange([...next]);
  };

  const toggleAll = (permissions: Permission[], checked: boolean) => {
    const next = new Set(selected);
    for (const permission of permissions) {
      if (checked) next.add(permission);
      else next.delete(permission);
    }
    onChange([...next]);
  };

  // Search filters by section/resource (users, support, activities, …), not by
  // individual action — a matched section shows all of its actions.
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = groups.filter((group) => {
    if (!normalizedQuery) return true;
    return [group.resource, t(`permissions.resource.${group.resource}`)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div>
      <Input
        type="search"
        value={query}
        placeholder={t("permissions.searchPlaceholder")}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <Separator className="my-4" />
      <div className="space-y-3">
        {visibleGroups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("permissions.noResults")}
          </p>
        ) : (
          visibleGroups.map((group) => {
            const allSelected = group.permissions.every((permission) => selected.has(permission));
            return (
              <div key={group.resource} className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {t(`permissions.resource.${group.resource}`)}
                  </p>
                  <Label className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <Checkbox
                      checked={allSelected}
                      disabled={disabled}
                      onCheckedChange={(checked) => {
                        toggleAll(group.permissions, checked);
                      }}
                    />
                    {t("permissions.selectAll")}
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {group.permissions.map((permission) => {
                    const [, action = ""] = permission.split(":");
                    return (
                      <Label
                        key={permission}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-background"
                      >
                        <Checkbox
                          checked={selected.has(permission)}
                          disabled={disabled}
                          onCheckedChange={(checked) => {
                            toggle(permission, checked);
                          }}
                        />
                        {t(`permissions.action.${action}`)}
                      </Label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
