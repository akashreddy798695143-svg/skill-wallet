import { create } from "zustand";
import type { SafeUser, ViewKey } from "@/lib/types";
import { api } from "@/lib/api-client";

/**
 * Global app store (Zustand):
 *  - auth state (current user)
 *  - current SPA view
 *  - theme
 */

interface AppState {
  user: SafeUser | null;
  loadingUser: boolean;
  view: ViewKey;
  theme: "light" | "dark";

  setUser: (u: SafeUser | null) => void;
  setView: (v: ViewKey) => void;
  setTheme: (t: "light" | "dark") => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  loadingUser: true,
  view: "landing",
  theme: "light",

  setUser: (u) =>
    set({ user: u, view: u ? "dashboard" : "landing", loadingUser: false }),

  setView: (v) => set({ view: v }),

  setTheme: (t) => {
    set({ theme: t });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
      try {
        localStorage.setItem("vbc-theme", t);
      } catch {
        /* ignore */
      }
    }
  },

  refreshUser: async () => {
    try {
      const u = await api.get<SafeUser>("/api/auth/me");
      set({ user: u, view: "dashboard", loadingUser: false });
    } catch {
      set({ user: null, view: "landing", loadingUser: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      /* ignore */
    }
    set({ user: null, view: "landing" });
  },
}));
