"use client";

import { Form, Input, Tabs } from "antd";
import { useTranslation } from "react-i18next";

import type { AnnouncementLanguage, BroadcastTemplate } from "@/lib/types/announcement";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import {
  ANNOUNCEMENT_TITLE_MAX,
  getDatetimeFieldSchema,
  getTextVarSchema,
} from "@/schemas/announcement";

const LANGUAGES: AnnouncementLanguage[] = ["fr", "en"];

interface TemplateVariableFieldsProps {
  template: BroadcastTemplate;
  disabled?: boolean;
}

export function TemplateVariableFields({ template, disabled }: TemplateVariableFieldsProps) {
  const { t } = useTranslation("broadcasts");
  const label = (name: string) => t(`admin.vars.${name}`, { defaultValue: name });
  const datetimeRule = zodFieldRule(getDatetimeFieldSchema(t));
  const textRule = zodFieldRule(getTextVarSchema(t));

  const datetimeVars = template.variables.filter((v) => v.type === "datetime");
  const textVars = template.variables.filter((v) => v.type === "text");

  return (
    <>
      {datetimeVars.map((variable) => (
        <Form.Item
          key={variable.name}
          name={["variables", variable.name]}
          label={label(variable.name)}
          rules={[datetimeRule]}
        >
          {/* datetime-local: Ant-styled wrapper, native value, no dayjs. The
              composer converts the local string to a UTC ISO at submit. */}
          <Input type="datetime-local" disabled={disabled} />
        </Form.Item>
      ))}

      {textVars.length > 0 ? (
        <Tabs
          items={LANGUAGES.map((lang) => ({
            key: lang,
            label: lang.toUpperCase(),
            forceRender: true,
            children: textVars.map((variable) => (
              <Form.Item
                key={variable.name}
                name={["variables", variable.name, lang]}
                label={label(variable.name)}
                rules={[textRule]}
              >
                <Input maxLength={ANNOUNCEMENT_TITLE_MAX} showCount disabled={disabled} />
              </Form.Item>
            )),
          }))}
        />
      ) : null}
    </>
  );
}
