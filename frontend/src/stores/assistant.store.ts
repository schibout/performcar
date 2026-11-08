"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AssistantState {
  // The conversation shown by the floating bubble and the assistant page.
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
}

// sessionStorage: the current conversation survives navigation and reloads,
// but a new tab starts fresh.
export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      conversationId: null,
      setConversationId: (conversationId) => {
        set({ conversationId });
      },
    }),
    { name: "assistant-conversation", storage: createJSONStorage(() => sessionStorage) },
  ),
);
