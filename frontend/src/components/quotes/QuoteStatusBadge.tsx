"use client";

import { Tag } from "antd";
import { useTranslation } from "react-i18next";

import type { QuoteStatus } from "@/lib/types/quote";

import { STATUS_COLORS } from "./quote-format";

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { t } = useTranslation("quotes");
  return (
    <Tag color={STATUS_COLORS[status]} className="m-0!">
      {t(`status.${status}`)}
    </Tag>
  );
}
