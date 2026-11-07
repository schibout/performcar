import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi } from "vitest";

import {
  useAdminFile,
  useAdminFiles,
  useDeleteAdminFile,
  useUploadFile,
} from "@/hooks/api/use-files";
import type { AdminFileListItem, FilePublic } from "@/lib/types/file";
import { server } from "@/test/msw/server";
import { createWrapper } from "@/test/test-utils";

const mockFile: FilePublic = {
  id: "f-1",
  url: "https://cdn.test/a.png",
  content_type: "image/png",
  size: 1234,
  filename: "a.png",
  category: "general",
  created_at: "2026-01-01T00:00:00Z",
};

const mockAdminFile: AdminFileListItem = {
  ...mockFile,
  public_id: "uploads/abc",
  uploaded_by_id: "u-1",
  uploaded_by: { id: "u-1", email: "ali@test.com", first_name: "Ali", last_name: "Kemal" },
};

describe("useUploadFile", () => {
  it("uploads a file and returns the stored FilePublic", async () => {
    server.use(http.post("*/api/v1/upload", () => HttpResponse.json(mockFile, { status: 201 })));
    const { result } = renderHook(() => useUploadFile(), { wrapper: createWrapper() });

    result.current.mutate({ file: new File(["x"], "a.png", { type: "image/png" }) });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.id).toBe("f-1");
  });
});

describe("useAdminFiles", () => {
  it("fetches the file list with total", async () => {
    server.use(
      http.get("*/api/v1/admin/files", () =>
        HttpResponse.json({ data: [mockAdminFile], total: 1, skip: 0, limit: 50 }),
      ),
    );
    const { result } = renderHook(() => useAdminFiles({ limit: 50 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data[0].uploaded_by?.email).toBe("ali@test.com");
  });

  it("forwards the uploader filter to the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/admin/files", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [], total: 0, skip: 0, limit: 50 });
      }),
    );
    const { result } = renderHook(() => useAdminFiles({ uploader: "ali" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("uploader=ali");
  });
});

describe("useAdminFile", () => {
  it("stays idle when id is undefined", () => {
    const { result } = renderHook(() => useAdminFile(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches a single file by id", async () => {
    server.use(http.get("*/api/v1/admin/files/f-1", () => HttpResponse.json(mockAdminFile)));
    const { result } = renderHook(() => useAdminFile("f-1"), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.id).toBe("f-1");
  });
});

describe("useDeleteAdminFile", () => {
  it("deletes a file via the admin endpoint", async () => {
    const handler = vi.fn(() => HttpResponse.json({ success: true, message: "ok" }));
    server.use(http.delete("*/api/v1/admin/files/f-1", handler));
    const { result } = renderHook(() => useDeleteAdminFile(), { wrapper: createWrapper() });

    result.current.mutate("f-1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(handler).toHaveBeenCalled();
  });
});
