"use client";

import { Form, Input, Tabs } from "antd";
import { useTranslation } from "react-i18next";

import type { AnnouncementLanguage } from "@/lib/types/announcement";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  getAnnouncementContentSchema,
} from "@/schemas/announcement";

const LANGUAGES: AnnouncementLanguage[] = ["fr", "en"];

interface CustomLanguageFieldsProps {
  disabled?: boolean;
}

export function CustomLanguageFields({ disabled }: CustomLanguageFieldsProps) {
  const { t } = useTranslation("broadcasts");
  const schema = getAnnouncementContentSchema(t);

  return (
    <Tabs
      items={LANGUAGES.map((lang) => ({
        key: lang,
        label: lang.toUpperCase(),
        // forceRender mounts both language tabs so every language validates on
        // submit even if the admin never opens it (all languages are required).
        forceRender: true,
        children: (
          <>
            <Form.Item
              name={["translations", lang, "title"]}
              label={t("admin.form.titleLabel")}
              rules={[zodFieldRule(schema.shape.title)]}
            >
              <Input maxLength={ANNOUNCEMENT_TITLE_MAX} showCount disabled={disabled} />
            </Form.Item>
            <Form.Item
              name={["translations", lang, "body"]}
              label={t("admin.form.bodyLabel")}
              rules={[zodFieldRule(schema.shape.body)]}
            >
              <Input.TextArea
                rows={4}
                maxLength={ANNOUNCEMENT_BODY_MAX}
                showCount
                disabled={disabled}
              />
            </Form.Item>
          </>
        ),
      }))}
    />
  );
}
