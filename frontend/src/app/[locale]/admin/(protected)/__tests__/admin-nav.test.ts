import { describe, expect, it } from "vitest";

import { buildAdminNav, type AdminNavCaps } from "../admin-nav";

const noCaps: AdminNavCaps = {
  canReadUsers: false,
  canReadFiles: false,
  canReadActivities: false,
  canReadSupport: false,
  canReadBroadcasts: false,
  canReadSystemSettings: false,
  canReadAdmins: false,
  canReadRoles: false,
  canReadPermissionSets: false,
  canReadQuotes: false,
  canReadCustomers: false,
  canReadCatalog: false,
  canReadDealerships: false,
  canUseAssistant: false,
};

const itemKeys = (caps: AdminNavCaps): string[] =>
  buildAdminNav(caps).flatMap((section) => section.items.map((item) => item.key));

describe("buildAdminNav", () => {
  it("shows the admins entry to an account holding admins:read", () => {
    expect(itemKeys({ ...noCaps, canReadAdmins: true })).toContain("admins");
  });

  it("hides the admins entry without admins:read", () => {
    expect(itemKeys({ ...noCaps, canReadUsers: true })).not.toContain("admins");
  });

  it("shows the access-control entries only to accounts holding the read permissions", () => {
    expect(itemKeys({ ...noCaps, canReadRoles: true })).toContain("roles");
    expect(itemKeys({ ...noCaps, canReadRoles: true })).not.toContain("permission-sets");
    expect(itemKeys({ ...noCaps, canReadPermissionSets: true })).toContain("permission-sets");
    expect(itemKeys(noCaps)).not.toContain("roles");
    expect(itemKeys(noCaps)).not.toContain("permission-sets");
  });

  it("shows the dealer network entries only with their read permissions", () => {
    expect(itemKeys({ ...noCaps, canReadQuotes: true })).toEqual([
      "dashboard",
      "quotes",
      "notifications",
      "profile",
    ]);
    expect(itemKeys({ ...noCaps, canReadCatalog: true })).toContain("catalog");
    expect(itemKeys({ ...noCaps, canReadDealerships: true })).toContain("dealerships");
    expect(itemKeys(noCaps)).not.toContain("customers");
  });

  it("shows the AI section only with self.assistant:use", () => {
    const sections = buildAdminNav({ ...noCaps, canUseAssistant: true });
    expect(sections.find((section) => section.key === "ai")?.items.map((item) => item.key)).toEqual(
      ["assistant", "assistant-communication"],
    );
    expect(itemKeys(noCaps)).not.toContain("assistant");
  });

  it("drops a section left without any item", () => {
    const sections = buildAdminNav(noCaps).map((section) => section.key);
    expect(sections).toEqual(["overview", "account"]);
  });
});
