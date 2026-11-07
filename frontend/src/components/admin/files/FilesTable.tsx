"use client";

import { Eye, FileIcon, Trash2 } from "lucide-react";
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
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { formatBytes } from "@/components/common/file-upload/file-upload-utils";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import type { AdminFileListItem, AdminFileUploader } from "@/lib/types/file";

interface FilesTableProps {
  rows: AdminFileListItem[];
  isLoading: boolean;
  canDelete: boolean;
  onPreview: (file: AdminFileListItem) => void;
  onDelete: (file: AdminFileListItem) => void;
}

const isImage = (contentType: string) => contentType.startsWith("image/");

const fullName = (uploader: AdminFileUploader) =>
  `${uploader.first_name ?? ""} ${uploader.last_name ?? ""}`.trim();

export function FilesTable({ rows, isLoading, canDelete, onPreview, onDelete }: FilesTableProps) {
  const { t } = useTranslation("admin");

  return (
    <AdminTable>
      <AdminThead>
        <AdminTh>{t("files.columns.file")}</AdminTh>
        <AdminTh>{t("files.columns.type")}</AdminTh>
        <AdminTh>{t("files.columns.size")}</AdminTh>
        <AdminTh>{t("files.columns.uploadedBy")}</AdminTh>
        <AdminTh>{t("files.columns.created")}</AdminTh>
        <AdminTh className="text-right">{t("files.columns.actions")}</AdminTh>
      </AdminThead>
      <AdminTbody>
        {rows.map((file) => {
          const image = isImage(file.content_type);
          const uploader = file.uploaded_by;
          const uploaderName = uploader ? fullName(uploader) : "";
          return (
            <AdminTr key={file.id}>
              <AdminTd>
                <div className="flex items-center gap-3">
                  {image ? (
                    <button
                      type="button"
                      onClick={() => {
                        onPreview(file);
                      }}
                      aria-label={t("files.rowActions.preview")}
                      className="size-10 shrink-0 overflow-hidden rounded-lg border border-border transition-transform duration-200 hover:scale-105"
                    >
                      <img src={file.url} alt="" className="size-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                      <FileIcon className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {file.filename ?? t("files.unnamed")}
                    </p>
                  </div>
                </div>
              </AdminTd>
              <AdminTd>
                <StatusBadge tone="muted">{file.content_type}</StatusBadge>
              </AdminTd>
              <AdminTd className="whitespace-nowrap text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </AdminTd>
              <AdminTd>
                {uploader ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm">{uploaderName || uploader.email}</p>
                    {uploaderName ? (
                      <p className="truncate text-xs text-muted-foreground">{uploader.email}</p>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </AdminTd>
              <AdminTd className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDate(file.created_at)}
              </AdminTd>
              <AdminTd>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!image}
                    aria-label={t("files.rowActions.preview")}
                    onClick={() => {
                      onPreview(file);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("files.rowActions.delete")}
                      onClick={() => {
                        onDelete(file);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </AdminTd>
            </AdminTr>
          );
        })}
        {rows.length === 0 ? (
          <AdminTableStateRow
            colSpan={6}
            isLoading={isLoading}
            loadingLabel={t("files.loading")}
            emptyLabel={t("files.empty")}
          />
        ) : null}
      </AdminTbody>
    </AdminTable>
  );
}
