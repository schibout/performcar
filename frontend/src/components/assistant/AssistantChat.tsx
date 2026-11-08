"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Loader2, Send, Sparkles, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { AssistantChat as AssistantChatState } from "@/hooks/use-assistant-chat";
import { cn } from "@/lib/utils";

import { AssistantMarkdown } from "./AssistantMarkdown";

const MAX_MESSAGE_LENGTH = 8000;

interface AssistantChatProps {
  chat: AssistantChatState;
  // Shown in place of the message list while the conversation is empty.
  emptyState?: ReactNode;
  className?: string;
}

export function AssistantChat({ chat, emptyState, className }: AssistantChatProps) {
  const { t } = useTranslation("assistant");
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, isLoadingHistory, isConsulting, errorKey } = chat;
  const lastContent = messages.at(-1)?.content;

  // Follow the answer as it streams in.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, lastContent, isConsulting, errorKey]);

  const submit = () => {
    if (!draft.trim() || isStreaming || isLoadingHistory) return;
    void chat.send(draft);
    setDraft("");
  };

  const waitingFirstWord = isStreaming && !lastContent;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-busy={isStreaming}
      >
        {isLoadingHistory ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}
        {!isLoadingHistory && messages.length === 0
          ? (emptyState ?? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Sparkles className="h-6 w-6 text-primary" />
                <p>{t("chat.empty")}</p>
              </div>
            ))
          : null}
        {/* An answer with no word yet (or aborted before one) is not drawn. */}
        {messages
          .filter((message) => message.content)
          .map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-muted/60 px-3.5 py-2 text-sm">
                  <AssistantMarkdown content={message.content} />
                </div>
              </div>
            ),
          )}
        {isConsulting || waitingFirstWord ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {isConsulting ? t("chat.consulting") : t("chat.thinking")}
          </p>
        ) : null}
        {errorKey ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t(`errors:${errorKey}`, { defaultValue: t("error.generic") })}
          </p>
        ) : null}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={chat.stop}
            aria-label={t("chat.stop")}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || isLoadingHistory}
            aria-label={t("chat.send")}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
