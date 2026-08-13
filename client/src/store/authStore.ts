import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CurrentUser } from "../types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  setSession: (accessToken: string, refreshToken: string, user: CurrentUser) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      hasRole: (role: string) => {
        const u = get().user;
        return !!u && (u.roles.includes(role) || u.roles.includes("Admin"));
      },
    }),
    { name: "erp-auth" }
  )
);
