// Per-announcement dismissal, persisted in localStorage so a closed banner stays
// closed across reloads. Stores the set of dismissed announcement ids.

const KEY = "dismissedAnnouncements";

const read = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const isAnnouncementDismissed = (id: string): boolean => read().includes(id);

export const dismissAnnouncement = (id: string): void => {
  if (typeof window === "undefined") return;
  const ids = read();
  if (ids.includes(id)) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  } catch {
    // private mode / quota — dismissal just won't persist
  }
};
