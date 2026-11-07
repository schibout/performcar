import { accountEventSchema, type AccountEvent } from "@/schemas/account";

import { buildWsUrl } from "./support-socket";

// Backoff bounds mirror the support socket: start at 1s, double up to 15s, and
// give up after a streak of failed handshakes (auth refused / server down).
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const MAX_CONSECUTIVE_FAILURES = 6;

const ACCOUNT_EVENTS_PATH = "/users/me/events";

export interface AccountSocket {
  close: () => void;
}

// Open a self-healing notification socket to the caller's account channel.
// Cookies on the backend origin ride the handshake automatically, so no token
// is passed. The server auto-subscribes the socket to the user's own topic, so
// unlike the support socket there is nothing to multiplex. Returns a handle
// whose `close()` stops the socket and cancels any pending reconnect.
export const createAccountSocket = (onEvent: (event: AccountEvent) => void): AccountSocket => {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let closedByCaller = false;

  const scheduleReconnect = () => {
    if (closedByCaller || failures >= MAX_CONSECUTIVE_FAILURES) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** failures, RECONNECT_MAX_MS);
    reconnectTimer = setTimeout(connect, delay);
  };

  function connect() {
    if (closedByCaller || typeof window === "undefined") return;
    socket = new WebSocket(buildWsUrl(ACCOUNT_EVENTS_PATH));

    socket.onopen = () => {
      // A live connection clears the failure streak so later drops still retry.
      failures = 0;
    };

    socket.onmessage = (message) => {
      let raw: unknown;
      try {
        raw = JSON.parse(message.data as string);
      } catch {
        // Ignore frames that aren't valid JSON.
        return;
      }
      const parsed = accountEventSchema.safeParse(raw);
      if (parsed.success) {
        onEvent(parsed.data);
      }
    };

    socket.onclose = (event) => {
      // 1000 (normal) is our own close; 1008 (policy) / 4403 are the server
      // refusing auth. None of these should reconnect.
      if (event.code === 1000 || event.code === 1008 || event.code === 4403) {
        return;
      }
      failures += 1;
      scheduleReconnect();
    };

    // Let onclose drive reconnection; closing here avoids a double-trigger.
    socket.onerror = () => {
      socket?.close();
    };
  }

  connect();

  return {
    close: () => {
      closedByCaller = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
};
