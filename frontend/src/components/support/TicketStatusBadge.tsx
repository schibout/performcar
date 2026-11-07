"use client";

import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import type { TicketPriority, TicketStatus } from "@/lib/types/support";

// `as const` keeps the values as literal tones so they satisfy StatusBadge's
// `tone` prop without re-exporting its private union.
// Distinct, intuitive colours per state: open = green (active), pending = amber
// (waiting), answered = sky (info), closed = red (done/locked).
const STATUS_TONE = {
  open: "success",
  pending: "warning",
  answered: "info",
  closed: "danger",
} as const;

// Priority escalates on its own palette: low = grey, normal = brand, high = red.
const PRIORITY_TONE = {
  low: "muted",
  normal: "primary",
  high: "danger",
} as const;

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const { t } = useTranslation("support");
  return <StatusBadge tone={STATUS_TONE[status]}>{t(`status.${status}`)}</StatusBadge>;
}

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  const { t } = useTranslation("support");
  return <StatusBadge tone={PRIORITY_TONE[priority]}>{t(`priority.${priority}`)}</StatusBadge>;
}
