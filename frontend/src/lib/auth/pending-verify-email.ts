// Per-tab storage for the email a user just registered or attempted to log in
// with while unverified. Lives in sessionStorage (not localStorage / URL) so
// the address never ends up in Referer headers, access logs, or analytics
// breadcrumbs, but still survives a hard refresh of the verify-email-notice
// page. Cleared on resend success and when the user backs out to login.

const KEY = "pendingVerifyEmail";

// Bumped on every set/clear so useSyncExternalStore subscribers see the
// change without us depending on the 'storage' event (which only fires
// cross-tab, not for same-tab writes).
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function setPendingVerifyEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, email);
  notify();
}

export function getPendingVerifyEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KEY);
}

export function clearPendingVerifyEmail(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
  notify();
}

// useSyncExternalStore subscribe — fires for in-tab updates via notify(), plus
// the cross-tab 'storage' event so a logout in another tab also propagates.
export function subscribePendingVerifyEmail(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent): void => {
    if (event.key === KEY) callback();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getServerPendingVerifyEmail(): null {
  return null;
}
