"use client";

import { create } from "zustand";

import { adminSupportKeys, supportKeys } from "@/hooks/api/use-support";
import type { SupportMessage, SupportTicketDetail } from "@/lib/types/support";
import { createReconnectingSocket, type SupportSocket } from "@/lib/websocket/support-socket";

import type { QueryClient } from "@tanstack/react-query";

// Append a streamed message to a cached ticket detail, skipping duplicates so an
// author's own optimistic echo isn't doubled.
const appendMessage = (
  ticket: SupportTicketDetail | undefined,
  message: SupportMessage,
): SupportTicketDetail | undefined => {
  if (!ticket) return ticket;
  if (ticket.messages.some((existing) => existing.id === message.id)) return ticket;
  return {
    ...ticket,
    messages: [...ticket.messages, message],
    last_message_at: message.created_at,
  };
};

interface ConnectArgs {
  queryClient: QueryClient;
  // The role decides both the WebSocket endpoint and which cache keys events
  // are routed into, so it's resolved once at connect time.
  isAdmin: boolean;
}

interface SupportRealtimeState {
  socket: SupportSocket | null;
  connect: (args: ConnectArgs) => void;
  disconnect: () => void;
  subscribeTicket: (ticketId: string) => void;
  unsubscribeTicket: (ticketId: string) => void;
}

// The one multiplexed support socket for the whole authenticated session, kept
// in a Zustand store (REVIEW.md forbids Context for shared state). Opened by
// `SupportRealtimeBridge` after login: it auto-receives the caller's feed and
// multiplexes per-ticket subscriptions on demand. All events are routed into
// the React Query cache here, so screens only declare which ticket they're
// viewing (via `useTicketRealtime`) — they never own a socket.
export const useSupportRealtimeStore = create<SupportRealtimeState>((set, get) => ({
  socket: null,

  connect: ({ queryClient, isAdmin }) => {
    // Replace any existing socket so a role/identity change re-opens cleanly.
    get().socket?.close();

    const detailKey = (id: string) =>
      isAdmin ? adminSupportKeys.detail(id) : supportKeys.detail(id);
    const listPrefix = isAdmin ? adminSupportKeys.listPrefix : supportKeys.myListPrefix;

    const socket = createReconnectingSocket(isAdmin ? "/admin/support/ws" : "/support/ws", {
      onEvent: (event) => {
        if (event.type === "message_created" && event.message) {
          const message = event.message;
          queryClient.setQueryData<SupportTicketDetail>(detailKey(event.ticket_id), (old) =>
            appendMessage(old, message),
          );
          void queryClient.invalidateQueries({ queryKey: listPrefix });
        } else if (event.type === "ticket_updated") {
          // Refresh both the open thread and the list (status / unread / order).
          void queryClient.invalidateQueries({ queryKey: detailKey(event.ticket_id) });
          void queryClient.invalidateQueries({ queryKey: listPrefix });
        } else if (event.type === "ticket_created") {
          void queryClient.invalidateQueries({ queryKey: listPrefix });
        }
      },
    });
    set({ socket });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null });
  },

  subscribeTicket: (ticketId) => {
    get().socket?.subscribe(`ticket:${ticketId}`);
  },
  unsubscribeTicket: (ticketId) => {
    get().socket?.unsubscribe(`ticket:${ticketId}`);
  },
}));
