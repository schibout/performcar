import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationRealtimeEvent } from "@/lib/types/notification";
import { createNotificationSocket } from "@/lib/websocket/notification-socket";

// Minimal WebSocket stand-in: records each instance and lets tests fire the
// lifecycle handlers (open/close/message) the real browser would.
class FakeWebSocket {
  static readonly OPEN = 1;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    // Caller-initiated close; no auto-events in the fake.
  }
}

describe("createNotificationSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const latest = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

  it("connects to the notifications feed path", () => {
    createNotificationSocket(() => undefined);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(latest().url).toContain("/api/v1/notifications/ws");
  });

  it.each([1000, 1008, 4403])(
    "does not reconnect after an intentional/policy close (code %i)",
    (code) => {
      createNotificationSocket(() => undefined);
      expect(FakeWebSocket.instances).toHaveLength(1);

      latest().onclose?.({ code });
      vi.advanceTimersByTime(60000);

      expect(FakeWebSocket.instances).toHaveLength(1);
    },
  );

  it("reconnects after an unexpected close (code 1006)", () => {
    createNotificationSocket(() => undefined);

    latest().onclose?.({ code: 1006 });
    vi.advanceTimersByTime(60000);

    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
  });

  it("delivers a valid frame to onEvent", () => {
    const events: NotificationRealtimeEvent[] = [];
    createNotificationSocket((event) => events.push(event));

    latest().onmessage?.({
      data: JSON.stringify({
        type: "notification_created",
        notification: {
          id: "n-1",
          type: "support_ticket_replied",
          data: { ticket_id: "t-1", subject: "Login fails" },
          read_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      }),
    });

    expect(events).toHaveLength(1);
    expect(events[0].notification.id).toBe("n-1");
    expect(events[0].notification.data.subject).toBe("Login fails");
  });

  it("drops malformed JSON and invalid frames without calling onEvent", () => {
    const events: NotificationRealtimeEvent[] = [];
    createNotificationSocket((event) => events.push(event));

    latest().onmessage?.({ data: "not-json" });
    latest().onmessage?.({
      data: JSON.stringify({ type: "notification_created", notification: { id: 42 } }),
    });
    latest().onmessage?.({
      data: JSON.stringify({ type: "unknown_event", notification: null }),
    });

    expect(events).toHaveLength(0);
  });

  it("stops the socket and any pending reconnect on close()", () => {
    const socket = createNotificationSocket(() => undefined);

    latest().onclose?.({ code: 1006 });
    socket.close();
    vi.advanceTimersByTime(60000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
