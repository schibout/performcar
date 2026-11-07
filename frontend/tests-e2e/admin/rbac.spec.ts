import { Permission } from "@/lib/types/permissions";

import enErrors from "../../src/i18n/locales/en/errors.json";
import frErrors from "../../src/i18n/locales/fr/errors.json";
import { test, expect } from "../base-test";
import {
  adminUser,
  injectSession,
  makeAdmin,
  mockAdminActivities,
  mockAdminsList,
  mockAdminStats,
  mockAdminUserDetail,
  mockAdminUsersList,
  mockMe,
  mockPermissionCatalog,
  nonRootSuperadminUser,
  regularUser,
  superadminUser,
} from "./admin-helpers";
import { LOCALES, getStrings } from "./admin-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;

  test.describe(`Admin RBAC [${locale}]`, () => {
    test("nav shows only the sections the admin has read access to", async ({ page }) => {
      const limited = makeAdmin([Permission.UsersRead, Permission.StatsRead]);
      await injectSession(page, limited, locale);
      await mockMe(page, limited);
      await mockAdminStats(page);
      await mockAdminUsersList(page, []);

      await page.goto(`/${locale}/admin/dashboard`);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/dashboard`));

      const nav = page.locator("nav").first();
      await expect(nav.getByRole("link", { name: s.shell.nav.users, exact: true })).toBeVisible();
      await expect(nav.getByRole("link", { name: s.shell.nav.files, exact: true })).toHaveCount(0);
      await expect(
        nav.getByRole("link", { name: s.shell.nav.activities, exact: true }),
      ).toHaveCount(0);
      await expect(nav.getByRole("link", { name: s.shell.nav.support, exact: true })).toHaveCount(
        0,
      );
      await expect(nav.getByRole("link", { name: s.shell.nav.admins, exact: true })).toHaveCount(0);
    });

    test("a section the admin lacks read access to renders the forbidden state", async ({
      page,
    }) => {
      const limited = makeAdmin([Permission.UsersRead]);
      await injectSession(page, limited, locale);
      await mockMe(page, limited);

      await page.goto(`/${locale}/admin/files`);
      await expect(page.getByText(s.permissionDenied.title)).toBeVisible();
    });

    test("row actions are hidden without the matching permission", async ({ page }) => {
      const readOnly = makeAdmin([Permission.UsersRead]);
      await injectSession(page, readOnly, locale);
      await mockMe(page, readOnly);
      await mockAdminUsersList(page, [regularUser], 1);

      await page.goto(`/${locale}/admin/users`);
      await expect(page.getByText(regularUser.email)).toBeVisible();
      // No destructive grants → the row "⋯" menu trigger is not rendered.
      await expect(page.getByRole("button", { name: s.users.rowActions.menu })).toHaveCount(0);
    });

    test("row actions appear once the permission is granted", async ({ page }) => {
      const canDelete = makeAdmin([Permission.UsersRead, Permission.UsersDelete]);
      await injectSession(page, canDelete, locale);
      await mockMe(page, canDelete);
      await mockAdminUsersList(page, [regularUser], 1);

      await page.goto(`/${locale}/admin/users`);
      await expect(page.getByRole("button", { name: s.users.rowActions.menu })).toBeVisible();
    });

    test("superadmin sees the Admins section and can manage it", async ({ page }) => {
      await injectSession(page, superadminUser, locale);
      await mockMe(page, superadminUser);
      await mockAdminsList(page);
      await mockPermissionCatalog(page);

      await page.goto(`/${locale}/admin/admins`);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/admins`));
      await expect(page.getByRole("heading", { name: s.admins.title })).toBeVisible();
      await expect(
        page.getByRole("button", { name: s.admins.create.action }).first(),
      ).toBeVisible();
      // The name cell renders the email twice for accounts without a name
      // (title + subtitle), so a bare text locator trips strict mode.
      await expect(page.getByText("limited@test.com").first()).toBeVisible();

      const nav = page.locator("nav").first();
      await expect(nav.getByRole("link", { name: s.shell.nav.admins, exact: true })).toBeVisible();
    });

    test("the root superadmin sees the superadmin-tier actions", async ({ page }) => {
      await injectSession(page, superadminUser, locale);
      await mockMe(page, superadminUser);
      await mockAdminsList(page);
      await mockPermissionCatalog(page);

      await page.goto(`/${locale}/admin/admins`);
      // Root-only header action is offered.
      await expect(page.getByRole("button", { name: s.admins.transferRoot.action })).toBeVisible();

      // The plain-admin row menu offers promote + delete (root-tier actions).
      await page
        .getByRole("row", { name: /limited@test\.com/ })
        .getByRole("button", { name: s.admins.rowActions.menu })
        .click();
      await expect(
        page.getByRole("menuitem", { name: s.admins.promoteSuperadmin.action }),
      ).toBeVisible();
      await expect(page.getByRole("menuitem", { name: s.admins.delete.action })).toBeVisible();
      await page.keyboard.press("Escape");

      // The non-root superadmin row offers the demote action.
      await page
        .getByRole("row", { name: /second-super@test\.com/ })
        .getByRole("button", { name: s.admins.rowActions.menu })
        .click();
      await expect(
        page.getByRole("menuitem", { name: s.admins.demoteToAdmin.action }),
      ).toBeVisible();
    });

    test("a non-root superadmin does not see the root-only actions", async ({ page }) => {
      await injectSession(page, nonRootSuperadminUser, locale);
      await mockMe(page, nonRootSuperadminUser);
      await mockAdminsList(page);
      await mockPermissionCatalog(page);

      await page.goto(`/${locale}/admin/admins`);
      // Still manages admins (create), but the root-only tier actions are gone.
      await expect(
        page.getByRole("button", { name: s.admins.create.action }).first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: s.admins.transferRoot.action })).toHaveCount(0);

      // The plain-admin row menu has no promote item for a non-root viewer.
      await page
        .getByRole("row", { name: /limited@test\.com/ })
        .getByRole("button", { name: s.admins.rowActions.menu })
        .click();
      await expect(page.getByRole("menuitem", { name: s.admins.managePermissions })).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: s.admins.promoteSuperadmin.action }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");

      // Superadmin rows expose no row menu at all to a non-root viewer.
      await expect(
        page
          .getByRole("row", { name: /second-super@test\.com/ })
          .getByRole("button", { name: s.admins.rowActions.menu }),
      ).toHaveCount(0);
    });

    test("the create-admin modal opens with the account fields", async ({ page }) => {
      await injectSession(page, superadminUser, locale);
      await mockMe(page, superadminUser);
      await mockAdminsList(page);
      await mockPermissionCatalog(page);

      await page.goto(`/${locale}/admin/admins`);
      await page.getByRole("button", { name: s.admins.create.action }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(s.admins.create.emailLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(s.admins.create.passwordLabel, { exact: true })).toBeVisible();
    });

    test("an admin without admins:read cannot open the Admins page", async ({ page }) => {
      // Holds every other key, so only admins:read can explain the refusal.
      const withoutAdminsRead = makeAdmin(
        (Object.values(Permission) as Permission[]).filter((p) => p !== Permission.AdminsRead),
      );
      await injectSession(page, withoutAdminsRead, locale);
      await mockMe(page, withoutAdminsRead);

      await page.goto(`/${locale}/admin/admins`);
      await expect(page.getByText(s.permissionDenied.title)).toBeVisible();
      await expect(page.getByRole("heading", { name: s.admins.title })).toHaveCount(0);
    });

    test("a plain admin holding admins:read opens the Admins page without write actions", async ({
      page,
    }) => {
      const reader = makeAdmin([Permission.AdminsRead]);
      await injectSession(page, reader, locale);
      await mockMe(page, reader);
      await mockAdminsList(page);
      await mockPermissionCatalog(page);

      await page.goto(`/${locale}/admin/admins`);
      await expect(page.getByRole("heading", { name: s.admins.title })).toBeVisible();
      await expect(page.getByText(s.permissionDenied.title)).toHaveCount(0);
      await expect(page.getByRole("button", { name: s.admins.create.action })).toHaveCount(0);
    });

    test("an admin visiting a user-area page is redirected into the admin panel", async ({
      page,
    }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminStats(page);
      await mockAdminUsersList(page, [adminUser], 1);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/dashboard`));
    });

    test("an admin can open their own profile inside the panel", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);

      await page.goto(`/${locale}/admin/profile`);
      // Not bounced out — the profile renders inside the admin shell. The
      // identity band heading replaced the old static page title.
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/profile`));
      await expect(page.getByRole("heading", { name: "Ada Admin" })).toBeVisible();

      const nav = page.locator("nav").first();
      await expect(nav.getByRole("link", { name: s.shell.nav.profile, exact: true })).toBeVisible();
    });
  });
}

