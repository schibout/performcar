"use client";

import { useEffect, useState } from "react";

import { Form, Modal } from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  AdminTable,
  AdminTableStateRow,
  AdminTbody,
  AdminTd,
  AdminTh,
  AdminThead,
  AdminTr,
} from "@/components/admin/shared/AdminTable";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDealerships, useDeleteDealership, useSaveDealership } from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";
import { Permission } from "@/lib/types/permissions";
import type { DealershipListItem } from "@/lib/types/quote";

import { dealershipToValues, valuesToPayload, type DealershipFormValues } from "../dealership-form";
import { DealershipFields } from "../DealershipFields";

export function DealershipsAdminView() {
  const { t } = useTranslation("quotes");
  const { has } = usePermissions();
  const canWrite = has(Permission.DealershipsWrite);
  const canDelete = has(Permission.DealershipsDelete);
  const { data, isLoading } = useDealerships();
  const save = useSaveDealership();
  const remove = useDeleteDealership();
  const [form] = Form.useForm<DealershipFormValues>();
  const [editing, setEditing] = useState<DealershipListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<DealershipListItem | null>(null);

  useEffect(() => {
    if (formOpen) form.setFieldsValue(dealershipToValues(editing));
  }, [formOpen, editing, form]);

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="p-0">
        {canWrite ? (
          <div className="flex justify-end border-b p-4">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("dealership.create")}
            </Button>
          </div>
        ) : null}
        <AdminTable>
          <AdminThead>
            <AdminTh>{t("dealership.fields.name")}</AdminTh>
            <AdminTh>{t("dealership.columns.contact")}</AdminTh>
            <AdminTh>{t("dealership.columns.users")}</AdminTh>
            <AdminTh>{t("dealership.columns.quotes")}</AdminTh>
            <AdminTh className="text-right">{t("history.columns.actions")}</AdminTh>
          </AdminThead>
          <AdminTbody>
            {!data || data.items.length === 0 ? (
              <AdminTableStateRow
                colSpan={5}
                isLoading={isLoading}
                loadingLabel={t("dealership.loading")}
                emptyLabel={t("dealership.empty")}
              />
            ) : (
              data.items.map((item) => (
                <AdminTr key={item.id}>
                  <AdminTd>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.address ?? ""}</div>
                  </AdminTd>
                  <AdminTd>
                    <div>{item.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{item.phone ?? ""}</div>
                  </AdminTd>
                  <AdminTd className="tabular-nums">{item.user_count}</AdminTd>
                  <AdminTd className="tabular-nums">{item.quote_count}</AdminTd>
                  <AdminTd className="text-right">
                    <div className="flex justify-end gap-1">
                      {canWrite ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("dealership.edit")}
                          onClick={() => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("dealership.delete")}
                          disabled={item.quote_count > 0}
                          title={item.quote_count > 0 ? t("dealership.hasQuotes") : undefined}
                          onClick={() => {
                            setDeleting(item);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </AdminTd>
                </AdminTr>
              ))
            )}
          </AdminTbody>
        </AdminTable>
      </CardContent>
      <Modal
        open={formOpen}
        title={editing ? t("dealership.editTitle") : t("dealership.createTitle")}
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => {
          if (!save.isPending) setFormOpen(false);
        }}
      >
        <Form<DealershipFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          className="mt-4"
          onFinish={(values) => {
            save.mutate(
              { id: editing?.id, payload: valuesToPayload(values) },
              {
                onSuccess: () => {
                  toast.success(t("dealership.saved"));
                  setFormOpen(false);
                },
              },
            );
          }}
        >
          <DealershipFields disabled={save.isPending} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => {
                setFormOpen(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </Form>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("dealership.deleteTitle")}
        description={t("dealership.deleteDescription", { name: deleting?.name ?? "" })}
        confirmLabel={t("dealership.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
            },
          });
        }}
      />
    </Card>
  );
}
