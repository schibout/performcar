import { describe, expect, it, vi } from "vitest";

import type { AdminListItem } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

import { buildRowMenu } from "../admin-row-menu";

const makeRow = (overrides: Partial<AdminListItem> = {}): AdminListItem => ({
  id: "target",
  email: "target@test.com",
  first_name: null,
  last_name: null,
  role: SystemRole.ADMIN,
  is_active: true,
  is_root_superadmin: false,
  permissions: [],
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const menuKeys = (
  admin: AdminListItem,
  viewer: { isViewerRoot?: boolean; canWrite?: boolean; canDelete?: boolean; viewerId?: string },
): unknown[] =>
  (
    buildRowMenu({
      admin,
      isViewerRoot: viewer.isViewerRoot ?? false,
      canWrite: viewer.canWrite ?? false,
      canDelete: viewer.canDelete ?? false,
      viewerId: viewer.viewerId ?? "viewer",
      t: (key) => key,
      onManage: vi.fn(),
      onDelete: vi.fn(),
      onPromote: vi.fn(),
      onDemoteSuperadmin: vi.fn(),
    }) ?? []
  )
    .map((item) => item?.key)
    .filter(Boolean);

describe("buildRowMenu", () => {
  it("offers nothing to a read-only viewer", () => {
    expect(menuKeys(makeRow(), {})).toEqual([]);
  });

  it("follows admins:write and admins:delete separately", () => {
    expect(menuKeys(makeRow(), { canWrite: true })).toEqual(["manage-permissions"]);
    expect(menuKeys(makeRow(), { canDelete: true })).toEqual(["delete"]);
  });

  it("offers a delegated admin nothing on a superadmin row", () => {
    const row = makeRow({ role: SystemRole.SUPERADMIN });
    expect(menuKeys(row, { canWrite: true, canDelete: true })).toEqual([]);
  });

  it("offers a delegated admin nothing on its own row", () => {
    const row = makeRow({ id: "viewer" });
    expect(menuKeys(row, { canWrite: true, canDelete: true, viewerId: "viewer" })).toEqual([]);
  });

  it("keeps the superadmin tier actions for the root", () => {
    const allKeys = { isViewerRoot: true, canWrite: true, canDelete: true };
    expect(menuKeys(makeRow(), allKeys)).toEqual(["manage-permissions", "promote", "delete"]);
    expect(menuKeys(makeRow({ role: SystemRole.SUPERADMIN }), allKeys)).toEqual(["demote"]);
  });

  it("does not offer the tier actions to a non-root viewer holding every key", () => {
    const allKeys = { canWrite: true, canDelete: true };
    expect(menuKeys(makeRow(), allKeys)).toEqual(["manage-permissions", "delete"]);
    expect(menuKeys(makeRow({ role: SystemRole.SUPERADMIN }), allKeys)).toEqual([]);
  });
});
