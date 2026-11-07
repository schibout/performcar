"use client";

import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { SystemSettingsForm } from "@/components/admin/system-settings/SystemSettingsForm";
import { useSystemSettings, useUpdateSystemSetting } from "@/hooks/api/use-system-settings";
import { useCanReadSystemSettings, useCanWriteSystemSettings } from "@/hooks/use-permissions";
import type { SettingValue } from "@/lib/types/system-settings";

import { AdminForbidden } from "../AdminForbidden";

export function SystemSettingsContent() {
  const { t } = useTranslation("systemSettings");
  const canRead = useCanReadSystemSettings();
  const canWrite = useCanWriteSystemSettings();
  const { data, isLoading } = useSystemSettings(canRead);
  const update = useUpdateSystemSetting();

  const settings = useMemo(() => data?.data ?? [], [data]);
  // Draft holds ONLY the keys the admin has edited; everything else falls back to
  // the server value at render time. Keeping the server state out of local state
  // avoids mirroring it via an effect (no cascading renders).
  const [draft, setDraft] = useState<Record<string, SettingValue>>({});

  const dirtyKeys = settings
    .filter((s) => s.key in draft && draft[s.key] !== s.value)
    .map((s) => s.key);

  const setField = (key: string, value: SettingValue) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  // PATCH only the changed keys, then drop the draft so the refetched server
  // values become the source of truth again. Toasts come from the interceptor.
  const onSave = async () => {
    try {
      await Promise.all(dirtyKeys.map((key) => update.mutateAsync({ key, value: draft[key] })));
      setDraft({});
    } catch {
      // Failures already surface as toasts via the axios interceptor; keep the
      // draft so the admin can retry without re-entering their changes.
    }
  };

  // The logo persists immediately after upload: the file is already stored on
  // Cloudinary + the files table, so we PATCH logo_url straight away rather than
  // staging it in the draft for a separate save. Invalidation refreshes branding.
  const onLogoSave = (url: string) => {
    update.mutate({ key: "logo_url", value: url });
  };

  if (!canRead) return <AdminForbidden />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SystemSettingsForm
        settings={settings}
        loading={isLoading}
        draft={draft}
        onChange={setField}
        onLogoSave={onLogoSave}
        canWrite={canWrite}
        dirty={dirtyKeys.length > 0}
        saving={update.isPending}
        onSave={onSave}
      />
    </div>
  );
}
