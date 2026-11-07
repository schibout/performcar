"use client";

import { Form } from "antd";
import { User, Briefcase, Mail, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getNameSchema } from "@/schemas/auth";
import { type User as UserType } from "@/stores/auth.store";

import type { TFunction } from "i18next";

interface ProfileFormFieldsProps {
  isEditing: boolean;
  isLoading: boolean;
  t: TFunction;
  user: UserType;
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
  hint?: string;
}

// Read-mode display row: icon chip + label + value, instead of a form full of
// disabled inputs.
const InfoRow = ({ icon: Icon, label, value, hint }: InfoRowProps) => (
  <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
      {hint ? <p className="text-xs italic text-muted-foreground">{hint}</p> : null}
    </div>
  </div>
);

export const ProfileFormFields = ({ isEditing, isLoading, t, user }: ProfileFormFieldsProps) => {
  const { t: tv } = useTranslation("validation");
  const nameRule = zodFieldRule(getNameSchema(tv));
  const userIcon = <User className="h-4 w-4 text-muted-foreground" />;

  // Read mode: a clean summary. The antd Form stays mounted around us, and
  // Form.Item values are preserved on unmount (antd's default), so toggling
  // back into edit mode restores the last state.
  if (!isEditing) {
    return (
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <InfoRow icon={User} label={t("info.firstName")} value={user?.first_name} />
        <InfoRow icon={User} label={t("info.lastName")} value={user?.last_name} />
        <InfoRow icon={Briefcase} label={t("info.titleLabel")} value={user?.title} />
        <InfoRow
          icon={Mail}
          label={t("info.email")}
          value={user?.email}
          hint={t("info.emailNotice")}
        />
      </CardContent>
    );
  }

  return (
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item name="first_name" label={t("info.firstName")} rules={[nameRule]}>
          <Input placeholder="John" prefix={userIcon} disabled={isLoading} />
        </Form.Item>
        <Form.Item name="last_name" label={t("info.lastName")} rules={[nameRule]}>
          <Input placeholder="Doe" prefix={userIcon} disabled={isLoading} />
        </Form.Item>
      </div>

      <Form.Item name="title" label={t("info.titleLabel")}>
        <Input
          placeholder="Software Engineer"
          prefix={<Briefcase className="h-4 w-4 text-muted-foreground" />}
          disabled={isLoading}
        />
      </Form.Item>

      <div className="space-y-2">
        <Label htmlFor="email">{t("info.email")}</Label>
        <Input
          id="email"
          name="email"
          value={user?.email || ""}
          prefix={<Mail className="h-4 w-4 text-muted-foreground" />}
          className="opacity-60"
          readOnly
          disabled
        />
        <p className="text-xs text-muted-foreground italic">{t("info.emailNotice")}</p>
      </div>
    </CardContent>
  );
};
