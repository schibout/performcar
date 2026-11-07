import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { adminSupportKeys, supportKeys } from "@/hooks/api/use-support";
import type { RealtimeEvent, SupportMessage, SupportTicketDetail } from "@/lib/types/support";
import { useSupportRealtimeStore } from "@/stores/support-realtime.store";

// Capture every socket the store opens so tests can drive its onEvent directly.
const { sockets } = vi.hoisted(() => ({
  sockets: [] as {
    path: string;
    onEvent: (e: RealtimeEvent) => void;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }[],
}));

vi.mock("@/lib/websocket/support-socket", () => ({
  createReconnectingSocket: (path: string, opts: { onEvent: (e: RealtimeEvent) => void }) => {
    const socket = {
      path,
      onEvent: opts.onEvent,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      close: vi.fn(),
    };
    sockets.push(socket);
    return socket;
  },
}));

const message = (overrides: Partial<SupportMessage> = {}): SupportMessage => ({
  id: "m-1",
  sender_id: "admin-1",
  sender_role: "admin",
  body: "hi",
  read_at: null,
  created_at: "2026-01-02T00:00:00Z",
  attachments: [],
  ...overrides,
});

const detail: SupportTicketDetail = {
  id: "t-1",
  subject: "Cannot log in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  closed_at: null,
  messages: [message({ id: "m-0", created_at: "2026-01-01T00:00:00Z" })],
};

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

const connect = (isAdmin: boolean) => {
  const client = makeClient();
  useSupportRealtimeStore.getState().connect({ queryClient: client, isAdmin });
  return { client, socket: sockets[sockets.length - 1] };
};

beforeEach(() => {
  sockets.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  useSupportRealtimeStore.getState().disconnect();
});

describe("support realtime store", () => {
  it("opens the user feed socket for a regular user", () => {
    const { socket } = connect(false);
    expect(socket.path).toBe("/support/ws");
  });

  it("opens the admin feed socket for an admin", () => {
    const { socket } = connect(true);
    expect(socket.path).toBe("/admin/support/ws");
  });

  it("closes the previous socket when re-connecting", () => {
    const { socket: first } = connect(false);
    connect(true);
    expect(first.close).toHaveBeenCalled();
  });

  it("appends a message_created event into the detail cache", () => {
    const { client, socket } = connect(false);
    client.setQueryData(supportKeys.detail("t-1"), detail);

    socket.onEvent({
      type: "message_created",
      ticket_id: "t-1",
      message: message({ id: "m-1" }),
      ticket: null,
    });

    const cached = client.getQueryData<SupportTicketDetail>(supportKeys.detail("t-1"));
    expect(cached?.messages).toHaveLength(2);
  });

  it("dedupes a message already present", () => {
    const { client, socket } = connect(false);
    client.setQueryData(supportKeys.detail("t-1"), detail);

    socket.onEvent({
      type: "message_created",
      ticket_id: "t-1",
      message: message({ id: "m-0" }),
      ticket: null,
    });

    const cached = client.getQueryData<SupportTicketDetail>(supportKeys.detail("t-1"));
    expect(cached?.messages).toHaveLength(1);
  });

  it("invalidates the detail and list on ticket_updated (fixes stale detail on entry)", () => {
    const { client, socket } = connect(false);
    const spy = vi.spyOn(client, "invalidateQueries");

    socket.onEvent({ type: "ticket_updated", ticket_id: "t-1", message: null, ticket: null });

    expect(spy).toHaveBeenCalledWith({ queryKey: supportKeys.detail("t-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: supportKeys.myListPrefix });
  });

  it("uses the admin cache keys for an admin session", () => {
    const { client, socket } = connect(true);
    const spy = vi.spyOn(client, "invalidateQueries");

    socket.onEvent({ type: "ticket_updated", ticket_id: "t-1", message: null, ticket: null });

    expect(spy).toHaveBeenCalledWith({ queryKey: adminSupportKeys.detail("t-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: adminSupportKeys.listPrefix });
  });

  it("subscribeTicket/unsubscribeTicket drive the socket", () => {
    const { socket } = connect(false);

    useSupportRealtimeStore.getState().subscribeTicket("t-9");
    useSupportRealtimeStore.getState().unsubscribeTicket("t-9");

    expect(socket.subscribe).toHaveBeenCalledWith("ticket:t-9");
    expect(socket.unsubscribe).toHaveBeenCalledWith("ticket:t-9");
  });

  it("disconnect closes the socket and clears it", () => {
    const { socket } = connect(false);

    useSupportRealtimeStore.getState().disconnect();

    expect(socket.close).toHaveBeenCalled();
    expect(useSupportRealtimeStore.getState().socket).toBeNull();
  });
});
