import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { SessionsSection } from "@/components/profile/SessionsSection";
import type { SessionItem, SessionListResponse } from "@/lib/types/session";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

const currentSession: SessionItem = {
  id: "s-current",
  browser: "Chrome",
  os: "Windows",
  created_at: "2026-06-01T10:00:00Z",
  last_used_at: "2026-06-13T08:00:00Z",
  is_current: true,
};

const otherSession: SessionItem = {
  id: "s-other",
  browser: "Safari",
  os: "iOS",
  created_at: "2026-06-02T10:00:00Z",
  last_used_at: "2026-06-12T08:00:00Z",
  is_current: false,
};

const listResponse = (data: SessionItem[]): SessionListResponse => ({
  data,
  total: data.length,
  skip: 0,
  limit: 10,
});

const mockList = (data: SessionItem[]) => {
  server.use(http.get("*/api/v1/users/me/sessions", () => HttpResponse.json(listResponse(data))));
};

describe("SessionsSection", () => {
  it("renders the device list and flags the current session", async () => {
    mockList([currentSession, otherSession]);

    renderWithProviders(<SessionsSection />);

    // Both devices show up with their parsed labels.
    await waitFor(() => {
      expect(screen.getAllByText(/sessions\.deviceLabel/)).toHaveLength(2);
    });
    // Only the current session carries the badge; only the other one a revoke button.
    expect(screen.getAllByText(/sessions\.currentBadge/)).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /sessions\.revoke$/ })).toHaveLength(1);
    // With another device present, the bulk sign-out action is offered.
    expect(screen.getByRole("button", { name: /sessions\.revokeOthers/ })).toBeInTheDocument();
  });

  it("revokes a single session after the confirm dialog", async () => {
    const user = userEvent.setup();
    mockList([currentSession, otherSession]);
    let revokedId: string | null = null;
    server.use(
      http.delete("*/api/v1/users/me/sessions/:id", ({ params }) => {
        revokedId = params.id as string;
        return HttpResponse.json({ success: true, message: "ok" });
      }),
    );

    renderWithProviders(<SessionsSection />);

    await user.click(await screen.findByRole("button", { name: /sessions\.revoke$/ }));
    // Confirm inside the dialog.
    await user.click(screen.getByRole("button", { name: /confirmRevoke\.confirm/ }));

    await waitFor(() => {
      expect(revokedId).toBe("s-other");
    });
  });

  it("revokes all other sessions after the confirm dialog", async () => {
    const user = userEvent.setup();
    mockList([currentSession, otherSession]);
    let called = false;
    server.use(
      http.delete("*/api/v1/users/me/sessions", () => {
        called = true;
        return HttpResponse.json({ revoked: 1, message: "ok" });
      }),
    );

    renderWithProviders(<SessionsSection />);

    await user.click(await screen.findByRole("button", { name: /sessions\.revokeOthers/ }));
    await user.click(screen.getByRole("button", { name: /confirmRevokeOthers\.confirm/ }));

    await waitFor(() => {
      expect(called).toBe(true);
    });
  });

  it("shows the empty state without bulk actions for a single current session", async () => {
    mockList([currentSession]);

    renderWithProviders(<SessionsSection />);

    await screen.findByText(/sessions\.deviceLabel/);
    expect(screen.queryByRole("button", { name: /sessions\.revokeOthers/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /sessions\.revoke$/ })).toBeNull();
  });
});