const errorsByLocale = { en: enErrors, fr: frErrors } as const;

const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

const memberRole = {
  id: "role-member",
  key: "member",
  name: "Member",
  description: null,
  audience: "user",
  is_system: true,
  permission_sets: [],
  ...stamp,
};
const premiumRole = {
  ...memberRole,
  id: "role-premium",
  key: "premium",
  name: "Premium",
  is_system: false,
};

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;
  const errors = errorsByLocale[locale];

  test.describe(`Admin roles and permission sets [${locale}]`, () => {
    test("nav lists only the access-control pages the admin may read", async ({ page }) => {
      const reader = makeAdmin([Permission.RolesRead, Permission.StatsRead]);
      await injectSession(page, reader, locale);
      await mockMe(page, reader);
      await mockAdminStats(page);

      await page.goto(`/${locale}/admin/dashboard`);
      const nav = page.locator("nav").first();
      await expect(nav.getByRole("link", { name: s.shell.nav.roles, exact: true })).toBeVisible();
      await expect(
        nav.getByRole("link", { name: s.shell.nav["permission-sets"], exact: true }),
      ).toHaveCount(0);
    });

    test("an admin without the read permission gets the forbidden state", async ({ page }) => {
      const limited = makeAdmin([Permission.UsersRead]);
      await injectSession(page, limited, locale);
      await mockMe(page, limited);

      await page.goto(`/${locale}/admin/roles`);
      await expect(page.getByText(s.permissionDenied.title)).toBeVisible();
    });

    test("a system role has no delete and a refused delete says why", async ({ page }) => {
      const writer = makeAdmin([
        Permission.RolesRead,
        Permission.RolesWrite,
        Permission.PermissionSetsRead,
      ]);
      await injectSession(page, writer, locale);
      await mockMe(page, writer);
      await page.route(/.*\/api\/v1\/admin\/rbac\/roles$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [memberRole, premiumRole] }),
        });
      });
      await page.route(/.*\/api\/v1\/admin\/rbac\/roles\/role-premium$/, async (route) => {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ detail: "error.rbac.role_in_use" }),
        });
      });

      await page.goto(`/${locale}/admin/roles`);
      const system = page.getByTestId("role-row-member");
      await expect(system).toBeVisible();
      await expect(system.getByRole("button", { name: new RegExp(s.rbac.delete) })).toHaveCount(0);

      await page
        .getByTestId("role-row-premium")
        .getByRole("button", { name: new RegExp(s.rbac.delete) })
        .click();
      await page
        .locator(".ant-modal-footer")
        .getByRole("button", { name: s.rbac.roles.delete.confirm, exact: true })
        .click();
      await expect(page.getByTestId("rbac-api-error")).toHaveText(errors.error.rbac.role_in_use);
    });

    test("the user page shows the source of each permission and assigns a role with an expiry", async ({
      page,
    }) => {
      const manager = makeAdmin([
        Permission.UsersRead,
        Permission.UsersWrite,
        Permission.RolesRead,
      ]);
      await injectSession(page, manager, locale);
      await mockMe(page, manager);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);

      const access = {
        account_role: "user",
        roles: [
          {
            id: "role-member",
            key: "member",
            name: "Member",
            audience: "user",
            expires_at: null,
            expired: false,
          },
        ],
        permission_sets: [],
        direct_permissions: [],
        effective: [
          { permission: "self.profile:update", sources: [{ kind: "role", key: "member" }] },
        ],
      };
      await page.route(/.*\/api\/v1\/admin\/users\/user-1\/access$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(access),
        });
      });
      await page.route(/.*\/api\/v1\/admin\/rbac\/roles$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [memberRole, premiumRole] }),
        });
      });
      let putBody: string | null = null;
      await page.route(/.*\/api\/v1\/admin\/users\/user-1\/roles$/, async (route) => {
        putBody = route.request().postData();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(access),
        });
      });

      await page.goto(`/${locale}/admin/users/${regularUser.id}`);
      const row = page.getByTestId("effective-self.profile:update");
      await expect(row).toBeVisible();
      await expect(row).toContainText(`${s.rbac.access.source.role} · member`);

      await page.getByRole("button", { name: s.rbac.access.manageRoles }).click();
      await page.getByRole("checkbox", { name: /Premium/ }).check();
      // The held Member role has its own expiry input: target the one being assigned.
      await page
        .getByRole("textbox", { name: `${s.rbac.access.assign.expiresLabel} · Premium` })
        .fill("2030-01-02T10:00");
      await page.getByRole("button", { name: s.rbac.access.assign.save }).click();

      await expect.poll(() => putBody).toContain('"id":"role-premium","expires_at":"');
    });
  });
}
