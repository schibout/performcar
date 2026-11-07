import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AvatarUpload } from "@/components/common/file-upload/AvatarUpload";
import { toast } from "@/lib/toast";
import type { FilePublic } from "@/lib/types/file";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { DEFAULT_MAX_UPLOAD_SIZE } from "../file-upload-utils";

vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockFile: FilePublic = {
  id: "f-1",
  url: "https://cdn.test/a.png",
  content_type: "image/png",
  size: 1234,
  filename: "a.png",
  category: "general",
  created_at: "2026-01-01T00:00:00Z",
};

const fileInput = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not found");
  return input;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AvatarUpload", () => {
  it("shows only the upload action when empty", () => {
    renderWithProviders(<AvatarUpload value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /upload:upload/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload:remove/ })).not.toBeInTheDocument();
  });

  it("disables Remove when disabled is set and removeDisabled is not", () => {
    renderWithProviders(<AvatarUpload value={mockFile} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeDisabled();
  });

  it("lets removeDisabled override disabled for Remove only", () => {
    renderWithProviders(
      <AvatarUpload value={mockFile} onChange={vi.fn()} disabled removeDisabled={false} />,
    );
    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeEnabled();
  });

  it("shows preview/replace/remove actions when a file is set", () => {
    renderWithProviders(<AvatarUpload value={mockFile} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeInTheDocument();
  });

  it("clears the value when remove is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<AvatarUpload value={mockFile} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /upload:remove/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("rejects an unsupported type with a toast and no upload", () => {
    const onChange = vi.fn();
    const { container } = renderWithProviders(<AvatarUpload value={null} onChange={onChange} />);

    // fireEvent (not userEvent.upload) so the input's `accept` filter doesn't
    // silently drop the mismatched file before our handler validates it.
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] },
    });

    expect(toast.error).toHaveBeenCalledWith("upload:errors.invalid_type");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AvatarUpload value={null} onChange={onChange} />);

    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: DEFAULT_MAX_UPLOAD_SIZE + 1 });
    await user.upload(fileInput(container), big);

    expect(toast.error).toHaveBeenCalledWith("upload:errors.too_large");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stages a picked file for preview without uploading", async () => {
    const uploadSpy = vi.fn(() => HttpResponse.json(mockFile, { status: 201 }));
    server.use(http.post("*/api/v1/upload", uploadSpy));
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AvatarUpload value={null} onChange={onChange} />);

    await user.upload(fileInput(container), new File(["x"], "a.png", { type: "image/png" }));

    // Picking only stages the file locally — Save/Discard appear, but no upload
    // and no onChange fire until the user confirms.
    expect(await screen.findByRole("button", { name: /upload:save/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload:discard/ })).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uploads on save and reports the stored file via onChange", async () => {
    server.use(http.post("*/api/v1/upload", () => HttpResponse.json(mockFile, { status: 201 })));
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AvatarUpload value={null} onChange={onChange} />);

    await user.upload(fileInput(container), new File(["x"], "a.png", { type: "image/png" }));
    await user.click(await screen.findByRole("button", { name: /upload:save/ }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(mockFile);
    });
  });

  it("discards a staged file without uploading", async () => {
    const uploadSpy = vi.fn(() => HttpResponse.json(mockFile, { status: 201 }));
    server.use(http.post("*/api/v1/upload", uploadSpy));
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<AvatarUpload value={null} onChange={onChange} />);

    await user.upload(fileInput(container), new File(["x"], "a.png", { type: "image/png" }));
    await user.click(await screen.findByRole("button", { name: /upload:discard/ }));

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    // Back to the empty state with only the upload action.
    expect(screen.getByRole("button", { name: /upload:upload/ })).toBeInTheDocument();
  });
});
