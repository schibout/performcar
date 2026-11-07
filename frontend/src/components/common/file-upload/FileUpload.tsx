"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";

import { Upload } from "antd";
import { Paperclip, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/api/use-files";
import { toast } from "@/lib/toast";
import type { FileCategory, FilePublic } from "@/lib/types/file";

import {
  DEFAULT_IMAGE_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE,
  formatBytes,
  validateFile,
} from "./file-upload-utils";

import type { UploadFile, UploadProps } from "antd";

export interface FileUploadHandle {
  // Upload every staged file to Cloudinary/DB and return the stored records in
  // list order. Rejects (uploading nothing further) if any upload fails, so the
  // caller keeps the draft for a retry. Call from the parent's submit handler,
  // then create the resource with the returned ids (deferred upload, REVIEW §3.12).
  flush: () => Promise<FilePublic[]>;
  // Drop all staged files. Call after a successful submit.
  reset: () => void;
  // Whether any file is currently staged.
  hasFiles: () => boolean;
}

interface FileUploadProps {
  // Imperative handle for the parent to flush staged uploads on submit.
  ref?: Ref<FileUploadHandle>;
  // Cap the number of files; pass 1 for a single attachment. Undefined = unlimited.
  maxCount?: number;
  readOnly?: boolean;
  disabled?: boolean;
  // MIME whitelist. Defaults to images (the only type the backend accepts today).
  allowedTypes?: readonly string[];
  maxSizeBytes?: number;
  className?: string;
  // Cloudinary bucket the upload is tagged with. Defaults to "general" server-side.
  category?: FileCategory;
  // "tiles" (default): large picture-circle tiles. "compact": a small paperclip
  // trigger + slim list, for inline use in a chat composer.
  variant?: "tiles" | "compact";
}

export function FileUpload({
  ref,
  maxCount,
  readOnly = false,
  disabled = false,
  allowedTypes = DEFAULT_IMAGE_TYPES,
  maxSizeBytes = DEFAULT_MAX_UPLOAD_SIZE,
  className,
  category,
  variant = "tiles",
}: FileUploadProps) {
  const { t } = useTranslation("upload");
  const upload = useUploadFile();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  // Stored records keyed by list-item uid, so a retry after a downstream failure
  // reuses the already-uploaded file instead of sending it to Cloudinary again.
  const uploadedRef = useRef<Map<string, FilePublic>>(new Map());

  const patchItem = (uid: string, patch: Partial<UploadFile>) => {
    setFileList((list) => list.map((file) => (file.uid === uid ? { ...file, ...patch } : file)));
  };

  useImperativeHandle(
    ref,
    () => ({
      hasFiles: () => fileList.length > 0,
      reset: () => {
        setFileList([]);
        uploadedRef.current.clear();
      },
      flush: async () => {
        const stored: FilePublic[] = [];
        for (const item of fileList) {
          const cached = uploadedRef.current.get(item.uid);
          if (cached) {
            stored.push(cached);
            continue;
          }
          const file = item.originFileObj;
          if (!file) continue;
          let uploaded: FilePublic;
          try {
            uploaded = await upload.mutateAsync({
              file,
              category,
              onProgress: (percent) => {
                patchItem(item.uid, { percent, status: "uploading" });
              },
            });
          } catch (error) {
            // Mark the failed item so it doesn't hang in the "uploading" state;
            // it stays in the list (with its originFileObj) so re-submitting
            // retries it without re-picking. Re-throw to abort the parent submit.
            patchItem(item.uid, { status: "error", percent: 0 });
            throw error;
          }
          uploadedRef.current.set(item.uid, uploaded);
          patchItem(item.uid, { status: "done", percent: 100 });
          stored.push(uploaded);
        }
        return stored;
      },
    }),
    // `upload` (the mutation) is stable across renders; flush reads fileList and
    // category, so both must stay in the dependency list.
    [fileList, category, upload],
  );

  const beforeUpload: NonNullable<UploadProps["beforeUpload"]> = (file) => {
    const validationError = validateFile(file, allowedTypes, maxSizeBytes);
    if (validationError) {
      toast.error(t(`errors.${validationError}`, { size: formatBytes(maxSizeBytes) }));
      return Upload.LIST_IGNORE;
    }
    // Returning false keeps the file in the list as a local preview without
    // uploading — the upload is deferred to flush() on submit.
    return false;
  };

  const handleChange: NonNullable<UploadProps["onChange"]> = (info) => {
    setFileList(info.fileList);
    // Forget cached uploads for files the user removed from the list.
    const liveUids = new Set(info.fileList.map((file) => file.uid));
    for (const uid of [...uploadedRef.current.keys()]) {
      if (!liveUids.has(uid)) uploadedRef.current.delete(uid);
    }
  };

  const canAddMore = maxCount === undefined || fileList.length < maxCount;
  const isCompact = variant === "compact";

  return (
    <Upload
      className={className}
      listType={isCompact ? "picture" : "picture-circle"}
      fileList={fileList}
      accept={allowedTypes.join(",")}
      disabled={disabled || readOnly}
      beforeUpload={beforeUpload}
      onChange={handleChange}
      showUploadList={{ showRemoveIcon: !readOnly, showPreviewIcon: true }}
    >
      {!readOnly &&
        canAddMore &&
        (isCompact ? (
          <Button type="button" variant="ghost" disabled={disabled || readOnly}>
            <Paperclip className="h-4 w-4" />
            {t("upload")}
          </Button>
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <Plus className="size-5" />
            {t("upload")}
          </span>
        ))}
    </Upload>
  );
}
