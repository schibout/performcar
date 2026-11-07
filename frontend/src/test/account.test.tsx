import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Zustand's persist middleware fails to resolve a Web Storage-like object
// inside the jsdom harness in zustand v5. This file only cares about in-memory
// state so the persist layer is stubbed to a no-op; tests that genuinely
// exercise persistence (e.g. auth.store.test) must not import this file.
vi.mock("zustand/middleware", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("zustand/middleware");
  return {
    ...actual,
    persist: (fn: unknown) => fn,
  };
});

import { AccountDeactivatedContent } from "@/app/[locale]/(protected)/account-deactivated/AccountDeactivatedContent";
import { DangerZone } from "@/components/profile/DangerZone";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { createWrapper } from "@/test/test-utils";

import { server } from "./msw/server";

// ---- Auth store helpers ------------------------------------------------------

const BASE_USER = {
  id: "u-1",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  title: null,
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
};

beforeEach(() => {
  useAuthStore.setState({
    user: BASE_USER,
    isAuthenticated: true,
    isSessionInitialized: true,
    isLoading: false,
  });
});

// ---- DangerZone --------------------------------------------------------------

describe("DangerZone (profile)", () => {
  it("renders the destructive CTA", () => {
    render(<DangerZone />, { wrapper: createWrapper() });
    expect(screen.getByRole("button", { name: /account:deactivate.cta/i })).toBeInTheDocument();
  });

  it("requires the acknowledge checkbox before submitting", async () => {
    render(<DangerZone />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /account:deactivate.cta/i }));

    const passwordInput = await screen.findByLabelText(/account:deactivate.dialog.passwordLabel/i);
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const confirm = screen.getByRole("button", {
      name: /account:deactivate.dialog.confirm/i,
    });
    // Checkbox not ticked → zod invalidates the form → button stays disabled.
    expect(confirm).toBeDisabled();
  });
});

// ---- AccountDeactivatedContent ----------------------------------------------

describe("AccountDeactivatedContent", () => {
  it("shows the remaining days based on deletion_scheduled_at", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    useAuthStore.setState({
      user: {
        ...BASE_USER,
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deletion_scheduled_at: future.toISOString(),
      },
    });

    render(<AccountDeactivatedContent />, { wrapper: createWrapper() });

    // Pluralised key stub prints the raw i18n key; it must reference the
    // account namespace and the days-remaining key so the UI wires up right.
    expect(screen.getByText(/account:deactivated.daysRemaining/i)).toBeInTheDocument();
  });

  it("calls reactivate and clears the deletion schedule on success", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 20);
    useAuthStore.setState({
      user: {
        ...BASE_USER,
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deletion_scheduled_at: future.toISOString(),
      },
    });

    const reactivateSpy = vi.fn();
    server.use(
      http.post("*/api/v1/users/me/reactivate", () => {
        reactivateSpy();
        return HttpResponse.json({ success: true, message: "success.account.reactivated" });
      }),
    );

    render(<AccountDeactivatedContent />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /account:deactivated.reactivate/i }));

    await waitFor(() => {
      expect(reactivateSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useAuthStore.getState().user?.deletion_scheduled_at).toBeNull();
    });
  });
});
