import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RealtimeEvent } from "@/lib/types/support";
import { buildWsUrl, createReconnectingSocket } from "@/lib/websocket/support-socket";

describe("buildWsUrl", () => {
  it("derives a ws(s) url including the api prefix and path", () => {
    const url = buildWsUrl("/support/tickets/abc/ws");
    expect(url).toMatch(/^wss?:\/\//);
    expect(url).toContain("/api/v1/support/tickets/abc/ws");
  });

  it("normalizes a path missing its leading slash", () => {
    expect(buildWsUrl("admin/support/ws")).toBe(buildWsUrl("/admin/support/ws"));
  });

  it("does not keep the http(s) scheme", () => {
    expect(buildWsUrl("/support/tickets/x/ws")).not.toMatch(/^http/);
  });
});

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
  readonly sent: string[] = [];

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    // Caller-initiated close; no auto-events in the fake.
  }
}

describe("createReconnectingSocket", () => {
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

  it.each([1000, 1008, 4403])(
    "does not reconnect after an intentional/policy close (code %i)",
    (code) => {
      createReconnectingSocket("/support/ws", { onEvent: () => undefined });
      expect(FakeWebSocket.instances).toHaveLength(1);

      latest().onclose?.({ code });
      vi.advanceTimersByTime(60000);

      expect(FakeWebSocket.instances).toHaveLength(1);
    },
  );

  it("reconnects after an unexpected close (code 1006)", () => {
    createReconnectingSocket("/support/ws", { onEvent: () => undefined });

    latest().onclose?.({ code: 1006 });
    vi.advanceTimersByTime(60000);

    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
  });

  it("delivers a valid frame to onEvent", () => {
    const events: RealtimeEvent[] = [];
    createReconnectingSocket("/support/ws", { onEvent: (event) => events.push(event) });

    latest().onmessage?.({
      data: JSON.stringify({
        type: "ticket_updated",
        ticket_id: "t-1",
        message: null,
        ticket: null,
      }),
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("ticket_updated");
  });

  it("drops malformed JSON and invalid frames without calling onEvent", () => {
    const events: RealtimeEvent[] = [];
    createReconnectingSocket("/support/ws", { onEvent: (event) => events.push(event) });

    latest().onmessage?.({ data: "not-json" });
    latest().onmessage?.({ data: JSON.stringify({ type: "bogus", ticket_id: 42 }) });

    expect(events).toHaveLength(0);
  });
});
