import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { FilesFilters } from "@/components/admin/files/FilesFilters";
import { renderWithProviders } from "@/test/test-utils";

const makeProps = (overrides = {}) => ({
  contentType: "all",
  onContentTypeChange: vi.fn(),
  uploader: "",
  onUploaderChange: vi.fn(),
  onReset: vi.fn(),
  hasFilters: false,
  ...overrides,
});

describe("FilesFilters", () => {
  it("forwards uploader input changes", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<FilesFilters {...props} />);

    await user.type(screen.getByPlaceholderText(/admin:files\.filters\.uploaderPlaceholder/), "x");
    expect(props.onUploaderChange).toHaveBeenCalledWith("x");
  });

  it("hides the reset button when no filters are active", () => {
    renderWithProviders(<FilesFilters {...makeProps({ hasFilters: false })} />);
    expect(
      screen.queryByRole("button", { name: /admin:files\.filters\.reset/ }),
    ).not.toBeInTheDocument();
  });

  it("calls onReset from the reset button when filters are active", async () => {
    const user = userEvent.setup();
    const props = makeProps({ hasFilters: true, uploader: "ali" });
    renderWithProviders(<FilesFilters {...props} />);

    await user.click(screen.getByRole("button", { name: /admin:files\.filters\.reset/ }));
    expect(props.onReset).toHaveBeenCalled();
  });
});
