"use client";

import { Input, InputNumber, Select, Spin, Switch } from "antd";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { AvatarUpload } from "@/components/common/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCanUploadOwnFiles } from "@/hooks/use-permissions";
import { FILE_CATEGORY } from "@/lib/types/file";
import type { SettingCategory, SettingRead, SettingValue } from "@/lib/types/system-settings";

// Render order for the category cards (matches the backend registry grouping).
const CATEGORY_ORDER: SettingCategory[] = ["system", "auth", "uploads", "support", "branding"];

interface SystemSettingsFormProps {
  settings: SettingRead[];
  loading: boolean;
  draft: Record<string, SettingValue>;
  onChange: (key: string, value: SettingValue) => void;
  // Logo persists immediately on upload (separate from the draft/Save flow).
  onLogoSave: (url: string) => void;
  canWrite: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}

export function SystemSettingsForm({
  settings,
  loading,
  draft,
  onChange,
  onLogoSave,
  canWrite,
  dirty,
  saving,
  onSave,
}: SystemSettingsFormProps) {
  const { t } = useTranslation("systemSettings");
  const canUpload = useCanUploadOwnFiles();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spin size="small" />
        {t("loading")}
      </div>
    );
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: settings.filter((s) => s.category === category),
  })).filter((group) => group.items.length > 0);

  const renderControl = (setting: SettingRead) => {
    const value = draft[setting.key] ?? setting.value;
    const disabled = !canWrite;

    if (setting.key === "logo_url") {
      const url = typeof value === "string" ? value : "";
      return (
        <div className="space-y-3">
          <AvatarUpload
            value={url ? { url } : null}
            onChange={(file) => {
              onLogoSave(file?.url ?? "");
            }}
            category={FILE_CATEGORY.BRANDING_LOGO}
            shape="square"
            fit="contain"
            disabled={disabled || !canUpload}
            removeDisabled={disabled}
          />
          {canWrite && !canUpload ? (
            <PermissionNote text={t("fields.logo_url.uploadRestricted")} />
          ) : null}
        </div>
      );
    }
    if (setting.key === "default_locale") {
      return (
        <Select
          value={String(value)}
          onChange={(next) => {
            onChange(setting.key, next);
          }}
          disabled={disabled}
          className="w-48"
          options={[
            { value: "fr", label: t("locales.fr") },
            { value: "en", label: t("locales.en") },
          ]}
        />
      );
    }
    if (setting.value_type === "bool") {
      return (
        <Switch
          checked={Boolean(value)}
          onChange={(checked) => {
            onChange(setting.key, checked);
          }}
          disabled={disabled}
        />
      );
    }
    if (setting.value_type === "int") {
      return (
        <InputNumber
          value={typeof value === "number" ? value : Number(value)}
          onChange={(next) => {
            onChange(setting.key, next ?? 0);
          }}
          disabled={disabled}
          className="w-48"
        />
      );
    }
    return (
      <Input
        value={String(value)}
        onChange={(event) => {
          onChange(setting.key, event.target.value);
        }}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.category}>
          <CardHeader>
            <CardTitle>{t(`categories.${group.category}`)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.items.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <div>
                  <p className="text-sm font-medium">
                    {t(`fields.${setting.key}.label`, { defaultValue: setting.key })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`fields.${setting.key}.description`, {
                      defaultValue: setting.description,
                    })}
                  </p>
                </div>
                {renderControl(setting)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {canWrite && (
        <div className="flex items-center gap-3">
          <Button onClick={onSave} disabled={!dirty || saving}>
            {saving ? t("saving") : t("save")}
          </Button>
          {!dirty && <span className="text-xs text-muted-foreground">{t("noChanges")}</span>}
        </div>
      )}
    </div>
  );
}
