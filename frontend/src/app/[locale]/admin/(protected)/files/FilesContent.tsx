"use client";

import { useMemo, useState } from "react";

import { Image } from "antd";
import { useTranslation } from "react-i18next";

import { FilesFilters } from "@/components/admin/files/FilesFilters";
import { FilesTable } from "@/components/admin/files/FilesTable";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { AdminPagination } from "@/components/admin/shared/Pagination";
import { DEFAULT_PAGE_SIZE } from "@/components/admin/shared/pagination-config";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminFiles, useDeleteAdminFile } from "@/hooks/api/use-files";
import { useDebounce } from "@/hooks/use-debounce";
import { useCanDeleteFiles } from "@/hooks/use-permissions";
import type { AdminFileListItem, AdminFileListParams } from "@/lib/types/file";

export function FilesContent() {
  const { t } = useTranslation("admin");

  const [contentType, setContentType] = useState("all");
  const [uploaderSearch, setUploaderSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [pendingDelete, setPendingDelete] = useState<AdminFileListItem | null>(null);
  const [previewFile, setPreviewFile] = useState<AdminFileListItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const uploader = useDebounce(uploaderSearch, 250);

  const params = useMemo<AdminFileListParams>(
    () => ({
      skip,
      limit: pageSize,
      content_type: contentType === "all" ? undefined : contentType,
      uploader: uploader.trim() || undefined,
    }),
    [skip, pageSize, contentType, uploader],
  );

  const { data, isLoading, isFetching } = useAdminFiles(params);
  const deleteFile = useDeleteAdminFile();
  const canDelete = useCanDeleteFiles();

  const hasFilters = contentType !== "all" || uploaderSearch !== "";

  const resetFilters = () => {
    setContentType("all");
    setUploaderSearch("");
    setSkip(0);
  };

  const openPreview = (file: AdminFileListItem) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    // Close the dialog only after the server confirms. The api interceptor
    // surfaces the success/error toast; the hook invalidates the file list and
    // the admin user list (a deleted avatar is SET NULL on the backend).
    deleteFile.mutate(pendingDelete.id, {
      onSuccess: () => {
        setPendingDelete(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("files.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("files.subtitle")}</p>
      </div>

      <FilesFilters
        contentType={contentType}
        onContentTypeChange={(value) => {
          setContentType(value);
          setSkip(0);
        }}
        uploader={uploaderSearch}
        onUploaderChange={(value) => {
          setUploaderSearch(value);
          setSkip(0);
        }}
        onReset={resetFilters}
        hasFilters={hasFilters}
      />

      <Card className="border-border/50 bg-card/60">
        <CardContent className="p-0">
          <FilesTable
            rows={data?.data ?? []}
            isLoading={isLoading && !data}
            canDelete={canDelete}
            onPreview={openPreview}
            onDelete={setPendingDelete}
          />
          {data ? (
            <div
              className="px-4 pb-4 pt-0"
              aria-live="polite"
              aria-busy={isFetching ? "true" : "false"}
            >
              <AdminPagination
                total={data.total}
                skip={data.skip}
                limit={data.limit}
                onChange={setSkip}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setSkip(0);
                }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("files.confirmDelete.title")}
        description={t("files.confirmDelete.description")}
        confirmLabel={t("files.confirmDelete.confirm")}
        cancelLabel={t("files.confirmDelete.cancel")}
        onConfirm={confirmDelete}
        isLoading={deleteFile.isPending}
        destructive
      />

      {previewFile?.url ? (
        <Image
          src={previewFile.url}
          alt=""
          style={{ display: "none" }}
          preview={{ open: previewOpen, onOpenChange: setPreviewOpen }}
        />
      ) : null}
    </div>
  );
}
