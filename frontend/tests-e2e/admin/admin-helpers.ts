import type { AdminActivity, AdminListItem, AdminUser } from "@/lib/types/admin";
import type { AdminFileListItem } from "@/lib/types/file";
import { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";

import { SELF_PERMISSIONS } from "../user-fixtures";

import type { Locale } from "./admin-strings";
import type { Page } from "@playwright/test";

const ALL_PERMISSIONS = Object.values(Permission) as Permission[];
// Self-service keys are granted through roles only: the direct-grant catalog and
// the admins list never carry them.
const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !p.startsWith("self."));

export const adminUser: AdminUser = {
  id: "admin-1",
  email: "admin@test.com",
  first_name: "Ada",
  last_name: "Admin",
  title: "Platform Admin",
  role: SystemRole.ADMIN,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  // A fully-permissioned admin so existing specs keep seeing every section.
  permissions: ALL_PERMISSIONS,
};

export const superadminUser: AdminUser = {
  ...adminUser,
  id: "superadmin-1",
  email: "superadmin@test.com",
  first_name: "Sue",
  last_name: "Super",
  role: SystemRole.SUPERADMIN,
  // The seeded root superadmin — unlocks the root-only tier actions.
  is_root_superadmin: true,
  // Superadmins bypass grants by role; /users/me omits the list for them.
  permissions: undefined,
};

// A second, non-root superadmin: a superadmin who must NOT see the root-only
// actions (promote/demote a superadmin, transfer root).
export const nonRootSuperadminUser: AdminUser = {
  ...superadminUser,
  id: "superadmin-2",
  email: "second-super@test.com",
  first_name: "Sam",
  last_name: "Second",
  is_root_superadmin: false,
};

// A plain admin holding only the given permissions, for RBAC gating specs.
export const makeAdmin = (permissions: Permission[]): AdminUser => ({
  ...adminUser,
  id: "limited-admin-1",
  email: "limited@test.com",
  permissions,
});

export const regularUser: AdminUser = {
  id: "user-1",
  email: "user@test.com",
  first_name: "Usain",
  last_name: "User",
  title: null,
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  permissions: SELF_PERMISSIONS,
};

export const injectSession = async (
  page: Page,
  user: AdminUser,
  locale: Locale = "fr",
): Promise<void> => {
  await page.context().addCookies([
    { name: "access_token", value: "fake-jwt-token", domain: "127.0.0.1", path: "/" },
    { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
  ]);
  await page.addInitScript(
    (data: string) => {
      window.localStorage.setItem("auth-storage", data);
    },
    JSON.stringify({
      state: { user, isAuthenticated: true },
      version: 0,
    }),
  );
};

export const mockMe = async (page: Page, user: AdminUser): Promise<void> => {
  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
};

export const mockAdminUsersList = async (
  page: Page,
  users: AdminUser[],
  total: number = users.length,
): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/users(\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = new URL(route.request().url());
    const skip = Number(url.searchParams.get("skip") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "25");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: users, total, skip, limit }),
    });
  });
};

export const mockAdminActivities = async (
  page: Page,
  rows: AdminActivity[] = [],
): Promise<void> => {
  const payload = JSON.stringify({ data: rows, total: rows.length, skip: 0, limit: 25 });
  // Global log is now a POST search; the per-user endpoint stays a GET.
  await page.route(/.*\/api\/v1\/admin\/activities\/search$/, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: payload });
  });
  await page.route(/.*\/api\/v1\/admin\/users\/[^/]+\/activities(\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: payload });
  });
};

export const mockAdminStats = async (
  page: Page,
  stats: Partial<{
    users_total: number;
    users_active: number;
    users_verified: number;
    users_admins: number;
    activities_total: number;
    activities_today: number;
  }> = {},
): Promise<void> => {
  const payload = JSON.stringify({
    users_total: 0,
    users_active: 0,
    users_verified: 0,
    users_admins: 0,
    activities_total: 0,
    activities_today: 0,
    ...stats,
  });
  await page.route(/.*\/api\/v1\/admin\/stats$/, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: payload });
  });
};

export const mockAdminUserDetail = async (page: Page, user: AdminUser): Promise<void> => {
  await page.route(new RegExp(`.*/api/v1/admin/users/${user.id}$`), async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
};

export const adminFile: AdminFileListItem = {
  id: "file-1",
  url: "https://res.cloudinary.com/test/image/upload/report.png",
  public_id: "uploads/report",
  content_type: "image/png",
  size: 4096,
  filename: "report.png",
  category: "general",
  uploaded_by_id: "user-1",
  uploaded_by: { id: "user-1", email: "user@test.com", first_name: "Usain", last_name: "User" },
  created_at: "2026-01-05T00:00:00Z",
};

export const adminListItems: AdminListItem[] = [
  {
    id: superadminUser.id,
    email: superadminUser.email,
    first_name: "Sue",
    last_name: "Super",
    role: SystemRole.SUPERADMIN,
    is_active: true,
    is_root_superadmin: true,
    permissions: ADMIN_PERMISSIONS,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: nonRootSuperadminUser.id,
    email: nonRootSuperadminUser.email,
    first_name: "Sam",
    last_name: "Second",
    role: SystemRole.SUPERADMIN,
    is_active: true,
    is_root_superadmin: false,
    permissions: ADMIN_PERMISSIONS,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "limited-admin-1",
    email: "limited@test.com",
    first_name: null,
    last_name: null,
    role: SystemRole.ADMIN,
    is_active: true,
    is_root_superadmin: false,
    permissions: [Permission.UsersRead],
    created_at: "2026-01-03T00:00:00Z",
  },
];

export const mockPermissionCatalog = async (page: Page): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/admins\/permissions$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ permissions: ADMIN_PERMISSIONS }),
    });
  });
};

export const mockAdminsList = async (
  page: Page,
  admins: AdminListItem[] = adminListItems,
): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/admins(\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = new URL(route.request().url());
    const skip = Number(url.searchParams.get("skip") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const role = url.searchParams.get("role") as SystemRole | null;
    const filtered = role ? admins.filter((admin) => admin.role === role) : admins;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: filtered.slice(skip, skip + limit),
        total: filtered.length,
        skip,
        limit,
      }),
    });
  });
};

export const mockAdminFilesList = async (
  page: Page,
  files: AdminFileListItem[],
  total: number = files.length,
): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/files(\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = new URL(route.request().url());
    const skip = Number(url.searchParams.get("skip") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "50");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: files, total, skip, limit }),
    });
  });
};
