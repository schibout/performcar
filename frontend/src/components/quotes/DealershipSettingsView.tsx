"use client";

import { useEffect } from "react";

import { Form } from "antd";
import { Building2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyDealership, useUpdateMyDealership } from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";
import { Permission } from "@/lib/types/permissions";

import { dealershipToValues, valuesToPayload, type DealershipFormValues } from "./dealership-form";
import { DealershipFields } from "./DealershipFields";

export function DealershipSettingsView() {
  const { t } = useTranslation("quotes");
  const { isReady, has } = usePermissions();
  const canRead = has(Permission.SelfDealershipRead);
  const canWrite = has(Permission.SelfDealershipWrite);
  const [form] = Form.useForm<DealershipFormValues>();
  const { data, isLoading, isError } = useMyDealership();
  const update = useUpdateMyDealership();

  useEffect(() => {
    if (data) form.setFieldsValue(dealershipToValues(data));
  }, [data, form]);

  if (!isReady || isLoading) return <Skeleton className="h-80 w-full" />;
  if (!canRead) return <PermissionNote text={t("restricted")} />;
  if (isError || !data) {
    return (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">{t("noDealership")}</p>
    );
  }

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5" />
          {t("dealership.title")}
        </CardTitle>
        <CardDescription>{t("dealership.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form<DealershipFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={dealershipToValues(data)}
          onFinish={(values) => {
            update.mutate(valuesToPayload(values), {
              onSuccess: () => {
                toast.success(t("dealership.saved"));
              },
            });
          }}
        >
          <DealershipFields disabled={!canWrite || update.isPending} />
          {canWrite ? (
            <div className="flex justify-end">
              <Button type="submit" loading={update.isPending}>
                {!update.isPending && <Save className="h-4 w-4" />}
                {t("common.save")}
              </Button>
            </div>
          ) : (
            <PermissionNote text={t("dealership.readOnly")} />
          )}
        </Form>
      </CardContent>
    </Card>
  );
}
