"use client";

import { useEffect, useMemo, useState } from "react";

import { Form, Select } from "antd";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminUsers } from "@/hooks/api/use-admin";
import { useUpdateAdminTicket } from "@/hooks/api/use-support";
import { useDebounce } from "@/hooks/use-debounce";
import { useCanUpdateSupport, useCanWriteSupport } from "@/hooks/use-permissions";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type AdminTicketDetail,
  type AdminTicketUpdatePayload,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types/support";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

interface ControlsFormValues {
  status: TicketStatus;
  priority: TicketPriority;
  // "" represents unassigned (antd Select can't bind a null value to an option).
  assigned_admin_id: string;
}

// Admins are loaded a page at a time; the dropdown grows the window as the
// admin scrolls (and searches by name/email server-side).
const ADMIN_PAGE_SIZE = 20;

interface TicketAdminControlsProps {
  ticket: AdminTicketDetail;
}

export function TicketAdminControls({ ticket }: TicketAdminControlsProps) {
  const { t } = useTranslation("support");
  const [form] = Form.useForm<ControlsFormValues>();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const { mutate: update, isPending } = useUpdateAdminTicket(ticket.id);
  // status/priority are gated by support:write; (re)assignment by support:update.
  const canWrite = useCanWriteSupport();
  const canAssign = useCanUpdateSupport();

  const [adminSearch, setAdminSearch] = useState("");
  const [adminLimit, setAdminLimit] = useState(ADMIN_PAGE_SIZE);
  const debouncedAdminSearch = useDebounce(adminSearch, 300);
  const { data: admins } = useAdminUsers({
    role: SystemRole.ADMIN,
    search: debouncedAdminSearch.trim() || undefined,
    limit: adminLimit,
  });

  // A new search resets the loaded window back to the first page (done here
  // rather than in an effect to keep the reset paired with the input change).
  const handleAdminSearch = (value: string) => {
    setAdminSearch(value);
    setAdminLimit(ADMIN_PAGE_SIZE);
  };

  // Re-seed the form whenever the ticket's server state changes (e.g. a
  // realtime update or another admin's edit).
  useEffect(() => {
    form.setFieldsValue({
      status: ticket.status,
      priority: ticket.priority,
      assigned_admin_id: ticket.assigned_admin_id ?? "",
    });
  }, [form, ticket.id, ticket.status, ticket.priority, ticket.assigned_admin_id]);

  const loadedAdmins = admins?.data ?? [];
  const hasMoreAdmins = loadedAdmins.length < (admins?.total ?? 0);

  const onAdminScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (hasMoreAdmins && el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
      setAdminLimit((current) => current + ADMIN_PAGE_SIZE);
    }
  };

  const assigneeOptions = useMemo(() => {
    const opts = (admins?.data ?? []).map((admin) => ({ value: admin.id, label: admin.email }));
    // Keep the current assignee visible even when it's outside the loaded page.
    const current = ticket.assigned_admin;
    if (current && !opts.some((o) => o.value === current.id)) {
      opts.unshift({ value: current.id, label: current.email });
    }
    return [{ value: "", label: t("admin.unassigned") }, ...opts];
  }, [admins?.data, ticket.assigned_admin, t]);

  const onFinish = (values: ControlsFormValues) => {
    // Only send fields the admin is permitted to change — otherwise the backend
    // would 403 the whole PATCH (e.g. an unpermitted reassignment).
    const payload: AdminTicketUpdatePayload = {};
    if (canWrite) {
      payload.status = values.status;
      payload.priority = values.priority;
    }
    if (canAssign) {
      payload.assigned_admin_id = values.assigned_admin_id || null;
    }
    update(payload);
  };

  const assignToMe = () => {
    if (!currentUserId) return;
    // Reflect the choice in the form, then persist it immediately (partial
    // PATCH) so the admin doesn't also have to hit "Save changes".
    form.setFieldValue("assigned_admin_id", currentUserId);
    update({ assigned_admin_id: currentUserId });
  };

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("admin.controls.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!canWrite && !canAssign ? (
          <PermissionNote />
        ) : (
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            initialValues={{
              status: ticket.status,
              priority: ticket.priority,
              assigned_admin_id: ticket.assigned_admin_id ?? "",
            }}
          >
            {canWrite ? (
              <>
                <Form.Item name="status" label={t("admin.controls.status")}>
                  <Select
                    options={TICKET_STATUSES.map((value) => ({
                      value,
                      label: t(`status.${value}`),
                    }))}
                  />
                </Form.Item>
                <Form.Item name="priority" label={t("admin.controls.priority")}>
                  <Select
                    options={TICKET_PRIORITIES.map((value) => ({
                      value,
                      label: t(`priority.${value}`),
                    }))}
                  />
                </Form.Item>
              </>
            ) : null}
            {canAssign ? (
              <Form.Item name="assigned_admin_id" label={t("admin.assignee")}>
                <Select
                  showSearch={{ filterOption: false, onSearch: handleAdminSearch }}
                  onPopupScroll={onAdminScroll}
                  options={assigneeOptions}
                />
              </Form.Item>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              {canAssign ? (
                <Button type="button" variant="outline" onClick={assignToMe}>
                  {t("admin.assignToMe")}
                </Button>
              ) : null}
              <Button type="submit" loading={isPending}>
                {t("admin.controls.save")}
              </Button>
            </div>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
