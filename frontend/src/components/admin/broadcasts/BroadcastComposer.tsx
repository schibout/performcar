"use client";

import { Form, Segmented, Select, Switch } from "antd";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { AnnouncementPreview } from "@/components/admin/broadcasts/AnnouncementPreview";
import { CustomLanguageFields } from "@/components/admin/broadcasts/CustomLanguageFields";
import { TemplateVariableFields } from "@/components/admin/broadcasts/TemplateVariableFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBroadcastTemplates, useSendBroadcast } from "@/hooks/api/use-broadcasts";
import { scaleIn } from "@/lib/motion/variants";
import type {
  AnnouncementAudience,
  AnnouncementKind,
  AnnouncementLevel,
  AnnouncementVariableValue,
  BroadcastCreate,
  BroadcastTemplate,
} from "@/lib/types/announcement";
import { SystemRole } from "@/lib/types/user";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getRoleFilterSchema, getTemplateKeySchema } from "@/schemas/announcement";

interface FormValues {
  kind: AnnouncementKind;
  template_key?: string;
  variables?: Record<string, string | Record<string, string>>;
  translations?: Record<string, { title: string; body: string }>;
  level: AnnouncementLevel;
  audience: AnnouncementAudience;
  role_filter?: SystemRole;
  show_banner: boolean;
  send_email: boolean;
}

// datetime variables come from <Input type="datetime-local"> as a local string
// ("2026-06-14T02:00") → store as UTC ISO; text variables are already {tr,en}.
const buildVariables = (
  template: BroadcastTemplate | undefined,
  raw: FormValues["variables"],
): Record<string, AnnouncementVariableValue> => {
  const out: Record<string, AnnouncementVariableValue> = {};
  if (!template || !raw) return out;
  for (const variable of template.variables) {
    const value = raw[variable.name];
    if (value === undefined) continue;
    if (variable.type === "datetime" && typeof value === "string") {
      out[variable.name] = new Date(value).toISOString();
    } else if (variable.type === "text" && typeof value === "object") {
      out[variable.name] = value;
    }
  }
  return out;
};

export function BroadcastComposer() {
  const { t } = useTranslation("broadcasts");
  const [form] = Form.useForm<FormValues>();
  const { data: catalog } = useBroadcastTemplates();
  const { mutate, isPending } = useSendBroadcast();

  const kind: AnnouncementKind = Form.useWatch("kind", form) ?? "custom";
  const templateKey = Form.useWatch("template_key", form);
  const audience: AnnouncementAudience = Form.useWatch("audience", form) ?? "all";
  const level: AnnouncementLevel = Form.useWatch("level", form) ?? "info";
  const variables = Form.useWatch("variables", form);
  const translations = Form.useWatch("translations", form);
  const selectedTemplate = catalog?.templates.find((tpl) => tpl.key === templateKey);

  const onFinish = (values: FormValues) => {
    const payload: BroadcastCreate = {
      kind: values.kind,
      level: values.level,
      audience: values.audience,
      role_filter: values.audience === "role" ? values.role_filter : null,
      show_banner: values.show_banner,
      send_email: values.send_email,
    };
    if (values.kind === "template") {
      payload.template_key = values.template_key;
      payload.variables = buildVariables(selectedTemplate, values.variables);
    } else {
      payload.translations = values.translations;
    }
    mutate(payload, {
      onSuccess: () => {
        form.resetFields();
      },
    });
  };

  const levelOptions = (["info", "warning", "critical"] as const).map((v) => ({
    value: v,
    label: t(`admin.form.level.${v}`),
  }));
  const audienceOptions = (["all", "active", "role"] as const).map((v) => ({
    value: v,
    label: t(`admin.form.audience.${v}`),
  }));
  const roleOptions = [SystemRole.USER, SystemRole.ADMIN, SystemRole.SUPERADMIN].map((r) => ({
    value: r,
    label: r,
  }));

  return (
    <motion.div variants={scaleIn} initial="hidden" animate="visible">
      <Card className="border-border/50 bg-card/60">
        <CardContent>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{
              kind: "custom",
              level: "info",
              audience: "all",
              show_banner: false,
              send_email: false,
            }}
          >
            <Form.Item name="kind" label={t("admin.form.modeLabel")}>
              <Segmented
                options={[
                  { value: "template", label: t("admin.form.modeTemplate") },
                  { value: "custom", label: t("admin.form.modeCustom") },
                ]}
              />
            </Form.Item>

            {kind === "template" ? (
              <>
                <Form.Item
                  name="template_key"
                  label={t("admin.form.templateLabel")}
                  rules={[zodFieldRule(getTemplateKeySchema(t))]}
                >
                  <Select
                    placeholder={t("admin.form.templatePlaceholder")}
                    options={(catalog?.templates ?? []).map((tpl) => ({
                      value: tpl.key,
                      label: t(`templates.${tpl.key}.title`),
                    }))}
                  />
                </Form.Item>
                {selectedTemplate ? (
                  <TemplateVariableFields template={selectedTemplate} disabled={isPending} />
                ) : null}
              </>
            ) : (
              <CustomLanguageFields disabled={isPending} />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="level" label={t("admin.form.levelLabel")}>
                <Select options={levelOptions} />
              </Form.Item>
              <Form.Item name="audience" label={t("admin.form.audienceLabel")}>
                <Select options={audienceOptions} />
              </Form.Item>
            </div>

            {audience === "role" ? (
              <Form.Item
                name="role_filter"
                label={t("admin.form.roleLabel")}
                rules={[zodFieldRule(getRoleFilterSchema(t))]}
              >
                <Select options={roleOptions} />
              </Form.Item>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item
                name="show_banner"
                label={t("admin.form.showBanner")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="send_email"
                label={t("admin.form.sendEmail")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>

            <AnnouncementPreview
              kind={kind}
              level={level}
              template={selectedTemplate}
              variables={variables}
              translations={translations}
            />

            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={isPending}>
                {t("admin.form.submit")}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
