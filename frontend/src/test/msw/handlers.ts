import { http, HttpResponse } from "msw";

import { SystemRole, type User } from "@/lib/types/user";

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "1",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  title: null,
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  ...overrides,
});

export const handlers = [
  // Users handlers
  http.get("*/api/v1/users", () => {
    return HttpResponse.json([
      createMockUser({ id: "1", first_name: "John", last_name: "Doe" }),
      createMockUser({ id: "2", first_name: "Jane", last_name: "Doe", email: "jane@example.com" }),
    ]);
  }),

  // Auth handlers
  http.get("*/api/v1/users/me", () => {
    return HttpResponse.json(createMockUser());
  }),

  // Public settings — useBranding / MaintenanceGate / register-toggle call this
  // on every page. Default to a healthy, non-maintenance config (registration
  // on) so component trees don't trip the unhandled-request error → error toast,
  // which would pollute the DOM. Specs needing other values override per test.
  http.get("*/api/v1/settings/public", () => {
    return HttpResponse.json({
      data: {
        maintenance_mode: false,
        registration_enabled: true,
        support_enabled: true,
        site_name: "Test App",
        logo_url: "",
        support_email: "support@test.com",
        default_locale: "en",
      },
    });
  }),

  http.post("*/api/v1/auth/login", () => {
    return HttpResponse.json(
      {
        token_type: "bearer",
        user: createMockUser(),
        message: "success.auth.login",
      },
      {
        headers: {
          "Set-Cookie": "access_token=fake-cookie-jwt; HttpOnly; Path=/; SameSite=Lax",
        },
      },
    );
  }),

  http.post("*/api/v1/auth/register", () => {
    return HttpResponse.json(
      {
        success: true,
        message: "success.auth.register",
      },
      { status: 201 },
    );
  }),

  http.post("*/api/v1/auth/logout", () => {
    return HttpResponse.json(
      {
        success: true,
        message: "success.auth.logout",
      },
      {
        headers: {
          "Set-Cookie": "access_token=; HttpOnly; Path=/; Max-Age=0",
        },
      },
    );
  }),

  http.post("*/api/v1/auth/refresh", () => {
    return HttpResponse.json(
      { message: "success.auth.refresh", success: true },
      {
        headers: {
          "Set-Cookie": "access_token=new-fake-cookie-jwt; HttpOnly; Path=/; SameSite=Lax",
        },
      },
    );
  }),

  http.delete("*/api/v1/users/me", () => {
    return HttpResponse.json(
      { success: true, message: "success.account.deactivated" },
      {
        headers: {
          "Set-Cookie": "access_token=; HttpOnly; Path=/; Max-Age=0",
        },
      },
    );
  }),

  http.post("*/api/v1/users/me/reactivate", () => {
    return HttpResponse.json({
      success: true,
      message: "success.account.reactivated",
    });
  }),
];
