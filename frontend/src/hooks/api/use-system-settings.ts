import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { systemSettingsApi } from "@/lib/api/endpoints/system-settings";
import type { SettingValue } from "@/lib/types/system-settings";

export const systemSettingsKeys = {
  all: ["systemSettings"] as const,
  list: ["systemSettings", "list"] as const,
  public: ["systemSettings", "public"] as const,
};

export const useSystemSettings = (enabled = true) =>
  useQuery({
    queryKey: systemSettingsKeys.list,
    queryFn: () => systemSettingsApi.list(),
    enabled,
  });

// Public config: cached 5 min so navigation never re-triggers the boot splash.
export const usePublicSettings = () =>
  useQuery({
    queryKey: systemSettingsKeys.public,
    queryFn: () => systemSettingsApi.public(),
    staleTime: 1000 * 60 * 5,
  });

// Success toast is driven by the backend `message` via the axios interceptor.
export const useUpdateSystemSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: SettingValue }) =>
      systemSettingsApi.update(key, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemSettingsKeys.all });
    },
  });
};
