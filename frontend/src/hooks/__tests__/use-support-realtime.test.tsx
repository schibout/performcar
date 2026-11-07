import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTicketRealtime } from "@/hooks/use-support-realtime";

// The hook is a thin lifecycle wrapper over the shared realtime store; mock the
// store so we can assert the subscribe/unsubscribe calls directly.
const { subscribeTicket, unsubscribeTicket } = vi.hoisted(() => ({
  subscribeTicket: vi.fn(),
  unsubscribeTicket: vi.fn(),
}));

vi.mock("@/stores/support-realtime.store", () => ({
  useSupportRealtimeStore: (
    selector: (s: { subscribeTicket: unknown; unsubscribeTicket: unknown }) => unknown,
  ) => selector({ subscribeTicket, unsubscribeTicket }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTicketRealtime", () => {
  it("subscribes to the ticket on mount and unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => {
      useTicketRealtime("t-1");
    });

    expect(subscribeTicket).toHaveBeenCalledWith("t-1");
    expect(unsubscribeTicket).not.toHaveBeenCalled();

    unmount();
    expect(unsubscribeTicket).toHaveBeenCalledWith("t-1");
  });

  it("re-subscribes when the ticket id changes", () => {
    const { rerender } = renderHook(
      ({ id }: { id: string }) => {
        useTicketRealtime(id);
      },
      { initialProps: { id: "t-1" } },
    );
    expect(subscribeTicket).toHaveBeenCalledWith("t-1");

    rerender({ id: "t-2" });
    expect(unsubscribeTicket).toHaveBeenCalledWith("t-1");
    expect(subscribeTicket).toHaveBeenCalledWith("t-2");
  });

  it("does nothing without a ticket id", () => {
    renderHook(() => {
      useTicketRealtime(undefined);
    });
    expect(subscribeTicket).not.toHaveBeenCalled();
  });
});
