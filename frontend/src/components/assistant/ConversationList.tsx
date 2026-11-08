"use client";

import { useState } from "react";

import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAssistantConversations,
  useDeleteAssistantConversation,
} from "@/hooks/api/use-assistant";
import type { AssistantKind } from "@/lib/types/assistant";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  kind: AssistantKind;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled: boolean;
  title: string;
}

export function ConversationList({
  kind,
  selectedId,
  onSelect,
  disabled,
  title,
}: ConversationListProps) {
  const { t, i18n } = useTranslation("assistant");
  const { data, isLoading } = useAssistantConversations(kind);
  const remove = useDeleteAssistantConversation();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const conversations = data?.data ?? [];

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            onSelect(null);
          }}
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t("chat.newConversation")}
        </Button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {!isLoading && conversations.length === 0 ? (
          <li className="p-3 text-xs text-muted-foreground">{t("list.empty")}</li>
        ) : null}
        {conversations.map((conversation) => (
          <li key={conversation.id} className="group flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onSelect(conversation.id);
              }}
              aria-current={conversation.id === selectedId ? "true" : undefined}
              className={cn(
                "min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-60",
                conversation.id === selectedId
                  ? "bg-primary/10 font-semibold text-primary"
                  : "hover:bg-muted",
              )}
            >
              <span className="block truncate">{conversation.title || t("list.untitled")}</span>
              <span className="block text-[11px] text-muted-foreground">
                {new Date(conversation.updated_at).toLocaleString(i18n.language)}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("list.delete")}
              disabled={disabled}
              onClick={() => {
                setPendingDelete(conversation.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("list.deleteTitle")}
        description={t("list.deleteDescription")}
        confirmLabel={t("list.delete")}
        cancelLabel={t("list.cancel")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(pendingDelete, {
            onSuccess: () => {
              if (pendingDelete === selectedId) onSelect(null);
              setPendingDelete(null);
            },
          });
        }}
      />
    </aside>
  );
}
