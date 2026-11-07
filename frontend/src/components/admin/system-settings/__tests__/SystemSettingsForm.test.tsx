import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SystemSettingsForm } from "@/components/admin/system-settings/SystemSettingsForm";
import { Permission } from "@/lib/types/permissions";
import type { SettingRead } from "@/lib/types/system-settings";
import { useAuthStore } from "@/stores/auth.store";
import { createMockUser } from "@/test/msw/handlers";
import { renderWithProviders } from "@/test/test-utils";

const logo = {
  key: "logo_url",
  value: "https://cdn.test/logo.png",
  value_type: "string",
  category: "branding",
  description: "Logo",
} as SettingRead;

const renderForm = (canWrite = true) => {
  renderWithProviders(
    <SystemSettingsForm
      settings={[logo]}
      loading={false}
      draft={{}}
      onChange={vi.fn()}
      onLogoSave={vi.fn()}
      canWrite={canWrite}
      dirty={false}
      saving={false}
      onSave={vi.fn()}
    />,
  );
};

const RESTRICTED = "systemSettings:fields.logo_url.uploadRestricted";

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("SystemSettingsForm logo", () => {
  it("disables the picker and explains why without self.files:upload, keeping Remove", () => {
    useAuthStore.setState({ user: createMockUser({ permissions: [] }) });

    renderForm();

    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeEnabled();
    expect(screen.getByText(RESTRICTED)).toBeInTheDocument();
  });

  it("keeps the picker enabled with self.files:upload", () => {
    useAuthStore.setState({
      user: createMockUser({ permissions: [Permission.SelfFilesUpload] }),
    });

    renderForm();

    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeEnabled();
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument();
  });

  it("disables Remove too and shows no upload note without settings write", () => {
    useAuthStore.setState({ user: createMockUser({ permissions: [] }) });

    renderForm(false);

    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeDisabled();
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument();
  });
});
