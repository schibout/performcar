// --- Enumerations (string unions mirroring the backend StrEnums) -----------

export type SettingValueType = "bool" | "int" | "string";
export type SettingCategory = "system" | "auth" | "uploads" | "support" | "branding";

// A setting's scalar value (mirrors the backend SettingValue = bool | int | str).
export type SettingValue = boolean | number | string;

// --- Read shapes ------------------------------------------------------------

export interface SettingRead {
  key: string;
  value: SettingValue;
  value_type: SettingValueType;
  category: SettingCategory;
  is_public: boolean;
  description: string;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface SettingsListResponse {
  data: SettingRead[];
}

// Public endpoint: only is_public settings, as key -> typed value.
export interface PublicSettingsResponse {
  data: Record<string, SettingValue>;
}

// --- Update payload / response ----------------------------------------------

export interface SettingUpdate {
  value: SettingValue;
}

export interface SettingUpdateResponse {
  setting: SettingRead;
  message: string;
}
