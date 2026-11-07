"use client";

import { Select } from "antd";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  isUsersRoleFilter,
  isUsersStatusFilter,
  isUsersVerifiedFilter,
  type UsersRoleFilter,
  type UsersStatusFilter,
  type UsersVerifiedFilter,
} from "@/components/admin/users/users-filters-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Re-export so existing import sites (e.g. UsersContent) keep working without
// reaching into `users-filters-config` directly. The constants are already
// available via the config module for callers that need the raw tuple/enum.
export type { UsersRoleFilter, UsersStatusFilter, UsersVerifiedFilter };

interface UsersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: UsersRoleFilter;
  onRoleChange: (value: UsersRoleFilter) => void;
  status: UsersStatusFilter;
  onStatusChange: (value: UsersStatusFilter) => void;
  verified: UsersVerifiedFilter;
  onVerifiedChange: (value: UsersVerifiedFilter) => void;
  onReset: () => void;
  hasFilters: boolean;
}

export function UsersFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  verified,
  onVerifiedChange,
  onReset,
  hasFilters,
}: UsersFiltersProps) {
  const { t } = useTranslation("admin");

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center">
        <div className="w-full md:flex-1 md:min-w-50">
          <Input
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
            placeholder={t("users.filters.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:contents">
          <Select<string>
            value={role}
            onChange={(value) => {
              if (isUsersRoleFilter(value)) onRoleChange(value);
            }}
            aria-label={t("users.filters.role")}
            className="w-full md:w-fit md:min-w-35"
            options={[
              { value: "all", label: t("users.filters.roleAny") },
              { value: "superadmin", label: t("users.role.superadmin") },
              { value: "admin", label: t("users.role.admin") },
              { value: "user", label: t("users.role.user") },
            ]}
          />
          <Select<string>
            value={status}
            onChange={(value) => {
              if (isUsersStatusFilter(value)) onStatusChange(value);
            }}
            aria-label={t("users.filters.status")}
            className="w-full md:w-fit md:min-w-35"
            options={[
              { value: "all", label: t("users.filters.statusAny") },
              { value: "active", label: t("users.filters.statusActive") },
              { value: "inactive", label: t("users.filters.statusInactive") },
            ]}
          />
          <Select<string>
            value={verified}
            onChange={(value) => {
              if (isUsersVerifiedFilter(value)) onVerifiedChange(value);
            }}
            aria-label={t("users.filters.verified")}
            className="w-full md:w-fit md:min-w-35"
            options={[
              { value: "all", label: t("users.filters.verifiedAny") },
              { value: "yes", label: t("users.filters.verifiedYes") },
              { value: "no", label: t("users.filters.verifiedNo") },
            ]}
          />
          {hasFilters ? (
            <Button variant="ghost" onClick={onReset} className="w-full md:w-auto">
              <X className="h-4 w-4" />
              {t("users.filters.reset")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
