import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnnouncementPreview } from "@/components/admin/broadcasts/AnnouncementPreview";

// react-i18next is mocked globally in src/test/setup.ts: t(key) → "broadcasts:<key>"
// and i18n.language is "en". Custom translations are read verbatim by the render
// helper (no t()), so they surface as real text we can assert on.

describe("AnnouncementPreview", () => {
  it("shows the empty state when there is no content", () => {
    render(<AnnouncementPreview kind="custom" level="info" translations={{}} />);

    expect(screen.getByText("broadcasts:admin.previewEmpty")).toBeInTheDocument();
  });

  it("renders the title and body from custom translations", () => {
    render(
      <AnnouncementPreview
        kind="custom"
        level="info"
        translations={{ en: { title: "Hello", body: "A preview body." } }}
      />,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("A preview body.")).toBeInTheDocument();
    expect(screen.getByText("broadcasts:admin.previewLabel")).toBeInTheDocument();
  });

  it("applies the info level accent", () => {
    const { container } = render(
      <AnnouncementPreview
        kind="custom"
        level="info"
        translations={{ en: { title: "T", body: "B" } }}
      />,
    );

    expect(container.querySelector(".border-l-primary")).not.toBeNull();
  });

  it("applies the warning level accent", () => {
    const { container } = render(
      <AnnouncementPreview
        kind="custom"
        level="warning"
        translations={{ en: { title: "T", body: "B" } }}
      />,
    );

    expect(container.querySelector(".border-l-yellow-500")).not.toBeNull();
  });

  it("applies the critical level accent", () => {
    const { container } = render(
      <AnnouncementPreview
        kind="custom"
        level="critical"
        translations={{ en: { title: "T", body: "B" } }}
      />,
    );

    expect(container.querySelector(".border-l-destructive")).not.toBeNull();
  });
});
