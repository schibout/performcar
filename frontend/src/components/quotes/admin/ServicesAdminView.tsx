"use client";

import { useEffect, useState } from "react";

import { Collapse, Form, Input, InputNumber, Modal, Select, Switch, Tag } from "antd";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCatalogServices,
  useDeleteService,
  useSaveService,
  useVehicleCatalog,
} from "@/hooks/api/use-quotes";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";
import { Permission } from "@/lib/types/permissions";
import type { CatalogService } from "@/lib/types/quote";

import { formatMoney } from "../quote-format";

interface ServiceFormValues {
  name: string;
  price: number;
  category_id: string;
  description?: string;
  active: boolean;
}

function VehicleCatalogCard() {
  const { t } = useTranslation("quotes");
  const { data } = useVehicleCatalog("admin");
  if (!data) return null;
  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("catalog.vehicles")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapse
          size="small"
          items={data.brands.map((brand) => ({
            key: brand.id,
            label: `${brand.name} (${brand.models.length})`,
            children: brand.models.length ? (
              <ul className="space-y-1 text-sm">
                {brand.models.map((model) => (
                  <li key={model.id}>
                    <span className="font-medium">{model.name}</span>
                    {model.versions.length ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {model.versions.map((version) => version.name).join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("catalog.noModels")}</p>
            ),
          }))}
        />
        <div className="flex flex-wrap gap-1">
          {data.colors.map((color) => (
            <Tag key={color.id}>{color.name}</Tag>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ServicesAdminView() {
  const { t } = useTranslation("quotes");
  const canWrite = usePermissions().has(Permission.CatalogWrite);
  const { data, isLoading } = useCatalogServices("admin");
  const save = useSaveService();
  const remove = useDeleteService();
  const [form] = Form.useForm<ServiceFormValues>();
  const [editing, setEditing] = useState<CatalogService | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CatalogService | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    form.setFieldsValue({
      name: editing?.name ?? "",
      price: editing?.price ?? 0,
      category_id: editing?.category.id,
      description: editing?.description ?? "",
      active: editing?.active ?? true,
    });
  }, [formOpen, editing, form]);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("catalog.services")}</CardTitle>
          {canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("catalog.create")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <AdminTable>
            <AdminThead>
              <AdminTh>{t("catalog.columns.name")}</AdminTh>
              <AdminTh>{t("catalog.columns.category")}</AdminTh>
              <AdminTh>{t("catalog.columns.price")}</AdminTh>
              <AdminTh>{t("catalog.columns.status")}</AdminTh>
              <AdminTh className="text-right">{t("history.columns.actions")}</AdminTh>
            </AdminThead>
            <AdminTbody>
              {!data || data.items.length === 0 ? (
                <AdminTableStateRow
                  colSpan={5}
                  isLoading={isLoading}
                  loadingLabel={t("catalog.loading")}
                  emptyLabel={t("catalog.empty")}
                />
              ) : (
                data.items.map((service) => (
                  <AdminTr key={service.id}>
                    <AdminTd>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {service.description ?? ""}
                      </div>
                    </AdminTd>
                    <AdminTd>{service.category.name}</AdminTd>
                    <AdminTd className="tabular-nums">{formatMoney(service.price)}</AdminTd>
                    <AdminTd>
                      <Tag color={service.active ? "green" : "default"}>
                        {service.active ? t("catalog.active") : t("catalog.inactive")}
                      </Tag>
                    </AdminTd>
                    <AdminTd className="text-right">
                      {canWrite ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("catalog.edit")}
                            onClick={() => {
                              setEditing(service);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("catalog.delete")}
                            onClick={() => {
                              setDeleting(service);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </AdminTd>
                  </AdminTr>
                ))
              )}
            </AdminTbody>
          </AdminTable>
        </CardContent>
      </Card>
      <VehicleCatalogCard />
      <Modal
        open={formOpen}
        title={editing ? t("catalog.editTitle") : t("catalog.createTitle")}
        centered
        destroyOnHidden
        footer={null}
        onCancel={() => {
          if (!save.isPending) setFormOpen(false);
        }}
      >
        <Form<ServiceFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          className="mt-4"
          onFinish={(values) => {
            save.mutate(
              {
                id: editing?.id,
                payload: { ...values, description: values.description?.trim() || null },
              },
              {
                onSuccess: () => {
                  toast.success(t("catalog.saved"));
                  setFormOpen(false);
                },
              },
            );
          }}
        >
          <Form.Item
            name="name"
            label={t("catalog.columns.name")}
            rules={[{ required: true, min: 2, max: 100, message: t("catalog.validation.name") }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="category_id"
              label={t("catalog.columns.category")}
              rules={[{ required: true, message: t("catalog.validation.category") }]}
            >
              <Select
                options={(data?.categories ?? []).map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="price"
              label={t("catalog.columns.price")}
              rules={[{ required: true, message: t("catalog.validation.price") }]}
            >
              <InputNumber className="w-full!" min={0} max={99999.99} precision={2} />
            </Form.Item>
          </div>
          <Form.Item name="description" label={t("catalog.description")}>
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
          <Form.Item name="active" label={t("catalog.columns.status")} valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
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
        title={t("catalog.deleteTitle")}
        description={t("catalog.deleteDescription", { name: deleting?.name ?? "" })}
        confirmLabel={t("catalog.delete")}
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
    </div>
  );
}
