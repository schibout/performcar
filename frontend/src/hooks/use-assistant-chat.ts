"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { assistantKeys, useAssistantConversation } from "@/hooks/api/use-assistant";
import { AssistantChatError, assistantApi } from "@/lib/api/endpoints/assistant";
import type { AssistantKind, AssistantMessage } from "@/lib/types/assistant";

export const GENERIC_ASSISTANT_ERROR = "error.assistant.unavailable";

interface UseAssistantChatOptions {
  kind: AssistantKind;
  conversationId: string | null;
  // Called when the backend opens a new conversation, or with null on a fresh start.
  onConversationChange: (id: string | null) => void;
}

export interface AssistantChat {
  messages: AssistantMessage[];
  isStreaming: boolean;
  isLoadingHistory: boolean;
  // True while the assistant is calling an EasyDevis tool.
  isConsulting: boolean;
  // An `errors` namespace key (e.g. `error.assistant.unavailable`).
  errorKey: string | null;
  send: (text: string, options?: { fresh?: boolean }) => Promise<void>;
  stop: () => void;
}

interface Thread {
  id: string | null;
  messages: AssistantMessage[];
}

// Not crypto.randomUUID(): it only exists in secure contexts and the app may run over plain HTTP.
let localSeq = 0;
const localMessage = (role: AssistantMessage["role"], content: string): AssistantMessage => ({
  id: `local-${Date.now()}-${++localSeq}`,
  role,
  content,
  created_at: new Date().toISOString(),
});

const appendTo =
  (answerId: string, content: string) =>
  (current: Thread): Thread => ({
    ...current,
    messages: current.messages.map((item) =>
      item.id === answerId ? { ...item, content: item.content + content } : item,
    ),
  });

export function useAssistantChat({
  kind,
  conversationId,
  onConversationChange,
}: UseAssistantChatOptions): AssistantChat {
  const queryClient = useQueryClient();
  const detail = useAssistantConversation(conversationId);
  const [thread, setThread] = useState<Thread>({ id: null, messages: [] });
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Adopt a selected conversation's loaded history once; a live thread is never overwritten.
  if (thread.id !== conversationId) {
    if (conversationId === null) setThread({ id: null, messages: [] });
    else if (detail.data?.id === conversationId) {
      setThread({ id: conversationId, messages: detail.data.messages });
    }
  }
  const inSync = thread.id === conversationId;

  useEffect(() => () => abortRef.current?.abort(), []);
  const stop = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string, options?: { fresh?: boolean }) => {
      const message = text.trim();
      if (!message || abortRef.current) return;
      const fresh = options?.fresh === true;
      const targetId = fresh ? null : conversationId;
      const userMessage = localMessage("user", message);
      const answer = localMessage("assistant", "");
      setErrorKey(null);
      setThread((current) => ({
        id: targetId,
        messages: [...(fresh ? [] : current.messages), userMessage, answer],
      }));
      if (fresh) onConversationChange(null);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      try {
        await assistantApi.streamChat(
          { conversation_id: targetId, message, kind, page: window.location.pathname },
          (event) => {
            if (event.type === "conversation" && event.id !== targetId) {
              setThread((current) => ({ ...current, id: event.id }));
              onConversationChange(event.id);
            } else if (event.type === "delta") {
              setIsConsulting(false);
              setThread(appendTo(answer.id, event.content));
            } else if (event.type === "tool") setIsConsulting(true);
            else if (event.type === "error") setErrorKey(event.code || GENERIC_ASSISTANT_ERROR);
          },
          controller.signal,
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          const code = error instanceof AssistantChatError ? error.code : null;
          setErrorKey(code ?? GENERIC_ASSISTANT_ERROR);
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        setIsConsulting(false);
        // Refresh the sidebar titles and the cached history of this conversation.
        void queryClient.invalidateQueries({ queryKey: assistantKeys.all });
      }
    },
    [conversationId, kind, onConversationChange, queryClient],
  );

  return {
    messages: inSync ? thread.messages : [],
    isStreaming,
    isLoadingHistory: !inSync && detail.isLoading,
    isConsulting,
    errorKey: errorKey ?? (detail.isError && !inSync ? GENERIC_ASSISTANT_ERROR : null),
    send,
    stop,
  };
}
