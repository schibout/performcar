"use client";

import { Select } from "antd";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/types/support";

import {
  isTicketPriorityFilter,
  isTicketStatusFilter,
  type TicketPriorityFilter,
  type TicketStatusFilter,
} from "./support-tickets-filters-config";

interface SupportTicketsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: TicketStatusFilter;
  onStatusChange: (value: TicketStatusFilter) => void;
  priority: TicketPriorityFilter;
  onPriorityChange: (value: TicketPriorityFilter) => void;
  onReset: () => void;
  hasFilters: boolean;
}

export function SupportTicketsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  onReset,
  hasFilters,
}: SupportTicketsFiltersProps) {
  const { t } = useTranslation("support");

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center">
        <div className="w-full md:flex-1 md:min-w-50">
          <Input
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
            placeholder={t("admin.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:contents">
          <Select<string>
            value={status}
            aria-label={t("admin.filters.status")}
            className="w-full md:w-fit md:min-w-35"
            onChange={(value) => {
              if (isTicketStatusFilter(value)) onStatusChange(value);
            }}
            options={[
              { value: "all", label: t("admin.filters.all") },
              ...TICKET_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
            ]}
          />
          <Select<string>
            value={priority}
            aria-label={t("admin.filters.priority")}
            className="w-full md:w-fit md:min-w-35"
            onChange={(value) => {
              if (isTicketPriorityFilter(value)) onPriorityChange(value);
            }}
            options={[
              { value: "all", label: t("admin.filters.all") },
              ...TICKET_PRIORITIES.map((value) => ({ value, label: t(`priority.${value}`) })),
            ]}
          />
          {hasFilters ? (
            <Button variant="ghost" onClick={onReset} className="w-full md:w-auto">
              <X className="h-4 w-4" />
              {t("admin.filters.reset")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
