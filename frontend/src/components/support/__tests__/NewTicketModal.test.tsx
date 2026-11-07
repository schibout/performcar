import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { NewTicketModal } from "@/components/support/NewTicketModal";
import { server } from "@/test/msw/server";
import { createWrapper } from "@/test/test-utils";

const ticketResponse = {
  ticket: {
    id: "t-1",
    subject: "Login keeps failing",
    status: "open",
    priority: "normal",
    last_message_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    closed_at: null,
    messages: [],
  },
  message: "success.support.ticketCreated",
};

const renderModal = (open: boolean) => {
  const onOpenChange = vi.fn();
  const Wrapper = createWrapper();
  render(
    <Wrapper>
      <NewTicketModal open={open} onOpenChange={onOpenChange} />
    </Wrapper>,
  );
  return { onOpenChange };
};

describe("NewTicketModal", () => {
  it("does not render its fields when closed", () => {
    renderModal(false);
    expect(screen.queryByText("support:new.subjectLabel")).not.toBeInTheDocument();
  });

  it("renders the form when open", () => {
    renderModal(true);
    expect(screen.getByText("support:new.title")).toBeInTheDocument();
    expect(screen.getByText("support:new.subjectLabel")).toBeInTheDocument();
    expect(screen.getByText("support:new.bodyLabel")).toBeInTheDocument();
  });

  it("creates a ticket and closes on a valid submit", async () => {
    let requestBody: unknown;
    server.use(
      http.post("*/api/v1/support/tickets", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(ticketResponse, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { onOpenChange } = renderModal(true);

    const textboxes = screen.getAllByRole("textbox");
    await user.type(textboxes[0], "Login keeps failing");
    await user.type(textboxes[1], "I cannot sign in to my account at all");
    await user.click(screen.getByRole("button", { name: /support:new\.submit/ }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(requestBody).toMatchObject({
      subject: "Login keeps failing",
      body: "I cannot sign in to my account at all",
    });
  });

  it("blocks submission when fields are too short", async () => {
    const onCreate = vi.fn();
    server.use(http.post("*/api/v1/support/tickets", onCreate));
    const user = userEvent.setup();
    renderModal(true);

    // A 2-char subject trips the min(5) rule, surfacing the custom message.
    await user.type(screen.getAllByRole("textbox")[0], "ab");
    await user.click(screen.getByRole("button", { name: /support:new\.submit/ }));

    await waitFor(() => {
      expect(screen.getByText(/subjectMin/)).toBeInTheDocument();
    });
    expect(onCreate).not.toHaveBeenCalled();
  });
});
