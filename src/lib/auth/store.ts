import { create } from "zustand";
import type { User as Profile } from "@/types";

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isLoading: true,
  isInitialized: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () => set({ profile: null, isLoading: false, isInitialized: true }),
}));
