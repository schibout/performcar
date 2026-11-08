"use client";

import { useState } from "react";

import { Copy, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { toast } from "@/lib/toast";
import { useAssistantStore } from "@/stores/assistant.store";

import { AssistantChat } from "./AssistantChat";
import { AssistantFrame } from "./AssistantFrame";
import { buildCommunicationPrompt, type CommunicationRequest } from "./communication-prompt";
import { CommunicationForm } from "./CommunicationForm";
import { ConversationList } from "./ConversationList";

/** Copies text; falls back to execCommand where navigator.clipboard is missing (plain HTTP). */
function copyText(text: string): Promise<void> {
  if (typeof navigator.clipboard?.writeText === "function")
    return navigator.clipboard.writeText(text);
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- only copy API available outside secure contexts
  const ok = document.execCommand("copy");
  area.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
}

/** Full-screen assistant: the bubble's conversation plus the history sidebar. */
export function AssistantContent() {
  const { t } = useTranslation("assistant");
  const conversationId = useAssistantStore((state) => state.conversationId);
  const setConversationId = useAssistantStore((state) => state.setConversationId);
  const chat = useAssistantChat({
    kind: "assistant",
    conversationId,
    onConversationChange: setConversationId,
  });

  return (
    <AssistantFrame title={t("page.title")} subtitle={t("page.subtitle")}>
      <div className="grid h-[calc(100dvh-14rem)] min-h-[28rem] gap-4 md:grid-cols-[18rem_1fr]">
        <ConversationList
          kind="assistant"
          title={t("list.title")}
          selectedId={conversationId}
          onSelect={setConversationId}
          disabled={chat.isStreaming}
        />
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card">
          <AssistantChat chat={chat} className="flex-1" />
        </div>
      </div>
    </AssistantFrame>
  );
}

/** Drafts customer messages from a quote, to copy and send manually. */
export function CommunicationContent() {
  const { t } = useTranslation("assistant");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [form, setForm] = useState<CommunicationRequest>({
    reference: "",
    type: "send",
    channel: "email",
    tone: "professional",
    instructions: "",
  });
  const chat = useAssistantChat({
    kind: "communication",
    conversationId,
    onConversationChange: setConversationId,
  });
  const lastAnswer = chat.messages.findLast((message) => message.role === "assistant")?.content;

  const copy = () => {
    if (!lastAnswer) return;
    copyText(lastAnswer).then(
      () => {
        toast.success(t("communication.copied"));
      },
      () => {
        toast.error(t("communication.copyFailed"));
      },
    );
  };

  return (
    <AssistantFrame title={t("communication.title")} subtitle={t("communication.subtitle")}>
      <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {t("communication.manualNotice")}
      </p>
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <ConversationList
          kind="communication"
          title={t("communication.history")}
          selectedId={conversationId}
          onSelect={setConversationId}
          disabled={chat.isStreaming}
        />
        <div className="space-y-4">
          <CommunicationForm
            value={form}
            onChange={setForm}
            disabled={chat.isStreaming}
            onSubmit={() => {
              // Each generation opens a new conversation; refining continues it below.
              void chat.send(buildCommunicationPrompt(form), { fresh: true });
            }}
          />
          <div className="flex h-[32rem] flex-col rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <h2 className="text-sm font-semibold">{t("communication.result")}</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={!lastAnswer || chat.isStreaming}
                onClick={copy}
              >
                <Copy className="h-4 w-4" />
                {t("communication.copy")}
              </Button>
            </div>
            <AssistantChat
              chat={chat}
              className="flex-1"
              emptyState={
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("communication.empty")}
                </p>
              }
            />
          </div>
        </div>
      </div>
    </AssistantFrame>
  );
}
