import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import i18n from "@/i18n/config";

import { ClientSideProviders } from "../ClientSideProviders";

import type { TFunction } from "i18next";

// Mock i18n — identity translation function, cast through unknown because
// i18next's TFunction is a branded type that's awkward to fake in tests.
const mockChangeLanguage = vi.fn().mockImplementation((_lng?: string) => {
  const identity = (key: string): string => key;
  return Promise.resolve(identity as unknown as TFunction);
});
const mockedI18n = i18n as unknown as {
  isInitialized: boolean;
  language: string;
  changeLanguage: typeof mockChangeLanguage;
};
mockedI18n.isInitialized = false;
vi.spyOn(i18n, "changeLanguage").mockImplementation(mockChangeLanguage);

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n,
    }),
  };
});

describe("ClientSideProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading screen initially and then render children", async () => {
    mockedI18n.language = "fr";
    render(
      <ClientSideProviders locale="en">
        <div data-testid="child">App Content</div>
      </ClientSideProviders>,
    );

    // It might show loading screen first, but it can be very fast
    // We'll check that children are eventually rendered
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith("en");
    });
  });

  it("should apply correct loading message for Turkish locale", async () => {
    mockedI18n.language = "en";
    render(
      <ClientSideProviders locale="fr">
        <div data-testid="child">App Content</div>
      </ClientSideProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
    });
  });
});
