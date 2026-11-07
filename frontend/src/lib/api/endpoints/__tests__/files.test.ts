import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import { adminFilesApi, filesApi } from "@/lib/api/endpoints/files";
import type { AdminFileListItem, FilePublic } from "@/lib/types/file";
import { server } from "@/test/msw/server";

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

describe("filesApi.upload", () => {
  it("posts the file as multipart/form-data and returns the stored file", async () => {
    let contentType: string | null = null;
    server.use(
      http.post("*/api/v1/upload", ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json(mockFile, { status: 201 });
      }),
    );

    const file = new File(["bytes"], "a.png", { type: "image/png" });
    const result = await filesApi.upload(file);

    expect(result.id).toBe("f-1");
    expect(result.url).toBe("https://cdn.test/a.png");
    // The instance's default JSON header must be stripped so the browser sets
    // a multipart boundary; otherwise the FormData would be JSON-serialized.
    expect(contentType).toMatch(/^multipart\/form-data/);
  });
});

describe("adminFilesApi", () => {
  it("list forwards defined filters and prunes undefined ones", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/admin/files", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [mockAdminFile], total: 1, skip: 0, limit: 50 });
      }),
    );

    const result = await adminFilesApi.list({
      uploader: "ali",
      content_type: undefined,
      limit: 50,
    });

    expect(result.total).toBe(1);
    expect(result.data[0].uploaded_by?.email).toBe("ali@test.com");
    expect(requestedUrl).toContain("uploader=ali");
    expect(requestedUrl).toContain("limit=50");
    expect(requestedUrl).not.toContain("content_type");
  });

  it("get fetches a single file by id", async () => {
    server.use(http.get("*/api/v1/admin/files/f-1", () => HttpResponse.json(mockAdminFile)));
    const result = await adminFilesApi.get("f-1");
    expect(result.id).toBe("f-1");
    expect(result.public_id).toBe("uploads/abc");
  });

  it("delete hits the delete endpoint", async () => {
    let method = "";
    server.use(
      http.delete("*/api/v1/admin/files/f-1", ({ request }) => {
        method = request.method;
        return HttpResponse.json({ success: true, message: "success.file.deleted" });
      }),
    );
    const result = await adminFilesApi.delete("f-1");
    expect(method).toBe("DELETE");
    expect(result.success).toBe(true);
  });
});
