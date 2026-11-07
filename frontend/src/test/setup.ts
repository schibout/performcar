import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";

import { server } from "./msw/server";

// Node 22+ ships a partial localStorage implementation that shadows the one
// jsdom provides. Tests exercise the full Web Storage API (clear, key,
// length), so we install an in-memory polyfill that satisfies the contract
// without racing with Node's built-in.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});
Object.defineProperty(window, "sessionStorage", {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock;

// jsdom does not implement object URLs; the file-upload components create one to
// preview a picked file locally before the deferred upload (REVIEW §3.12).
URL.createObjectURL = vi.fn(() => "blob:mock");
URL.revokeObjectURL = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: (ns: string | string[]) => {
    const namespace = Array.isArray(ns) ? ns[0] : ns;
    return {
      t: (key: string) => (namespace ? `${namespace}:${key}` : key),
      i18n: {
        changeLanguage: () => Promise.resolve(),
        language: "en",
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));
// Branding, the maintenance gate, and the registration toggle read the public
// settings via usePublicSettings on (almost) every page. Mock it globally with
// a static, healthy config so component trees don't each spin up a real React
// Query fetch — that added async work to dozens of component specs (slowing the
// suite) and surfaced an error toast that polluted the DOM. Specs that assert on
// settings override this per file. Other exports (admin list/update hooks) stay
// real via importOriginal.
vi.mock("@/hooks/api/use-system-settings", () => ({
  systemSettingsKeys: {
    all: ["systemSettings"],
    list: ["systemSettings", "list"],
    public: ["systemSettings", "public"],
  },
  usePublicSettings: () => ({
    data: {
      data: {
        maintenance_mode: false,
        registration_enabled: true,
        support_enabled: true,
        site_name: "Test App",
        logo_url: "",
        support_email: "support@test.com",
        default_locale: "en",
      },
    },
    isLoading: false,
  }),
  useSystemSettings: () => ({ data: undefined, isLoading: false }),
  useUpdateSystemSetting: () => ({
    mutate: () => undefined,
    mutateAsync: () => Promise.resolve(undefined),
    isPending: false,
  }),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(
    (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  ),
});

// Mock IntersectionObserver — jsdom lacks it, and motion's whileInView/useInView
// (scroll-triggered animations on the home page) require it at mount time.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: readonly number[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = (): IntersectionObserverEntry[] => [];
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Establish API mocking before all tests.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(async () => {
  server.resetHandlers();
  cleanup();
  // React 19's scheduler chunks work across chained setImmediate callbacks
  // (each round can queue the next). A single round only drains callbacks
  // queued *before* it, so scheduler continuations from the unmount above
  // could fire after vitest tears the jsdom window down and crash with
  // "window is not defined". Drain several rounds to exhaust the chain.
  for (let round = 0; round < 5; round++) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
});

// Clean up after the tests are finished.
afterAll(() => {
  server.close();
});
