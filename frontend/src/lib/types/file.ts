// Logical bucket a file belongs to. Mirrors the backend `FileCategory` enum and
// doubles as the Cloudinary sub-folder name (`<category>/<user_id>/...`). Single
// source of truth — reference by name (`FILE_CATEGORY.USER_PROFILE_PHOTO`)
// instead of repeating the string literal at every upload site.
export const FILE_CATEGORY = {
  GENERAL: "general",
  USER_PROFILE_PHOTO: "user_profile_photo",
  SUPPORT_ATTACHMENT: "support_attachment",
  BRANDING_LOGO: "branding_logo",
} as const;

export type FileCategory = (typeof FILE_CATEGORY)[keyof typeof FILE_CATEGORY];

// Public file metadata returned by the upload endpoint and embedded in user
// payloads (e.g. avatar_file). Mirrors the backend `FilePublic` schema — the
// internal Cloudinary `public_id` and uploader id are intentionally absent.
export interface FilePublic {
  id: string;
  url: string;
  content_type: string;
  size: number;
  filename: string | null;
  category: FileCategory;
  created_at: string;
}

// Resolved uploader identity embedded in admin file rows, so the UI can show
// who uploaded each file and search by name/email.
export interface AdminFileUploader {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

// Admin file-management row. Exposes the internal fields (`public_id`,
// `uploaded_by_id`) that `FilePublic` hides, since admins audit raw uploads.
export interface AdminFileListItem {
  id: string;
  url: string;
  public_id: string;
  content_type: string;
  size: number;
  filename: string | null;
  category: FileCategory;
  uploaded_by_id: string | null;
  uploaded_by: AdminFileUploader | null;
  created_at: string;
}

export interface AdminFileListResponse {
  data: AdminFileListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminFileListParams {
  skip?: number;
  limit?: number;
  content_type?: string;
  uploader?: string;
  category?: FileCategory;
}
