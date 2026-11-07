"use client";

import { useMemo, useState } from "react";

import { Select } from "antd";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCustomers, useDealerships, useDeleteCustomer } from "@/hooks/api/use-quotes";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/format-date";
import { Permission } from "@/lib/types/permissions";
import type { Customer, QuoteScope } from "@/lib/types/quote";

import { CustomerFormModal } from "./CustomerFormModal";
import { customerName } from "./quote-format";

const KEYS: Record<QuoteScope, { create?: Permission; write: Permission; remove: Permission }> = {
  self: {
    create: Permission.SelfCustomersCreate,
    write: Permission.SelfCustomersWrite,
    remove: Permission.SelfCustomersDelete,
  },
  // Customers are created with their quotes or by dealers, never from the panel.
  admin: { write: Permission.CustomersWrite, remove: Permission.CustomersDelete },
};

export function CustomersView({ scope }: { scope: QuoteScope }) {
  const { t } = useTranslation("quotes");
  const { has } = usePermissions();
  const keys = KEYS[scope];
  const canCreate = keys.create ? has(keys.create) : false;
  const canWrite = has(keys.write);
  const canDelete = has(keys.remove);

  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [dealershipId, setDealershipId] = useState<string | undefined>();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const debounced = useDebounce(search, 300);
  const dealerships = useDealerships(scope === "admin");
  const deleteCustomer = useDeleteCustomer(scope);

  const params = useMemo(
    () => ({
      search: debounced.trim() || undefined,
      skip,
      limit: pageSize,
      dealership_id: dealershipId,
    }),
    [debounced, skip, pageSize, dealershipId],
  );
  const { data, isLoading, isFetching } = useCustomers(scope, params);
  const dealershipName = (id: string | null) =>
    dealerships.data?.items.find((item) => item.id === id)?.name ?? "—";

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSkip(0);
              }}
              placeholder={t("customers.searchPlaceholder")}
              aria-label={t("customers.searchPlaceholder")}
              maxLength={100}
              className="pl-9"
            />
          </div>
          {scope === "admin" && dealerships.data ? (
            <Select
              allowClear
              className="w-full sm:w-56"
              placeholder={t("admin.allDealerships")}
              value={dealershipId}
              options={dealerships.data.items.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(value?: string) => {
                setDealershipId(value);
                setSkip(0);
              }}
            />
          ) : null}
          {canCreate ? (
            <Button
              className="sm:ml-auto"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("customers.create")}
            </Button>
          ) : null}
        </div>
        <AdminTable>
          <AdminThead>
            <AdminTh>{t("customers.columns.name")}</AdminTh>
            <AdminTh>{t("customers.columns.contact")}</AdminTh>
            {scope === "admin" ? <AdminTh>{t("history.columns.dealership")}</AdminTh> : null}
            <AdminTh>{t("customers.columns.quotes")}</AdminTh>
            <AdminTh>{t("customers.columns.created")}</AdminTh>
            <AdminTh className="text-right">{t("history.columns.actions")}</AdminTh>
          </AdminThead>
          <AdminTbody>
            {!data || data.items.length === 0 ? (
              <AdminTableStateRow
                colSpan={scope === "admin" ? 6 : 5}
                isLoading={isLoading}
                loadingLabel={t("customers.loading")}
                emptyLabel={t("customers.empty")}
              />
            ) : (
              data.items.map((customer) => (
                <AdminTr key={customer.id}>
                  <AdminTd className="font-medium">{customerName(customer)}</AdminTd>
                  <AdminTd>
                    <div>{customer.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{customer.phone ?? ""}</div>
                  </AdminTd>
                  {scope === "admin" ? (
                    <AdminTd>{dealershipName(customer.dealership_id)}</AdminTd>
                  ) : null}
                  <AdminTd className="tabular-nums">{customer.quote_count}</AdminTd>
                  <AdminTd className="whitespace-nowrap">{formatDate(customer.created_at)}</AdminTd>
                  <AdminTd className="text-right">
                    <div className="flex justify-end gap-1">
                      {canWrite ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("customers.edit")}
                          onClick={() => {
                            setEditing(customer);
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
                          aria-label={t("customers.delete")}
                          disabled={customer.quote_count > 0}
                          title={customer.quote_count > 0 ? t("customers.hasQuotes") : undefined}
                          onClick={() => {
                            setDeleting(customer);
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
        {data ? (
          <div className="px-4 pb-4" aria-live="polite" aria-busy={isFetching ? "true" : "false"}>
            <AdminPagination
              total={data.total}
              skip={skip}
              limit={pageSize}
              onChange={setSkip}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setSkip(0);
              }}
            />
          </div>
        ) : null}
      </CardContent>
      <CustomerFormModal
        scope={scope}
        open={formOpen}
        customer={editing}
        onClose={() => {
          setFormOpen(false);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("customers.deleteTitle")}
        description={t("customers.deleteDescription", {
          name: deleting ? customerName(deleting) : "",
        })}
        confirmLabel={t("customers.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        isLoading={deleteCustomer.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteCustomer.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
            },
          });
        }}
      />
    </Card>
  );
}
