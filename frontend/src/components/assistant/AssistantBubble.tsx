"use client";

import { useState } from "react";

import { MessageSquarePlus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useCanUseAssistant } from "@/hooks/api/use-assistant";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import {
  ROUTES,
  getLocaleFromPath,
  getLocalizedPath,
  getPathWithoutLocale,
  isAdminPath,
  matchesRoute,
} from "@/lib/config/routes";
import { useAssistantStore } from "@/stores/assistant.store";

import { AssistantChat } from "./AssistantChat";

// Mounted by both authenticated layouts; renders nothing without the permission
// or on the assistant pages themselves (they host the full chat).
export function AssistantBubble() {
  const canUse = useCanUseAssistant();
  const pathname = usePathname();
  const path = getPathWithoutLocale(pathname);
  if (
    !canUse ||
    matchesRoute(path, ROUTES.assistant) ||
    matchesRoute(path, ROUTES.adminAssistant)
  ) {
    return null;
  }
  // Admins are bounced out of user routes, so they get the admin-shell copy of the page.
  const fullScreen = isAdminPath(path) ? ROUTES.adminAssistant : ROUTES.assistant;
  return <AssistantBubblePanel locale={getLocaleFromPath(pathname)} fullScreen={fullScreen} />;
}

function AssistantBubblePanel({ locale, fullScreen }: { locale: string; fullScreen: string }) {
  const { t } = useTranslation("assistant");
  const [open, setOpen] = useState(false);
  const conversationId = useAssistantStore((state) => state.conversationId);
  const setConversationId = useAssistantStore((state) => state.setConversationId);
  const chat = useAssistantChat({
    kind: "assistant",
    conversationId,
    onConversationChange: setConversationId,
  });

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          aria-label={t("bubble.title")}
          className="flex h-[min(36rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:w-96"
        >
          <header className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/15 to-transparent px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="flex-1 truncate text-sm font-semibold">{t("bubble.title")}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("chat.newConversation")}
              title={t("chat.newConversation")}
              disabled={chat.isStreaming}
              onClick={() => {
                setConversationId(null);
              }}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bubble.close")}
              onClick={() => {
                setOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <AssistantChat chat={chat} className="flex-1" />
          <Link
            href={getLocalizedPath(fullScreen, locale)}
            className="border-t border-border px-4 py-2 text-center text-xs font-medium text-primary hover:underline"
          >
            {t("bubble.fullScreen")}
          </Link>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-label={open ? t("bubble.close") : t("bubble.open")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-ring"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  );
}
