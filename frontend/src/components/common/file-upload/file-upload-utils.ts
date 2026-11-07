// Mirrors the backend upload constraints (app/core/config MAX_UPLOAD_SIZE_BYTES
// and the image MIME whitelist in file_service). Keep these in sync.
export const DEFAULT_MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

export const DEFAULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type FileValidationError = "invalid_type" | "too_large";

export const validateFile = (
  file: File,
  allowedTypes: readonly string[],
  maxSizeBytes: number,
): FileValidationError | null => {
  if (!allowedTypes.includes(file.type)) return "invalid_type";
  if (file.size > maxSizeBytes) return "too_large";
  return null;
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
