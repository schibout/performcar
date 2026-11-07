"use client";

import { useState } from "react";

import { Select } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PAGE_SIZE_OPTIONS } from "@/components/admin/shared/pagination-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaginationProps {
  total: number;
  skip: number;
  limit: number;
  onChange: (skip: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

export function AdminPagination({
  total,
  skip,
  limit,
  onChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const { t } = useTranslation("admin");
  const page = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(total, skip + limit);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Editable "go to page" field. Keep its draft in sync when the page changes
  // from outside (prev/next, page-size change, data refetch) using React's
  // render-phase state-adjustment pattern — avoids a setState-in-effect.
  const [draft, setDraft] = useState(String(page));
  const [syncedPage, setSyncedPage] = useState(page);
  if (page !== syncedPage) {
    setSyncedPage(page);
    setDraft(String(page));
  }

  // Parse the draft, clamp to a valid page, and jump there if it changed.
  // Invalid input snaps the field back to the current page.
  const commitDraft = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(page));
      return;
    }
    const target = Math.min(totalPages, Math.max(1, parsed));
    setDraft(String(target));
    if (target !== page) {
      onChange((target - 1) * limit);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        <span>{t("users.pagination.showing", { from, to, total })}</span>
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span>{t("users.pagination.rowsPerPage")}</span>
            <Select
              value={limit}
              onChange={(value: number) => {
                onPageSizeChange(value);
              }}
              aria-label={t("users.pagination.rowsPerPage")}
              className="w-20"
              popupMatchSelectWidth={false}
              options={pageSizeOptions.map((option) => ({ value: option, label: String(option) }))}
            />
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!canPrev}
          onClick={() => {
            onChange(Math.max(0, skip - limit));
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("users.pagination.previous")}
        </Button>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground">
          <Input
            value={draft}
            inputMode="numeric"
            aria-label={t("users.pagination.goToPage")}
            className="text-center"
            // antd Input ships width:100% that is injected after Tailwind and
            // overrides w-16; inline style wins regardless of CSS order.
            style={{ width: "4rem" }}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onBlur={commitDraft}
            onPressEnter={commitDraft}
          />
          {t("users.pagination.pageOf", { total: totalPages })}
        </span>
        <Button
          variant="outline"
          disabled={!canNext}
          onClick={() => {
            onChange(skip + limit);
          }}
        >
          {t("users.pagination.next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
