"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AttachmentThumb } from "@/components/support/AttachmentThumb";
import { formatDateTime } from "@/lib/format-date";
import type { SenderRole, SupportMessage } from "@/lib/types/support";
import { cn } from "@/lib/utils";

interface MessageThreadProps {
  messages: SupportMessage[];
  // Which side is viewing — their own messages align right. "user" on the
  // customer view, "admin" on the admin view, so one component serves both.
  viewerRole: SenderRole;
  // Label for the other party's messages. Defaults to the support team; the
  // admin view passes the customer's name instead.
  counterpartLabel?: string;
}

// How close to the bottom (px) still counts as "at the bottom" for hiding the
// jump button — a small slack so a near-bottom resting position doesn't flicker.
const BOTTOM_THRESHOLD = 120;

export function MessageThread({ messages, viewerRole, counterpartLabel }: MessageThreadProps) {
  const { t } = useTranslation("support");
  const scrollRef = useRef<HTMLDivElement>(null);
  // Drives the WhatsApp-style "jump to latest" button. Starts true so it's
  // hidden until we actually measure a scrolled-up position.
  const [atBottom, setAtBottom] = useState(true);
  // How many messages arrived while the reader was scrolled up — shown as a
  // badge on the jump button and reset once they're back at the bottom.
  const [unseen, setUnseen] = useState(0);
  const prevLen = useRef(messages.length);

  const isAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  };

  const measure = useCallback(() => {
    const bottom = isAtBottom();
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
  }, []);

  // Open at the latest message (initial position only — the view never follows
  // new messages on its own afterwards; the button handles catching up).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // When the thread grows, count anything that landed while scrolled up and
  // re-evaluate the button — without moving the view.
  useEffect(() => {
    const grew = messages.length - prevLen.current;
    prevLen.current = messages.length;
    if (grew > 0 && !isAtBottom()) setUnseen((n) => n + grew);
    measure();
  }, [messages.length, measure]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnseen(0);
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-sm text-muted-foreground">
        {t("detail.empty")}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={measure}
        className="h-full overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2"
      >
        <div className="flex flex-col gap-4 p-4">
          {messages.map((message) => {
            const mine = message.sender_role === viewerRole;
            return (
              <div
                key={message.id}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
                  {message.attachments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <AttachmentThumb
                          key={attachment.id}
                          url={attachment.file.url}
                          filename={attachment.file.filename}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <span className="px-1 text-[11px] text-muted-foreground">
                  {`${mine ? t("detail.you") : (counterpartLabel ?? t("detail.supportTeam"))} · ${formatDateTime(message.created_at)}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!atBottom ? (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label={t("detail.jumpToLatest")}
          title={t("detail.jumpToLatest")}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-muted"
        >
          <ChevronDown className="h-5 w-5" />
          {unseen > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {unseen > 99 ? "99+" : unseen}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
