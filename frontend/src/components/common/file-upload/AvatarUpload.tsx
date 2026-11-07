"use client";

import { useEffect, useRef, useState } from "react";

import { Image } from "antd";
import { Check, Eye, ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/api/use-files";
import { toast } from "@/lib/toast";
import { FILE_CATEGORY, type FileCategory, type FilePublic } from "@/lib/types/file";
import { cn } from "@/lib/utils";

import {
  DEFAULT_IMAGE_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE,
  formatBytes,
  validateFile,
} from "./file-upload-utils";

interface AvatarUploadProps {
  // Current image. Accepts any object exposing a ``url`` (e.g. a ``FilePublic``
  // or a bare ``{ url }`` built from a stored URL string), so callers that only
  // persist the URL — like a site-logo setting — can reuse this component.
  value?: { url: string } | null;
  onChange?: (file: FilePublic | null) => void;
  // Cloudinary bucket the upload is tagged with. Defaults to the avatar folder.
  category?: FileCategory;
  allowedTypes?: readonly string[];
  maxSizeBytes?: number;
  disabled?: boolean;
  // Disables the Remove action. Defaults to `disabled`; set it explicitly for
  // callers whose removal needs a different permission than picking a file.
  removeDisabled?: boolean;
  className?: string;
  // "circle" + "cover" is the avatar default. A logo (often transparent and
  // rectangular) should use "square" + "contain" so it is never cropped.
  shape?: "circle" | "square";
  fit?: "cover" | "contain";
}

interface AvatarActionsProps {
  hasPending: boolean;
  hasValue: boolean;
  interactive: boolean;
  canRemove: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onPreview: () => void;
  onPick: () => void;
  onRemove: () => void;
}

// Save/Discard while a file is pending; Preview/Replace/Remove once it is saved.
// Extracted so the main component stays within the per-function line budget.
function AvatarActions({
  hasPending,
  hasValue,
  interactive,
  canRemove,
  saving,
  onSave,
  onDiscard,
  onPreview,
  onPick,
  onRemove,
}: AvatarActionsProps) {
  const { t } = useTranslation("upload");

  if (hasPending) {
    return (
      <>
        <Button onClick={onSave} disabled={!interactive}>
          <Check className="size-4" />
          {t("save")}
        </Button>
        <Button variant="outline" onClick={onDiscard} disabled={saving}>
          <X className="size-4" />
          {t("discard")}
        </Button>
      </>
    );
  }

  return (
    <>
      {hasValue && (
        <Button variant="secondary" onClick={onPreview} disabled={saving}>
          <Eye className="size-4" />
          {t("preview")}
        </Button>
      )}
      <Button variant="outline" onClick={onPick} disabled={!interactive}>
        <Upload className="size-4" />
        {hasValue ? t("replace") : t("upload")}
      </Button>
      {hasValue && (
        <Button variant="destructive" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="size-4" />
          {t("remove")}
        </Button>
      )}
    </>
  );
}

export function AvatarUpload({
  value,
  onChange,
  category = FILE_CATEGORY.USER_PROFILE_PHOTO,
  allowedTypes = DEFAULT_IMAGE_TYPES,
  maxSizeBytes = DEFAULT_MAX_UPLOAD_SIZE,
  disabled = false,
  removeDisabled,
  className,
  shape = "circle",
  fit = "cover",
}: AvatarUploadProps) {
  const { t } = useTranslation("upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  // The picked-but-not-yet-saved file plus its local object URL. Nothing is sent
  // to Cloudinary/DB until the user presses Save (deferred upload — REVIEW
  // §3.12), so a cancelled selection never leaves an orphan file record.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const upload = useUploadFile();

  const interactive = !disabled && !upload.isPending;
  const displayUrl = pendingUrl ?? value?.url ?? null;
  const radius = shape === "circle" ? "rounded-full" : "rounded-md";
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";

  // Revoke the local preview URL when it changes or on unmount to avoid leaks.
  useEffect(() => {
    if (!pendingUrl) return;
    return () => {
      URL.revokeObjectURL(pendingUrl);
    };
  }, [pendingUrl]);

  const openPicker = () => {
    if (interactive) inputRef.current?.click();
  };

  const clearPending = () => {
    setPendingFile(null);
    setPendingUrl(null);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateFile(file, allowedTypes, maxSizeBytes);
    if (validationError) {
      toast.error(t(`errors.${validationError}`, { size: formatBytes(maxSizeBytes) }));
      return;
    }
    // Hold the file locally and show a preview; defer the upload to Save.
    setPendingFile(file);
    setPendingUrl(URL.createObjectURL(file));
  };

  const handleSave = () => {
    if (!pendingFile) return;
    setProgress(0);
    // Tag the upload with the caller's category (defaults to the avatar folder)
    // so it buckets correctly on Cloudinary and stays filterable in the files table.
    upload.mutate(
      { file: pendingFile, category, onProgress: setProgress },
      {
        onSuccess: (uploaded) => {
          clearPending();
          onChange?.(uploaded);
        },
        onSettled: () => {
          setProgress(0);
        },
      },
    );
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative size-28">
        {displayUrl ? (
          <button
            type="button"
            onClick={() => {
              setPreviewOpen(true);
            }}
            disabled={upload.isPending}
            aria-label={t("preview")}
            className={cn("size-28 overflow-hidden border border-border", radius)}
          >
            <img src={displayUrl} alt="" className={cn("size-full", objectFit)} />
          </button>
        ) : (
          <div
            className={cn(
              "flex size-28 items-center justify-center border border-border bg-muted",
              radius,
            )}
          >
            <ImageIcon className="size-9 text-muted-foreground" />
          </div>
        )}
        {upload.isPending && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-xs font-medium text-white",
              radius,
            )}
          >
            <Loader2 className="size-5 animate-spin" />
            {progress > 0 ? `${progress}%` : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <AvatarActions
          hasPending={Boolean(pendingFile)}
          hasValue={Boolean(value)}
          interactive={interactive}
          canRemove={!(removeDisabled ?? disabled) && !upload.isPending}
          saving={upload.isPending}
          onSave={handleSave}
          onDiscard={clearPending}
          onPreview={() => {
            setPreviewOpen(true);
          }}
          onPick={openPicker}
          onRemove={() => {
            onChange?.(null);
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {pendingFile ? t("selectedHint") : t("imageHint", { size: formatBytes(maxSizeBytes) })}
      </p>

      {displayUrl && (
        <Image
          src={displayUrl}
          alt=""
          style={{ display: "none" }}
          preview={{ open: previewOpen, onOpenChange: setPreviewOpen }}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={allowedTypes.join(",")}
        className="hidden"
        disabled={!interactive}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
