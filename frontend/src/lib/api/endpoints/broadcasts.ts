import api from "@/lib/api/api";
import { pruneParams } from "@/lib/api/endpoints/admin";
import type {
  ActiveBannerResponse,
  AnnouncementListResponse,
  BroadcastCreate,
  BroadcastCreateResponse,
  BroadcastListParams,
  BroadcastTemplateCatalogResponse,
} from "@/lib/types/announcement";

export const broadcastsApi = {
  send: (payload: BroadcastCreate): Promise<BroadcastCreateResponse> =>
    api.post<BroadcastCreateResponse, BroadcastCreateResponse>("/admin/broadcasts", payload),

  list: (params?: BroadcastListParams): Promise<AnnouncementListResponse> =>
    api.get<AnnouncementListResponse, AnnouncementListResponse>("/admin/broadcasts", {
      params: pruneParams(params),
    }),

  templates: (): Promise<BroadcastTemplateCatalogResponse> =>
    api.get<BroadcastTemplateCatalogResponse, BroadcastTemplateCatalogResponse>(
      "/admin/broadcast-templates",
    ),

  active: (): Promise<ActiveBannerResponse> =>
    api.get<ActiveBannerResponse, ActiveBannerResponse>("/announcements/active"),
};
