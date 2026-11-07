"use client";

import { useTranslation } from "react-i18next";

import {
  announcementBody,
  announcementTitle,
  type AnnouncementFields,
} from "@/lib/announcement-render";
import type {
  AnnouncementKind,
  AnnouncementLanguage,
  AnnouncementLevel,
  BroadcastTemplate,
} from "@/lib/types/announcement";

interface AnnouncementPreviewProps {
  kind: AnnouncementKind;
  level: AnnouncementLevel;
  template?: BroadcastTemplate;
  variables?: Record<string, string | Record<string, string>>;
  translations?: Record<string, { title?: string; body?: string }>;
}

const LEVEL_ACCENT: Record<AnnouncementLevel, string> = {
  info: "border-l-primary",
  warning: "border-l-yellow-500",
  critical: "border-l-destructive",
};

export function AnnouncementPreview({
  kind,
  level,
  template,
  variables,
  translations,
}: AnnouncementPreviewProps) {
  const { t, i18n } = useTranslation("broadcasts");
  const lang = (i18n.language.split("-")[0] ?? "en") as AnnouncementLanguage;

  const fields: AnnouncementFields = {
    kind,
    template_key: template?.key ?? null,
    variables,
    translations,
  };
  const title = announcementTitle(t, lang, fields);
  const body = announcementBody(t, lang, fields);

  if (!title && !body) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        {t("admin.previewEmpty")}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-l-4 border-border/60 bg-card/60 p-4 ${LEVEL_ACCENT[level]}`}
    >
      <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("admin.previewLabel")}
      </p>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{body}</p>
    </div>
  );
}
