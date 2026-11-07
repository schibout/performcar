import api from "@/lib/api/api";
import type {
  PublicSettingsResponse,
  SettingsListResponse,
  SettingUpdate,
  SettingUpdateResponse,
} from "@/lib/types/system-settings";

export const systemSettingsApi = {
  list: (): Promise<SettingsListResponse> =>
    api.get<SettingsListResponse, SettingsListResponse>("/admin/system-settings"),

  update: (key: string, payload: SettingUpdate): Promise<SettingUpdateResponse> =>
    api.patch<SettingUpdateResponse, SettingUpdateResponse>(
      `/admin/system-settings/${key}`,
      payload,
    ),

  public: (): Promise<PublicSettingsResponse> =>
    api.get<PublicSettingsResponse, PublicSettingsResponse>("/settings/public"),
};
