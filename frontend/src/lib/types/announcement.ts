import type { SystemRole } from "@/lib/types/user";

// --- Enumerations (string unions mirroring the backend StrEnums) -----------

export type AnnouncementKind = "template" | "custom";
export type AnnouncementLevel = "info" | "warning" | "critical";
export type AnnouncementAudience = "all" | "active" | "role";
export type AnnouncementVariableType = "text" | "datetime";

// Supported content languages (mirrors the backend Language enum).
export type AnnouncementLanguage = "fr" | "en";

// --- Content & variables ----------------------------------------------------

export interface AnnouncementContent {
  title: string;
  body: string;
}

// A submitted variable value: a single ISO datetime string, or a per-language
// map for free text. The template variable's type decides which shape applies.
export type AnnouncementVariableValue = string | Partial<Record<AnnouncementLanguage, string>>;

// --- Template catalog -------------------------------------------------------

export interface TemplateVariable {
  name: string;
  type: AnnouncementVariableType;
}

export interface BroadcastTemplate {
  key: string;
  variables: TemplateVariable[];
  translations: Partial<Record<AnnouncementLanguage, AnnouncementContent>>;
}

export interface BroadcastTemplateCatalogResponse {
  templates: BroadcastTemplate[];
}

// --- Create (send) payload --------------------------------------------------

export interface BroadcastCreate {
  kind: AnnouncementKind;
  template_key?: string | null;
  variables?: Record<string, AnnouncementVariableValue>;
  translations?: Partial<Record<AnnouncementLanguage, AnnouncementContent>>;
  level?: AnnouncementLevel;
  audience?: AnnouncementAudience;
  role_filter?: SystemRole | null;
  show_banner?: boolean;
  send_email?: boolean;
}

// --- Read shapes ------------------------------------------------------------

export interface AnnouncementCreator {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface AnnouncementRead {
  id: string;
  kind: AnnouncementKind;
  template_key?: string | null;
  variables: Record<string, AnnouncementVariableValue>;
  translations: Partial<Record<AnnouncementLanguage, AnnouncementContent>>;
  level: AnnouncementLevel;
  audience: AnnouncementAudience;
  role_filter?: SystemRole | null;
  show_banner: boolean;
  send_email: boolean;
  created_by?: string | null;
  creator?: AnnouncementCreator | null;
  created_at: string;
}

export interface AnnouncementListResponse {
  data: AnnouncementRead[];
  total: number;
  skip: number;
  limit: number;
}

export interface BroadcastCreateResponse {
  announcement: AnnouncementRead;
  recipients: number;
  message: string;
}

export interface ActiveBannerResponse {
  announcement: AnnouncementRead | null;
}

// --- Query params -----------------------------------------------------------

export interface BroadcastListParams {
  skip?: number;
  limit?: number;
}
