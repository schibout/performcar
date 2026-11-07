import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User as UserType } from "@/lib/types/user";

export type User = UserType | null;

interface AuthState {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionInitialized: boolean;

  // actions
  setUser: (user: User) => void;
  login: (user: NonNullable<User>) => void;
  logout: () => void;
  setSessionInitialized: (val: boolean) => void;
}

interface StoredAuth {
  state?: {
    isAuthenticated?: boolean;
  };
}

// Only the isAuthenticated flag is persisted so the UI can decide
// synchronously whether to render a protected shell or a login screen on
// first paint. The actual user object is always re-fetched from /me by
// AuthHydrator — never read profile fields out of localStorage.
const getStoredAuthFlag = (): { isAuthenticated: boolean } => {
  if (typeof window === "undefined") return { isAuthenticated: false };
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return { isAuthenticated: false };
    const parsed = JSON.parse(raw) as unknown as StoredAuth;
    return { isAuthenticated: Boolean(parsed.state?.isAuthenticated) };
  } catch {
    return { isAuthenticated: false };
  }
};

const initialFlag = getStoredAuthFlag();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: initialFlag.isAuthenticated,
      isLoading: false,
      isSessionInitialized: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSessionInitialized: (val) => set({ isSessionInitialized: val }),

      login: (user) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isSessionInitialized: true,
        });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, isLoading: false, isSessionInitialized: true });
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-storage");
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (s) => ({ isAuthenticated: s.isAuthenticated }),
    },
  ),
);
