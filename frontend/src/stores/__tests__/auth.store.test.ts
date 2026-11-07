import { describe, it, expect, beforeEach } from "vitest";

import { SystemRole } from "@/lib/types/user";

import { useAuthStore } from "../auth.store";

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionInitialized: false,
    });
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("should initialize with default values", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("should log in correctly", () => {
    const user = {
      id: "1",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      title: "Mr",
      role: SystemRole.USER,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deactivated_at: null,
      deletion_scheduled_at: null,
      suspended_at: null,
    } as const;

    useAuthStore.getState().login(user);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isSessionInitialized).toBe(true);
  });

  it("should log out correctly", () => {
    useAuthStore.setState({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        title: "Mr",
        role: SystemRole.USER,
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deactivated_at: null,
        deletion_scheduled_at: null,
        suspended_at: null,
      },
      isAuthenticated: true,
      isLoading: false,
      isSessionInitialized: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should set user correctly", () => {
    const user = {
      id: "2",
      email: "other@example.com",
      first_name: "Other",
      last_name: "User",
      title: "Mr",
      role: SystemRole.USER,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deactivated_at: null,
      deletion_scheduled_at: null,
      suspended_at: null,
    } as const;

    useAuthStore.getState().setUser(user);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });
});
