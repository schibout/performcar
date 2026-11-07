import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageThread } from "@/components/support/MessageThread";
import type { FilePublic } from "@/lib/types/file";
import type { SupportMessage } from "@/lib/types/support";

const file: FilePublic = {
  id: "f-1",
  url: "https://cdn.test/shot.png",
  content_type: "image/png",
  size: 1000,
  filename: "shot.png",
  category: "support_attachment",
  created_at: "2026-01-01T00:00:00Z",
};

const msg = (overrides: Partial<SupportMessage> = {}): SupportMessage => ({
  id: "m-1",
  sender_id: "u-1",
  sender_role: "user",
  body: "Hello there",
  read_at: null,
  created_at: "2026-01-01T00:00:00Z",
  attachments: [],
  ...overrides,
});

describe("MessageThread", () => {
  it("shows the empty state for an empty thread", () => {
    render(<MessageThread messages={[]} viewerRole="user" />);
    expect(screen.getByText("support:detail.empty")).toBeInTheDocument();
  });

  it("labels the viewer's own messages as 'you'", () => {
    render(<MessageThread messages={[msg({ sender_role: "user" })]} viewerRole="user" />);
    expect(screen.getByText(/support:detail\.you/)).toBeInTheDocument();
  });

  it("labels the counterpart's messages with the supplied label", () => {
    render(
      <MessageThread
        messages={[msg({ sender_role: "user" })]}
        viewerRole="admin"
        counterpartLabel="Jane Doe"
      />,
    );
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
  });

  it("falls back to the support-team label when no counterpart label is given", () => {
    render(<MessageThread messages={[msg({ sender_role: "admin" })]} viewerRole="user" />);
    expect(screen.getByText(/support:detail\.supportTeam/)).toBeInTheDocument();
  });

  it("links attachment images served from the trusted Cloudinary origin", () => {
    const trustedFile: FilePublic = { ...file, url: "https://res.cloudinary.com/demo/shot.png" };
    render(
      <MessageThread
        messages={[msg({ attachments: [{ id: "a-1", file: trustedFile }] })]}
        viewerRole="user"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", trustedFile.url);
    const image = within(link).getByRole("img");
    // next/image rewrites src to the optimizer URL, so assert the original
    // file url survives as the encoded `url` param rather than matching raw.
    expect(image.getAttribute("src")).toContain(encodeURIComponent(trustedFile.url));
  });

  it("renders untrusted attachment urls as a non-clickable preview", () => {
    // `file.url` is a non-Cloudinary origin, so AttachmentThumb must show the
    // image without turning it into a navigable link (defense-in-depth).
    render(
      <MessageThread messages={[msg({ attachments: [{ id: "a-1", file }] })]} viewerRole="user" />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("reveals the jump-to-latest button only when scrolled up", () => {
    const { container } = render(
      <MessageThread messages={[msg(), msg({ id: "m-2" })]} viewerRole="user" />,
    );
    const scroller = container.querySelector(".overflow-y-auto");
    if (!scroller) throw new Error("scroll container not found");

    // jsdom has no layout, so fake an overflowing, scrolled-up container.
    Object.defineProperty(scroller, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(scroller, "clientHeight", { value: 300, configurable: true });
    Object.defineProperty(scroller, "scrollTop", { value: 0, configurable: true, writable: true });
    fireEvent.scroll(scroller);

    expect(
      screen.getByRole("button", { name: /support:detail\.jumpToLatest/ }),
    ).toBeInTheDocument();
  });
});
