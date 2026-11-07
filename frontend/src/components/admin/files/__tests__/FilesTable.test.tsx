import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { FilesTable } from "@/components/admin/files/FilesTable";
import type { AdminFileListItem } from "@/lib/types/file";
import { renderWithProviders } from "@/test/test-utils";

const imageRow: AdminFileListItem = {
  id: "f-1",
  url: "https://cdn.test/a.png",
  public_id: "uploads/abc",
  content_type: "image/png",
  size: 2048,
  filename: "photo.png",
  category: "general",
  uploaded_by_id: "u-1",
  uploaded_by: { id: "u-1", email: "ali@test.com", first_name: "Ali", last_name: "Kemal" },
  created_at: "2026-01-01T00:00:00Z",
};

const orphanRow: AdminFileListItem = {
  ...imageRow,
  id: "f-2",
  uploaded_by_id: null,
  uploaded_by: null,
};

const makeProps = () => ({ canDelete: true, onPreview: vi.fn(), onDelete: vi.fn() });

describe("FilesTable", () => {
  it("renders a row with filename and uploader name + email", () => {
    renderWithProviders(<FilesTable rows={[imageRow]} isLoading={false} {...makeProps()} />);
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("Ali Kemal")).toBeInTheDocument();
    expect(screen.getByText("ali@test.com")).toBeInTheDocument();
  });

  it("shows a dash when the file has no uploader", () => {
    renderWithProviders(<FilesTable rows={[orphanRow]} isLoading={false} {...makeProps()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    renderWithProviders(<FilesTable rows={[]} isLoading={false} {...makeProps()} />);
    expect(screen.getByText(/admin:files\.empty/)).toBeInTheDocument();
  });

  it("shows the loading label while waiting", () => {
    renderWithProviders(<FilesTable rows={[]} isLoading {...makeProps()} />);
    expect(screen.getByText(/admin:files\.loading/)).toBeInTheDocument();
  });

  it("calls onPreview and onDelete from the row actions", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderWithProviders(<FilesTable rows={[imageRow]} isLoading={false} {...props} />);

    await user.click(
      screen.getAllByRole("button", { name: /admin:files\.rowActions\.preview/ })[0],
    );
    expect(props.onPreview).toHaveBeenCalledWith(imageRow);

    await user.click(screen.getByRole("button", { name: /admin:files\.rowActions\.delete/ }));
    expect(props.onDelete).toHaveBeenCalledWith(imageRow);
  });
});
