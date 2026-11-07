import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import { adminFilesApi, filesApi } from "@/lib/api/endpoints/files";
import type { AdminFileListParams, FileCategory } from "@/lib/types/file";

import { adminKeys } from "./use-admin";

// File queries live under the `admin` namespace so admin-wide cache resets also
// clear them, but use distinct segments to avoid cross-resource fan-out.
export const fileKeys = {
  all: ["admin", "files"] as const,
  listPrefix: ["admin", "filesList"] as const,
  list: (params?: AdminFileListParams) => ["admin", "filesList", params ?? {}] as const,
  detail: (id: string) => ["admin", "file", id] as const,
};

interface UploadVariables {
  file: File;
  onProgress?: (percent: number) => void;
  category?: FileCategory;
}

// Upload is a building block — it returns the stored FilePublic and lets the
// caller decide what to attach it to (e.g. a user avatar). No cache writes here.
export const useUploadFile = () =>
  useMutation({
    mutationFn: ({ file, onProgress, category }: UploadVariables) =>
      filesApi.upload(file, onProgress, category),
  });

export const useAdminFiles = (params?: AdminFileListParams) =>
  useQuery({
    queryKey: fileKeys.list(params),
    queryFn: () => adminFilesApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useAdminFile = (id: string | undefined) =>
  useQuery({
    queryKey: id ? fileKeys.detail(id) : ["admin", "file", "invalid"],
    queryFn: () => {
      if (!id) throw new Error("File ID is required");
      return adminFilesApi.get(id);
    },
    enabled: Boolean(id),
  });

export const useDeleteAdminFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFilesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: fileKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.listPrefix });
      // A deleted file may have been a user's avatar (FK SET NULL on the
      // backend), so refresh the admin user list to drop the stale image.
      queryClient.invalidateQueries({ queryKey: adminKeys.usersListPrefix });
    },
  });
};
