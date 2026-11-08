import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePermissions } from "@/hooks/use-permissions";
import { assistantApi } from "@/lib/api/endpoints/assistant";
import type { AssistantKind } from "@/lib/types/assistant";
import { Permission } from "@/lib/types/permissions";

export const assistantKeys = {
  all: ["assistant"] as const,
  list: (kind: AssistantKind) => ["assistant", "list", kind] as const,
  detail: (id: string) => ["assistant", "detail", id] as const,
};

export const useCanUseAssistant = (): boolean => usePermissions().has(Permission.SelfAssistantUse);

export const useAssistantConversations = (kind: AssistantKind) => {
  const enabled = useCanUseAssistant();
  return useQuery({
    queryKey: assistantKeys.list(kind),
    queryFn: () => assistantApi.list(kind),
    enabled,
  });
};

export const useAssistantConversation = (id: string | null) => {
  const canUse = useCanUseAssistant();
  return useQuery({
    queryKey: assistantKeys.detail(id ?? "none"),
    queryFn: () => {
      if (!id) throw new Error("Conversation ID is required");
      return assistantApi.get(id);
    },
    enabled: Boolean(id) && canUse,
    retry: false,
  });
};

export const useDeleteAssistantConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assistantApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: assistantKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: assistantKeys.all });
    },
  });
};
