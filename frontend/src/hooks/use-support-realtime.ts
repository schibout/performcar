"use client";

import { useEffect } from "react";

import { useSupportRealtimeStore } from "@/stores/support-realtime.store";

// Follow a single ticket's thread on the shared realtime socket while its detail
// is open. The store routes incoming events into the React Query cache; this
// hook only manages the per-ticket subscription lifecycle (subscribe on mount,
// unsubscribe on unmount or when the ticket changes).
export const useTicketRealtime = (ticketId: string | undefined): void => {
  const subscribeTicket = useSupportRealtimeStore((state) => state.subscribeTicket);
  const unsubscribeTicket = useSupportRealtimeStore((state) => state.unsubscribeTicket);

  useEffect(() => {
    if (!ticketId) return;
    subscribeTicket(ticketId);
    return () => {
      unsubscribeTicket(ticketId);
    };
  }, [ticketId, subscribeTicket, unsubscribeTicket]);
};
