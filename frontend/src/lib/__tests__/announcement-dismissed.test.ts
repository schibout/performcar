import { beforeEach, describe, expect, it } from "vitest";

import { dismissAnnouncement, isAnnouncementDismissed } from "@/lib/announcement-dismissed";

const KEY = "dismissedAnnouncements";

describe("announcement-dismissed", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reports a fresh announcement as not dismissed", () => {
    expect(isAnnouncementDismissed("a1")).toBe(false);
  });

  it("persists a dismissal so it reads back as dismissed", () => {
    dismissAnnouncement("a1");
    expect(isAnnouncementDismissed("a1")).toBe(true);
  });

  it("keeps dismissals isolated per announcement id", () => {
    dismissAnnouncement("a1");
    expect(isAnnouncementDismissed("a1")).toBe(true);
    expect(isAnnouncementDismissed("a2")).toBe(false);
  });

  it("is idempotent — dismissing twice stores the id once", () => {
    dismissAnnouncement("a1");
    dismissAnnouncement("a1");

    const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    expect(stored).toEqual(["a1"]);
  });

  it("accumulates multiple dismissed ids", () => {
    dismissAnnouncement("a1");
    dismissAnnouncement("a2");

    expect(isAnnouncementDismissed("a1")).toBe(true);
    expect(isAnnouncementDismissed("a2")).toBe(true);
  });

  it("treats corrupt storage as an empty dismissal set", () => {
    window.localStorage.setItem(KEY, "not-json");

    expect(isAnnouncementDismissed("a1")).toBe(false);
    // A dismissal still recovers and writes a clean array.
    dismissAnnouncement("a1");
    expect(isAnnouncementDismissed("a1")).toBe(true);
  });

  it("ignores non-string entries left in storage", () => {
    window.localStorage.setItem(KEY, JSON.stringify(["a1", 42, null]));

    expect(isAnnouncementDismissed("a1")).toBe(true);
    expect(isAnnouncementDismissed("42")).toBe(false);
  });
});
