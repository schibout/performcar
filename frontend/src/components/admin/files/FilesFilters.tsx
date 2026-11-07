"use client";

import { Select } from "antd";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Mirrors the backend ALLOWED_IMAGE_CONTENT_TYPES. The admin filter does an
// exact `content_type ==` match, so these MIME strings are sent verbatim and
// double as their own (untranslated) option labels.
const FILE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

interface FilesFiltersProps {
  contentType: string;
  onContentTypeChange: (value: string) => void;
  uploader: string;
  onUploaderChange: (value: string) => void;
  onReset: () => void;
  hasFilters: boolean;
}

export function FilesFilters({
  contentType,
  onContentTypeChange,
  uploader,
  onUploaderChange,
  onReset,
  hasFilters,
}: FilesFiltersProps) {
  const { t } = useTranslation("admin");

  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center">
        <div className="w-full md:flex-1 md:min-w-50">
          <Input
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
            placeholder={t("files.filters.uploaderPlaceholder")}
            value={uploader}
            onChange={(event) => {
              onUploaderChange(event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:contents">
          <Select<string>
            value={contentType}
            onChange={(value) => {
              onContentTypeChange(value);
            }}
            aria-label={t("files.filters.type")}
            className="w-full md:w-fit md:min-w-44"
            options={[
              { value: "all", label: t("files.filters.typeAny") },
              ...FILE_CONTENT_TYPES.map((value) => ({ value, label: value })),
            ]}
          />
          {hasFilters ? (
            <Button variant="ghost" onClick={onReset} className="w-full md:w-auto">
              <X className="h-4 w-4" />
              {t("files.filters.reset")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
