"use client";

import { useAccountEvents } from "@/hooks/use-account-events";

/**
 * Mounts the per-user account event socket inside server layouts.
 *
 * The protected layout is a server component and cannot call hooks; rendering
 * this empty client component there keeps the socket alive on every protected
 * page so live account events (permission changes, remote session revocation)
 * reach the user without a refresh.
 */
export function AccountEventsBridge() {
  useAccountEvents();
  return null;
}
