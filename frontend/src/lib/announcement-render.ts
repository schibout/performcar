import { formatDateTime } from "@/lib/format-date";
import type { AnnouncementLanguage, AnnouncementVariableValue } from "@/lib/types/announcement";

import type { TFunction } from "i18next";

// SYNC NOTE: in-app template text comes from FE i18n (broadcasts.json
// `templates.<key>`); the EMAIL text lives in the backend catalog
// (fastapi-template/app/core/broadcast_templates.py). When a template changes,
// update BOTH and keep keys + variable names identical.
// See memory: broadcast-template-text-dual-source.

export interface AnnouncementFields {
  kind: string;
  template_key?: string | null;
  variables?: Record<string, AnnouncementVariableValue>;
  translations?: Record<string, { title?: string; body?: string } | undefined>;
}

// Resolve a template's variables for the active language: a datetime value (ISO
// string) is formatted viewer-local; a text value ({fr,en}) picks the language.
const interpolation = (
  lang: AnnouncementLanguage,
  variables: AnnouncementFields["variables"],
): Record<string, string> => {
  const values: Record<string, string> = {};
  for (const [name, raw] of Object.entries(variables ?? {})) {
    if (typeof raw === "string") values[name] = formatDateTime(raw);
    else if (raw) values[name] = raw[lang] ?? raw.en ?? raw.fr ?? "";
  }
  return values;
};

const render = (
  field: "title" | "body",
  t: TFunction,
  lang: AnnouncementLanguage,
  fields: AnnouncementFields,
): string => {
  if (fields.kind === "template" && fields.template_key) {
    return t(
      `broadcasts:templates.${fields.template_key}.${field}`,
      interpolation(lang, fields.variables),
    );
  }
  const tr = fields.translations;
  return tr?.[lang]?.[field] ?? tr?.en?.[field] ?? tr?.fr?.[field] ?? "";
};

export const announcementTitle = (
  t: TFunction,
  lang: AnnouncementLanguage,
  fields: AnnouncementFields,
): string => render("title", t, lang, fields);

export const announcementBody = (
  t: TFunction,
  lang: AnnouncementLanguage,
  fields: AnnouncementFields,
): string => render("body", t, lang, fields);
