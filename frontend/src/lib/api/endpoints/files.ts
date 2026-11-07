import api from "@/lib/api/api";
import { pruneParams } from "@/lib/api/endpoints/admin";
import type { MessageResponse } from "@/lib/types/auth";
import type {
  AdminFileListItem,
  AdminFileListParams,
  AdminFileListResponse,
  FileCategory,
  FilePublic,
} from "@/lib/types/file";

import type { AxiosProgressEvent, AxiosRequestHeaders } from "axios";

export const filesApi = {
  upload: (
    file: File,
    onProgress?: (percent: number) => void,
    category?: FileCategory,
  ): Promise<FilePublic> => {
    const formData = new FormData();
    formData.append("file", file);
    // Tag the upload so it lands in the right Cloudinary bucket. Omitted -> the
    // backend defaults to "general".
    if (category) formData.append("category", category);
    return api.post<FilePublic, FilePublic>("/upload", formData, {
      // Strip the instance's default JSON Content-Type so the browser sets
      // multipart/form-data with the correct boundary. Without this, axios
      // would JSON-stringify the FormData and the upload would fail.
      transformRequest: [
        (data: FormData, headers: AxiosRequestHeaders) => {
          headers.delete("Content-Type");
          return data;
        },
      ],
      onUploadProgress: onProgress
        ? (event: AxiosProgressEvent) => {
            if (event.total) {
              onProgress(Math.round((event.loaded / event.total) * 100));
            }
          }
        : undefined,
    });
  },
};

export const adminFilesApi = {
  list: (params?: AdminFileListParams): Promise<AdminFileListResponse> =>
    api.get<AdminFileListResponse, AdminFileListResponse>("/admin/files", {
      params: pruneParams(params),
    }),

  get: (id: string): Promise<AdminFileListItem> =>
    api.get<AdminFileListItem, AdminFileListItem>(`/admin/files/${id}`),

  delete: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/files/${id}`),
};
